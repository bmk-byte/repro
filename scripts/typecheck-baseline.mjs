#!/usr/bin/env node
/**
 * Baseline-gated real type check.
 *
 * `npx tsc --noEmit` was discovered to be a near no-op in this repo: the
 * root tsconfig.json declares no `include`/`files` of its own and instead
 * uses TypeScript project references (`tsconfig.app.json` for `src`,
 * `tsconfig.node.json` for `vite.config.ts`). A bare `tsc` invocation
 * ignores references entirely and processes almost nothing, so it "passes"
 * regardless of how many real type errors exist. The correct invocation for
 * a references-based project is build mode: `tsc -b`.
 *
 * Running the real check for the first time surfaced 47 genuine,
 * pre-existing type errors across 17 files this engagement never touched
 * (see docs/MONITORING.md "Type-check pathway"). Making `tsc -b` blocking
 * outright would fail CI/the build immediately on that backlog, the same
 * "makes checking blocking immediately breaks the pipeline" outcome
 * scripts/lint-diff.mjs was built to avoid for lint. This script applies
 * the same idea to type errors via a simpler mechanism (a total-count
 * baseline, not per-line diffing — tsc's project-reference build mode
 * doesn't map cleanly onto "which line did this diff touch" the way a
 * single-file ESLint run does): fail only if the total error count goes
 * UP from the recorded baseline. A pull request that fixes some of the
 * backlog should lower the baseline in this file as part of that PR.
 *
 * Usage: node scripts/typecheck-baseline.mjs
 */

import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { unlinkSync } from 'node:fs';

// Ratchet this DOWN as pre-existing errors get fixed; never raise it to
// paper over a newly introduced error.
const BASELINE_ERROR_COUNT = 47;

const tscBin = fileURLToPath(new URL('../node_modules/typescript/bin/tsc', import.meta.url));

// Force a from-scratch build so a stale local .tsbuildinfo can't hide
// errors behind incremental-build caching.
for (const f of ['tsconfig.app.tsbuildinfo', 'tsconfig.node.tsbuildinfo']) {
  try {
    unlinkSync(fileURLToPath(new URL(`../${f}`, import.meta.url)));
  } catch {
    // Fine if it didn't exist.
  }
}

let output = '';
try {
  output = execFileSync(process.execPath, [tscBin, '-b', '--force'], { encoding: 'utf8' });
} catch (err) {
  // tsc exits non-zero when it finds errors; stdout still has the diagnostics.
  output = err.stdout ?? '';
}

const errorLines = output.split('\n').filter(line => /error TS\d+:/.test(line));
const errorCount = errorLines.length;

console.log(output.trim());
console.log(`\n${errorCount} type error(s) found (baseline: ${BASELINE_ERROR_COUNT}).`);

if (errorCount > BASELINE_ERROR_COUNT) {
  console.error(
    `\n❌ Type errors increased from the recorded baseline of ${BASELINE_ERROR_COUNT} to ${errorCount}. ` +
    'Fix the new error(s) introduced by this change before merging — see the diagnostics above.'
  );
  process.exit(1);
}

if (errorCount < BASELINE_ERROR_COUNT) {
  console.log(
    `\n✅ Type errors decreased (${BASELINE_ERROR_COUNT} → ${errorCount}). ` +
    'Please lower BASELINE_ERROR_COUNT in scripts/typecheck-baseline.mjs in this PR to lock in the improvement.'
  );
} else {
  console.log('\n✅ No new type errors beyond the recorded baseline.');
}
