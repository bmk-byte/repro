#!/usr/bin/env node
/**
 * Migration drift detector.
 *
 * Compares this repository's local `supabase/migrations/*.sql` files
 * against the linked Supabase project's migration-history table
 * (`supabase_migrations.schema_migrations`) by shelling out to
 * `supabase migration list`, and reports (does not fix) any mismatch:
 *
 *   1. A migration exists locally but has never been applied remotely
 *      (LOCAL-ONLY). This is expected transiently between "a migration was
 *      merged" and "someone ran `supabase db push`" — it is reported as a
 *      WARNING, not a failure, so routine deploy lag doesn't page anyone.
 *
 *   2. A migration-history entry exists remotely with no matching local
 *      file (REMOTE-ONLY). This is the pattern this repository hit in
 *      practice (see docs/DATABASE_GOVERNANCE.md) — a schema change was
 *      applied directly (e.g. via the Supabase Studio SQL editor) and
 *      never captured as a migration file. This is reported as an ERROR
 *      and the script exits non-zero.
 *
 * This script NEVER executes SQL, NEVER runs `supabase db push`, and
 * NEVER runs `supabase migration repair`. It only reads
 * `supabase migration list` output and reports what it finds. Fixing
 * drift is always a deliberate, human-approved action — see
 * docs/DATABASE_GOVERNANCE.md for the runbook.
 *
 * Requires these environment variables (typically GitHub Actions secrets):
 *   SUPABASE_ACCESS_TOKEN   — a Supabase personal access token (see
 *                             https://supabase.com/dashboard/account/tokens)
 *   SUPABASE_PROJECT_REF    — the linked project's ref (e.g. zvaurxgtttrgyvjzoedc)
 *   SUPABASE_DB_PASSWORD    — the project's database password, used only to
 *                             link non-interactively; never logged.
 *
 * Usage: node scripts/check-migration-drift.mjs
 */

import { execFileSync } from 'node:child_process';
import { readdirSync } from 'node:fs';

const REQUIRED_ENV = ['SUPABASE_ACCESS_TOKEN', 'SUPABASE_PROJECT_REF', 'SUPABASE_DB_PASSWORD'];

function fail(message) {
  console.error(`\n❌ ${message}\n`);
  process.exit(1);
}

function warn(message) {
  console.warn(`\n⚠️  ${message}\n`);
}

for (const key of REQUIRED_ENV) {
  if (!process.env[key]) {
    fail(
      `Missing required environment variable ${key}. This check needs SUPABASE_ACCESS_TOKEN, ` +
      `SUPABASE_PROJECT_REF, and SUPABASE_DB_PASSWORD configured as repository secrets. ` +
      `See docs/DATABASE_GOVERNANCE.md for setup.`
    );
  }
}

const projectRef = process.env.SUPABASE_PROJECT_REF;

/**
 * `supabase migration list` prints a human-formatted table:
 *
 *         LOCAL      │     REMOTE     │     TIME (UTC)
 *   ─────────────────┼────────────────┼──────────────────────
 *     20250331094423 │ 20250331094423 │ 2025-03-31 09:44:23
 *                    │ 20250401055732 │ 2025-04-01 05:57:32
 *     20260908100000 │                │ 2026-09-08 10:00:00
 *
 * There is no stable machine-readable output for this specific command in
 * the CLI version this script was written against (v1.x). Parsing the
 * pretty table is therefore deliberate, not a fallback — verified against
 * real output from this project during the engagement that introduced
 * this script. If a future CLI version adds `--output json` support for
 * `migration list`, prefer switching to it and keep this parser only as a
 * fallback.
 */
function parseMigrationListOutput(output) {
  const rows = [];
  for (const line of output.split('\n')) {
    if (!line.includes('│')) continue; // '│' — skip non-table lines
    if (line.includes('─')) continue; // '───' separator row
    const cells = line.split('│').map(c => c.trim());
    if (cells.length < 2) continue;
    const [local, remote] = cells;
    if (local.toUpperCase() === 'LOCAL') continue; // header row
    if (!/^\d{14}$/.test(local) && !/^\d{14}$/.test(remote)) continue; // not a data row
    rows.push({ local: local || null, remote: remote || null });
  }
  return rows;
}

function getLocalMigrationVersions() {
  const dir = new URL('../supabase/migrations/', import.meta.url);
  return readdirSync(dir)
    .filter(f => f.endsWith('.sql'))
    .map(f => f.slice(0, 14))
    .filter(v => /^\d{14}$/.test(v));
}

function runMigrationList() {
  try {
    return execFileSync(
      'npx',
      ['supabase', 'migration', 'list', '--linked', '--project-ref', projectRef],
      {
        encoding: 'utf8',
        env: process.env,
        // supabase link (invoked implicitly) may prompt for a DB password
        // on stdin in some CLI versions; SUPABASE_DB_PASSWORD is read by
        // the CLI itself via env in newer versions. If this hangs in CI,
        // upgrade the CLI (see docs/DATABASE_GOVERNANCE.md) rather than
        // piping a password on the command line, which would leak it into
        // process listings/logs.
        input: '',
      }
    );
  } catch (err) {
    fail(
      `Failed to run "supabase migration list": ${err.message}\n` +
      `This usually means the project isn't linked, the access token is invalid/expired, ` +
      `or the CLI version doesn't support these flags. See docs/DATABASE_GOVERNANCE.md.`
    );
  }
}

const localVersionsOnDisk = getLocalMigrationVersions();
const output = runMigrationList();
const rows = parseMigrationListOutput(output);

if (rows.length === 0) {
  fail(
    'Could not parse any migration rows from "supabase migration list" output. ' +
    'The CLI output format may have changed — update parseMigrationListOutput() ' +
    'in scripts/check-migration-drift.mjs. Raw output follows:\n\n' + output
  );
}

const localOnly = rows.filter(r => r.local && !r.remote);
const remoteOnly = rows.filter(r => r.remote && !r.local);

console.log(`Checked ${rows.length} migration-history rows against ${localVersionsOnDisk.length} local migration files.`);

if (localOnly.length > 0) {
  warn(
    `${localOnly.length} migration(s) exist locally but have not been applied to the linked project:\n` +
    localOnly.map(r => `  - ${r.local}`).join('\n') +
    `\n\nThis is expected if these were merged recently and not yet deployed. ` +
    `Run "supabase db push" (with review — see docs/DATABASE_GOVERNANCE.md) to apply them, ` +
    `or confirm a deploy is already in progress.`
  );
}

if (remoteOnly.length > 0) {
  fail(
    `DRIFT DETECTED: ${remoteOnly.length} migration-history entr${remoteOnly.length === 1 ? 'y exists' : 'ies exist'} ` +
    `on the linked project with no matching file in supabase/migrations/:\n` +
    remoteOnly.map(r => `  - ${r.remote}`).join('\n') +
    `\n\nThis means a schema change reached production without going through this repository's ` +
    `migration history — most likely a direct edit via the Supabase Studio SQL editor. ` +
    `\n\nDO NOT run "supabase migration repair" automatically to silence this. Follow the drift ` +
    `runbook in docs/DATABASE_GOVERNANCE.md: identify what actually changed, write a migration ` +
    `file that documents it (even retroactively), get it reviewed, and only then mark history as ` +
    `reconciled with an explicit, human-run "supabase migration repair --status applied <version>".`
  );
}

console.log('\n✅ No untracked remote migrations found. Local-only (pending) migrations, if any, are listed above as warnings only.\n');
