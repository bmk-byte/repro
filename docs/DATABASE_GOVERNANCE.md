# Database Governance

> How schema changes are made, reviewed, and deployed for this project, and how we detect when that process has been bypassed.

## Why this document exists

An engineering review (see [`docs/SYSTEM_EVOLUTION.md`](SYSTEM_EVOLUTION.md), §13 and §19) found that production's database schema had been diverging from this repository's `supabase/migrations/` history for months: 16 migration-history entries existed in production with no matching file in this repo, interleaved with 9 local migration files that had never been formally deployed but were, in fact, already live — both patterns consistent with schema changes being made directly through the Supabase Studio SQL editor rather than through a migration file. That drift was reconciled (not reversed — every change found was already correct) during that engagement, but nothing in the process prevented it from recurring. This document, plus the automated check described below, is the fix for the process gap, not just the one-time cleanup.

## The rule

**Every permanent change to the production database schema must be a file in `supabase/migrations/`, committed to this repository, reviewed like any other code change, and applied via `supabase db push`.**

Direct edits through the Supabase Studio SQL editor against the **production** project must never be used for permanent schema changes (tables, columns, functions, triggers, RLS policies, grants, indexes, cron jobs). The Studio SQL editor is appropriate for:

- Read-only investigation (running `SELECT` queries to understand data or debug an issue).
- One-off, genuinely temporary data fixes that are not schema changes (and even then, prefer writing a data-migration file — see below — so there's a record).
- Working against your **local** Supabase instance (`supabase start`) while drafting a migration before it's committed.

It must never be used to `CREATE`, `ALTER`, or `DROP` anything in the production database as the final, permanent record of that change.

## Development workflow

1. Run `supabase start` locally (requires Docker) to get a local Postgres instance.
2. Make your schema change against the **local** database however is convenient — the Studio UI at `http://localhost:54323`, `psql`, or a client of your choice.
3. Once you're happy with it, capture it as a migration file:
   ```
   supabase db diff -f descriptive_migration_name
   ```
   or write the migration SQL by hand in `supabase/migrations/<timestamp>_descriptive_name.sql` if `db diff` doesn't cleanly capture what you did (common for data migrations, `SECURITY DEFINER` functions with specific grant requirements, or `pg_cron` scheduling).
4. Re-run `supabase db reset` locally to confirm the migration applies cleanly from scratch.
5. Follow the naming convention already established in this repo: recent migrations use a `YYYYMMDDHHMMSS_descriptive_snake_case_name.sql` timestamp prefix with a name that says what the migration does, not an auto-generated placeholder. Include a comment block at the top explaining **why**, not just what — this repository's best migrations (e.g. `20260903080000_add_admin_role.sql`, `20260908100000_lock_down_security_definer_function_grants.sql`) already do this well; match that standard.
6. Commit the migration file alongside the application code that depends on it, in the same PR where practical.

## Migration review

Because a migration can grant privileges, change RLS, or alter data irreversibly, migration files get the same scrutiny as any other security-sensitive code change:

- **What does this change grant, and to whom?** Any `GRANT`/`REVOKE`, any new `SECURITY DEFINER` function, any RLS policy change should be read by the reviewer specifically for over-broad access — the pattern this repo has hit before (`20260908100000` had to revoke default `PUBLIC` grants that earlier migrations left in place).
- **Is it idempotent / safe to re-run?** `CREATE TABLE IF NOT EXISTS`, `CREATE OR REPLACE FUNCTION`, `DROP TRIGGER IF EXISTS` before `CREATE TRIGGER` — these patterns mean a migration can be safely re-applied or re-verified without erroring. A bare `ALTER TABLE ... ADD COLUMN` (no `IF NOT EXISTS`) or a bare `CREATE TRIGGER` will error if run twice; that's fine for a first application but worth knowing before assuming it's safe to "just re-run it" if something goes wrong mid-deploy.
- **Does it touch a table with RLS?** Confirm the migration doesn't accidentally disable RLS or widen a policy beyond what's intended.
- **Does it need a corresponding grant lockdown?** New `SECURITY DEFINER` functions get the default Postgres `PUBLIC` execute grant unless explicitly revoked — this exact gap is what `20260908100000` had to fix retroactively for 13 functions. Revoke and re-grant explicitly in the same migration that creates the function.

## Production deployment

Deploying a migration to production is a deliberate, separate action from merging the PR:

```
supabase login                                  # once per machine, or set SUPABASE_ACCESS_TOKEN
supabase link --project-ref <project-ref>       # once per checkout
supabase migration list                         # confirm what's pending BEFORE pushing
supabase db push                                # apply pending migrations
```

Always run `supabase migration list` immediately before `supabase db push` and read its output. If it shows migration-history entries on the remote side with no local file (a "REMOTE-only" row), **stop** — that's drift, and pushing on top of it risks either an error (e.g. a bare `ALTER TABLE ADD COLUMN` failing because the column already exists) or, worse, silently succeeding while leaving the actual cause of the drift uninvestigated. See "What to do when drift is detected" below.

## Who approves production schema changes

- Any migration file follows the same code-review path as the rest of the codebase — it needs a reviewer before merging to `master`.
- Running `supabase db push` against production is a deploy action, not a merge action. It should be run deliberately by whoever owns the deploy for that change (today: the maintainer with Supabase project access — this repository is small enough that formal deploy-approval tooling would be premature, but the principle to preserve as the team grows is: the person running `db push` is not necessarily the same person who wrote the migration, and should have re-read `supabase migration list` output immediately beforehand).
- `supabase migration repair` (which edits migration **history bookkeeping** without running any SQL) must never be run to make a drift warning disappear without first understanding what caused it. It is appropriate only once a human has confirmed exactly what changed and why (see below).

## Automated drift detection

[`scripts/check-migration-drift.mjs`](../scripts/check-migration-drift.mjs), run by [`.github/workflows/migration-drift-check.yml`](../.github/workflows/migration-drift-check.yml), compares local migration files against the linked project's migration-history table:

- **Local-only** (a migration file exists here but has never been applied remotely) → reported as a **warning**. This is the expected, normal state between merging a migration and someone running `supabase db push` — it does not fail the check.
- **Remote-only** (a migration-history entry exists in production with no matching local file) → reported as an **error**, and the check exits non-zero. This is the drift pattern this repository actually hit.

This check is deliberately **detection-only**:

- It never runs `supabase db push`.
- It never runs `supabase migration repair`.
- It never executes any SQL against production.

It runs on a daily schedule and via manual `workflow_dispatch`, **not** on every push to `master` — gating every push on perfect local/remote sync would produce constant false alarms, since migrations are deployed as a separate, deliberate step from merging. See the workflow file's comments for the reasoning.

### Setup required before this check will run

The workflow is gated behind a repository variable so it doesn't fail immediately in a fresh checkout that hasn't configured Supabase access yet:

1. Add repository secrets (Settings → Secrets and variables → Actions → Secrets): `SUPABASE_ACCESS_TOKEN` (a personal access token from the Supabase dashboard, not the anon/service-role key), `SUPABASE_PROJECT_REF`, `SUPABASE_DB_PASSWORD`.
2. Add a repository variable (Settings → Secrets and variables → Actions → Variables): `MIGRATION_DRIFT_CHECK_ENABLED` = `true`.

Until both are done, the workflow exists but skips itself — it will not fail your CI. **This document does not set these up for you and does not know your production credentials; enabling this check is a deliberate action for whoever owns the Supabase project.**

## What to do when drift is detected

1. **Do not run `supabase migration repair` first.** Repair only edits bookkeeping — it doesn't tell you what actually changed or why, and marking an unexplained change as "applied" without understanding it defeats the entire point of migration history.
2. Identify the actual SQL that was applied. The Supabase dashboard's SQL editor history and the project's Postgres logs are the two most likely sources — the migration-history entry's timestamp narrows the search window.
3. Write a migration file that reproduces that change, even though it's retroactive. This restores the property that "the migrations directory is the source of truth for what the schema looks like."
4. Get that migration file reviewed like any other — specifically for the same over-broad-grant and RLS questions raised above, since a change made outside the normal process is exactly the kind of change that's more likely to have skipped that scrutiny the first time.
5. Only after the migration file is merged, run `supabase migration repair --status applied <version>` to align the bookkeeping — a human decision, made with full context, not an automated reaction to a warning.
6. If the direct change turns out to have been a mistake or is no longer wanted, write a follow-up migration that reverts it properly, rather than trying to erase the history of it having happened.

## When migration repair is appropriate

`supabase migration repair --status applied <version>` is appropriate only when a human has confirmed the named migration's effect is **already correctly and completely present** in the target database, and the only thing wrong is the bookkeeping record. This was the case for all 9 migrations reconciled during the engagement that produced this document — each was independently verified live (e.g. `SELECT EXISTS(... information_schema.columns ... column_name='is_admin')`) before being marked as applied. It is not appropriate as a way to silence a drift warning you haven't investigated.

## Related documents

- [`docs/SYSTEM_EVOLUTION.md`](SYSTEM_EVOLUTION.md) — the engineering history that identified this gap, including the specific migrations and production queries involved in the original reconciliation (§13, §19, SYS-019).
- [`SECURITY.md`](../SECURITY.md) — input sanitization and general security practices for application code (separate concern from database governance).
