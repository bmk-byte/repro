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
| Type check — baseline-gated (`scripts/typecheck-baseline.mjs`, real `tsc -b`) | `.github/workflows/ci.yml` | push to `master`, PRs | **Yes**, for any increase over the recorded baseline — see "Type-check pathway" below |
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

## Type-check pathway

**`npx tsc --noEmit` was a near no-op for the entire history of this CI workflow up to this discovery.** The root `tsconfig.json` declares no `include`/`files` of its own — it only lists TypeScript project references (`tsconfig.app.json` for `src/`, `tsconfig.node.json` for `vite.config.ts`). A bare `tsc` invocation ignores references entirely, so `npx tsc --noEmit` processed effectively one file and always exited 0 regardless of how many real type errors existed elsewhere. `package.json`'s `build` script (`tsc && vite build`) had the same problem — the `tsc` there was a no-op gate that never actually blocked a broken build. It has been removed from `build` accordingly (`vite build` alone was always the thing actually producing the deployable artifact).

The correct invocation for a project-references setup is build mode: **`tsc -b`**. Running it for real for the first time (`npm run typecheck`) surfaced **47 genuine, pre-existing type errors across 17 files**, none introduced by the engagement that discovered this — they were simply never being checked:

| File | Errors | Typical cause |
|---|---|---|
| `AnalyticsPage.tsx` | 9 | `Tab`/`TabPanel`-style components used with props (`value`, `connectionError`) their type signatures don't declare |
| `HealthIndicatorIntegration.tsx` | 6 | Untyped Supabase query results (`any`) assigned into strict local interfaces (`HealthIndicator`, `HealthData`) with mismatched shapes |
| `Auth.tsx` | 4 | Lucide icon components passed a `title` prop `LucideProps` doesn't declare |
| `StakeholderAnalytics.tsx` | 4 | Implicit-`any` callback parameters (`caseItem`), one unused destructured var |
| `ModerationPage.tsx` | 4 | Implicit-`any` callback parameters; one impossible string-literal comparison (`'approved'` vs `'rejected'`) worth a human look, not just a type annotation |
| `RecentLegalUpdates.tsx`, `RapidResponseCasesPage.tsx`, `RapidResponseDashboard.tsx` | 1 each | Untyped Supabase query results assigned into stricter local interfaces (missing/renamed fields) |
| `SubmitCaseForm.tsx`, `SubmitJudgmentForm.tsx`, `RapidResponseCaseForm.tsx` | 1–3 each | `react-hot-toast`'s `Toast` type doesn't declare `onClick`; one genuine out-of-scope reference (`CASE_CATEGORIES` used but not imported) in `SubmitCaseForm.tsx` |
| `CaseStageProgress.tsx`, `charts/RankedBarChart.tsx`, `CasesPage.tsx`, `OutcomeMetricsDashboard.tsx` | 1–2 each | Narrowing gaps on discriminated unions; a Recharts custom-renderer prop-type mismatch; an unused variable |

**Why this isn't a blocking full-repo `tsc -b` step outright**: same reasoning as the lint backlog above — making it blocking immediately would fail every PR regardless of what it changes. [`scripts/typecheck-baseline.mjs`](../scripts/typecheck-baseline.mjs) applies the equivalent of the lint diff-gate's intent through a simpler mechanism: it runs the real `tsc -b` from a clean build-info cache, counts total `error TS\d+:` diagnostics, and fails only if that count exceeds the recorded baseline (currently **47**, `BASELINE_ERROR_COUNT` in the script). A per-line diff gate like `lint-diff.mjs` wasn't used here because `tsc -b`'s project-reference build mode doesn't map cleanly onto "which line did this diff touch" the way a single-file ESLint run does — a total-count ratchet is the simpler, still-effective equivalent. A PR that fixes some of the 47 should lower `BASELINE_ERROR_COUNT` as part of that PR so the improvement is locked in and can't silently regress.

**What this means for prior verification claims made before this discovery**: any earlier claim in this project's history of "TypeScript: no errors found" or similar was based on the no-op `tsc --noEmit`/`tsc && vite build` invocations and did not reflect a real type-check. It does not mean those changes introduced type errors — the 47 found are pre-existing and unrelated to that work — but it does mean type-correctness was not actually being verified the way it appeared to be.

Paying down the 47-error backlog was not attempted in this pass, for the same reason the lint backlog wasn't: it touches 17 files across unrelated features, and bundling that into this engagement's diff would be scope creep. What was delivered is the mechanism that makes the check real and stops the count from growing.
