# Monitoring & Observability

## Sentry

Error reporting is [`src/lib/errorReporting.ts`](../src/lib/errorReporting.ts) — a thin wrapper around `@sentry/react`, fully no-op unless `VITE_SENTRY_DSN` is set, so local development and any deployment without a DSN configured are unaffected.

### Event categories

`reportError(error, { category, ...context })` accepts an optional `category`, sent as a Sentry **tag** (not buried in free-text or `extra` data) so issues can be filtered in the Sentry UI without parsing messages:

| Category | Used for |
|---|---|
| `SECURITY` | Failures in permission/role resolution (`useModeratorStatus.ts`) — anything where "did this fail open or closed" matters |
| `RELIABILITY` | Timeouts, storage/signed-URL failures, edge-function call failures |
| `PERFORMANCE` | Reserved for future use — not yet wired to a specific call site |
| `DATA` | Supabase query failures in data-fetching code (`src/lib/data/`, bulk upload row failures, list/lookup fetches) |
| `AUTHENTICATION` | Auth-flow failures (`useModeratorStatus.ts`'s initial user fetch) |
| `DEPLOYMENT` | Reserved for future CI/CD-triggered reporting — not yet wired to a specific call site |

Never pass raw request bodies, tokens, passwords, or full case/user records into `context` — only identifiers and operation names, matching the existing convention in every call site added during this work (e.g. `{ context: 'fetchCountries', category: 'DATA' }`, not `{ payload: rawRow }`).

### What's currently instrumented (as of this engagement)

- `useModeratorStatus.ts` — both the initial-user fetch and the moderator/admin status check now report to Sentry (`AUTHENTICATION`/`SECURITY`) in addition to their existing `console.error` and user-facing error state.
- `RapidResponseCasesPage.tsx` — the four previously-silent lookups (current user, team members, partner organizations, countries) and the main case-list fetch all report to Sentry (`DATA`) alongside a toast.
- `storage.ts` (`getFreshFileUrl`) — signed-URL failures report to Sentry (`RELIABILITY`) instead of silently falling back to a stale URL.
- `BulkCaseUpload.tsx` / `BulkRapidResponseUpload.tsx` — both per-row and whole-submission failures report to Sentry (`DATA`).
- `Auth.tsx` — a client-side auth-proxy timeout reports to Sentry (`RELIABILITY`).
- `email.ts` (`sendEmail`) — both a timeout and an invoke failure report to Sentry (`RELIABILITY`).
- Rate-limiter fail-open events and upstream (GoTrue) failures in the `auth-login`/`auth-signup` Edge Functions are logged with a greppable `RATE_LIMITER_FAIL_OPEN` marker via `console.error` (visible in Supabase Function Logs) **and** reported to Sentry via [`supabase/functions/_shared/sentry.ts`](../supabase/functions/_shared/sentry.ts), tagged `SECURITY`/`RELIABILITY`. This uses the Sentry Deno SDK (`npm:@sentry/deno`), lazily imported only when the `SENTRY_DSN` function secret is set — so it's a no-op (and requires no network access to resolve the package) until that secret is configured. **Unverified in this environment**: no Deno runtime was available to actually execute this against a real Sentry project. Before relying on it: set the secret (`supabase secrets set SENTRY_DSN=<dsn>` — the same DSN `VITE_SENTRY_DSN` uses is fine, Sentry DSNs are project-wide) and trigger one real failure to confirm an event arrives.

Also instrumented in a follow-up pass: `ProfileSettingsForm.tsx` (profile load failure — toast + `DATA`), `SubmitCaseForm.tsx`/`SubmitJudgmentForm.tsx` (moderator-notification-email failures — `RELIABILITY`, no toast since the submission itself already succeeded and there's nothing actionable for the submitter), `RapidResponseCaseForm.tsx` (deadline-parsing failures — `DATA`; moderator-notification failures, including the urgent-case path — `RELIABILITY`), `RapidResponseCaseDetails.tsx` (user-info fetch failure — `DATA`).

### What's intentionally not covered yet

Roughly 14 of the ~38 files with `catch` blocks identified during this engagement's audit were addressed across two passes — the highest-priority, most security-/business-critical ones (auth, profile, case/judgment submission, Rapid Response). The rest — mostly chart/analytics display components (`AfricaMap.tsx`, `GeographicIntelligence.tsx`, `HealthIndicatorIntegration.tsx`, `LegalFrameworkAnalysis.tsx`, `OutcomeMetricsDashboard.tsx`, `PerformanceMetrics.tsx`, `PerformanceTrackingModule.tsx`, `RapidResponseDashboard.tsx`, `RecentLegalUpdates.tsx`, `StakeholderAnalytics.tsx`, `TimelineVisualization.tsx`, `ResourcesPage.tsx`, `ReportGenerationSystem.tsx`, `SubmissionDetailsModal.tsx`) — still `console.log`/`console.error` on failure with no Sentry reporting and, in several cases, no user feedback. This was a deliberate scoping decision (read-only display failures are lower-priority than submission/auth/moderation workflows), not an oversight — treat this list as the concrete next-pass catalogue rather than assuming these are already fine.

## Automated checks (CI)

| Check | Where | Trigger | Blocking? |
|---|---|---|---|
| Type check (`tsc --noEmit`) | `.github/workflows/ci.yml` | push to `master`, PRs | Yes |
| Unit tests (`vitest run`) | `.github/workflows/ci.yml` | push to `master`, PRs | Yes |
| Build (`vite build`) | `.github/workflows/ci.yml` | push to `master`, PRs | Yes |
| Lint — changed lines only (`scripts/lint-diff.mjs`) | `.github/workflows/ci.yml` | push to `master`, PRs | **Yes**, for new errors on changed lines only — see "Lint pathway" below |
| Lint — full repo (`eslint .`) | `.github/workflows/ci.yml` | push to `master`, PRs | No — reports the pre-existing backlog without blocking |
| Migration drift detection | `.github/workflows/migration-drift-check.yml` | daily schedule + manual dispatch (gated behind `MIGRATION_DRIFT_CHECK_ENABLED` repo variable — see `docs/DATABASE_GOVERNANCE.md`) | Fails the job on REMOTE-only drift; warns (does not fail) on LOCAL-only |

Deliberately **not** added in this pass, to avoid the "do not create excessive CI jobs" principle turning into scope creep:

- A dependency-health/audit job (`npm audit` or similar) — worth adding once the lint backlog work below has a clear owner, so new CI red doesn't compete for attention with an existing one.
- Automated Edge Function tests in CI — the Deno test files added this engagement (`supabase/functions/_shared/*.test.ts`) exist and are ready to run, but wiring a Deno-based CI job was not done in this pass (this environment had no Deno runtime available to verify the job would actually pass first — see the implementation report). Adding `denoland/setup-deno` plus a `deno test supabase/functions/_shared/` step is the natural next step once verified locally.
- Automated pgTAP database tests in CI (`supabase/tests/database/rate_limiting.test.sql`) — same reasoning: this environment had no Docker available to verify `supabase test db` actually passes against these tests first.

## Lint pathway

**Current backlog** (measured during this engagement, `npx eslint . --format json`): **492 errors, 138 warnings across 152 files.** Dominated by three rules:

| Rule | Count | Notes |
|---|---|---|
| `@typescript-eslint/no-explicit-any` | 378 | The overwhelming majority — mostly `Record<string, any>` in data-shaping code and untyped Supabase query results |
| `react-hooks/exhaustive-deps` | 136 | Missing/incorrect `useEffect` dependency arrays |
| `@typescript-eslint/no-unused-vars` | 104 | |

**Why the full-repo scan is still non-blocking**: making the entire 492-error backlog blocking immediately would fail every existing PR regardless of what it actually changes, training people to work around CI rather than trust it.

**What's now implemented — the diff-scoped gate**: [`scripts/lint-diff.mjs`](../scripts/lint-diff.mjs), wired into `ci.yml` as "Lint changed lines (blocking)". It runs ESLint on every changed `.ts`/`.tsx` file, then filters the results down to only the messages whose line number falls inside a hunk this diff actually added or modified (parsed from `git diff -U0 <base>`), and fails the build only if any of those are `error`-severity. Pre-existing issues elsewhere in a touched file — the exact case a naive "just lint the changed files" approach gets wrong — do not fail the build. **Verified during this engagement**: a deliberately introduced `any`/unused-var pair was confirmed to fail the check, then confirmed to pass again once reverted; a real Windows path-separator bug (ESLint's absolute `filePath` uses backslashes, `git diff` output uses forward slashes) was caught and fixed in the process — worth knowing if this script is ever ported to run somewhere other than the GitHub Actions `ubuntu-latest` runner it's configured for today (Linux paths won't hit that bug, but any future Windows-based CI runner would need the same fix already in place, which it is).

