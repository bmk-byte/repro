#!/usr/bin/env node
/**
 * Diff-scoped lint gate.
 *
 * Runs ESLint on every changed .ts/.tsx file, but only FAILS the build for
 * errors reported on lines that were actually added or modified in this
 * diff — not for pre-existing errors elsewhere in a file that happened to
 * be touched for an unrelated reason.
 *
 * Why this exists instead of just "lint the changed files": this
 * repository has a real, measured pre-existing lint backlog (492 errors /
 * 138 warnings as of the engagement that introduced this script — see
 * docs/MONITORING.md). Simply running `eslint <changed files>` would fail
 * on that backlog every time someone touches a file for any reason,
 * exactly the "makes lint blocking immediately break the pipeline"
 * outcome the project's own principles rule out. Filtering to only the
 * lines this diff actually changed lets new debt be blocked without
 * requiring old debt to be fixed first.
 *
 * New WARNINGS are reported but do not fail the build — only new ERRORS
 * do. Tightening that (failing on new warnings too) is a reasonable next
 * step once the team is comfortable with this gate; not done here to
 * avoid over-tightening on day one.
 *
 * Usage: node scripts/lint-diff.mjs <base-sha>
 */

import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// Resolve eslint's own bin script and invoke it directly with the current
// Node binary, rather than going through the `npx` shell shim — avoids
// needing `shell: true` (and the argument-escaping risk that comes with
// it) purely to resolve a Windows .cmd wrapper.
const eslintBin = fileURLToPath(new URL('../node_modules/eslint/bin/eslint.js', import.meta.url));

const baseSha = process.argv[2];
if (!baseSha) {
  console.error('Usage: node scripts/lint-diff.mjs <base-sha>');
  process.exit(1);
}

function sh(cmd, args) {
  return execFileSync(cmd, args, { encoding: 'utf8' });
}

function getChangedFiles() {
  const out = sh('git', ['diff', '--name-only', '--diff-filter=ACMR', baseSha, '--', '*.ts', '*.tsx']);
  return out.split('\n').map(l => l.trim()).filter(Boolean);
}

/**
 * Parses `git diff -U0 <base> -- <file>` hunk headers to find the set of
 * line numbers in the NEW version of the file that were added or modified.
 * Hunk header format: @@ -oldStart,oldLines +newStart,newLines @@
 */
function getChangedLineNumbers(file) {
  const diff = sh('git', ['diff', '-U0', baseSha, '--', file]);
  const changed = new Set();
  const hunkHeader = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/;
  for (const line of diff.split('\n')) {
    const match = hunkHeader.exec(line);
    if (!match) continue;
    const start = parseInt(match[1], 10);
    const count = match[2] !== undefined ? parseInt(match[2], 10) : 1;
    for (let i = 0; i < count; i++) changed.add(start + i);
  }
  return changed;
}

function runEslintJson(files) {
  try {
    const out = execFileSync(process.execPath, [eslintBin, '--format', 'json', ...files], { encoding: 'utf8' });
    return JSON.parse(out);
  } catch (err) {
    // ESLint exits non-zero when it finds errors; stdout still has the JSON.
    if (err.stdout) {
      try {
        return JSON.parse(err.stdout);
      } catch {
        console.error('Failed to parse ESLint output:', err.stdout);
        process.exit(1);
      }
    }
    console.error('Failed to run ESLint:', err.message);
    process.exit(1);
  }
}

const changedFiles = getChangedFiles();
if (changedFiles.length === 0) {
  console.log('No changed .ts/.tsx files to lint.');
  process.exit(0);
}

console.log(`Checking ${changedFiles.length} changed file(s) for NEW lint errors on changed lines...`);

const results = runEslintJson(changedFiles);
let newErrorCount = 0;
let newWarningCount = 0;

for (const fileResult of results) {
  // ESLint's filePath is absolute and OS-native (backslashes on Windows);
  // git diff's paths are always forward-slash. Normalize before matching —
  // without this, the match silently fails on Windows and every file gets
  // skipped as "not found," which defeats the entire check without ever
  // reporting an error.
  const normalizedFilePath = fileResult.filePath.replace(/\\/g, '/');
  const relativePath = changedFiles.find(f => normalizedFilePath.endsWith(f));
  if (!relativePath) continue; // e.g. a file ESLint's own config ignores

  const changedLines = getChangedLineNumbers(relativePath);
  const relevant = fileResult.messages.filter(m => changedLines.has(m.line));

  for (const msg of relevant) {
    const label = msg.severity === 2 ? 'ERROR' : 'warning';
    console.log(`${relativePath}:${msg.line}:${msg.column} ${label} ${msg.message} (${msg.ruleId ?? 'unknown-rule'})`);
    if (msg.severity === 2) newErrorCount++;
    else newWarningCount++;
  }
}

console.log(`\n${newErrorCount} new error(s), ${newWarningCount} new warning(s) on changed lines.`);

if (newErrorCount > 0) {
  console.error(
    '\n❌ This diff introduces new lint errors on lines it changed. Fix these before merging — ' +
    'pre-existing issues elsewhere in the same file are not blocking (see docs/MONITORING.md).'
  );
  process.exit(1);
}

console.log('\n✅ No new lint errors on changed lines.');