New **warnings** (not just errors) on changed lines are reported by the script but do not fail the build — tightening that is a reasonable next step once the team is comfortable with the error-only gate, not done here to avoid over-tightening on day one.

**Path toward eventually making the full-repo scan blocking too**, now that new debt is contained:

1. **Pay down `no-unused-vars` first** (104 instances) — almost always a safe, mechanical, low-risk fix (`eslint --fix` handles many of these automatically) with no behavior change, unlike `no-explicit-any` which requires actually typing things correctly.
2. **Tackle `no-explicit-any` file-by-file, prioritized by churn** — `docs/SYSTEM_EVOLUTION.md` §20 already identifies `Auth.tsx` as the highest-churn file in this repository's git history; fixing types there first has the best ratio of effort to future benefit.
3. **`react-hooks/exhaustive-deps` needs care, not `eslint --fix`** — blindly adding missing dependencies can introduce infinite re-render loops or change fetch timing; each of the 136 needs a human decision.
4. Once the full-repo lint step is close enough to clean, remove `continue-on-error: true` from `ci.yml` entirely and delete the diff-scoped step (the full scan will have caught up to it).

Paying down the existing 492-error backlog itself was not attempted in this pass — that's a large, unrelated cleanup effort, not something to bundle into this engagement's diff. What *was* delivered is the mechanism that stops it from growing.
