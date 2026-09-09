# Shared Data-Access Layer

## Why

An engineering review found roughly 40 components calling `supabase.from()` directly, with inconsistent error handling — some toast, some silently `console.log` and swallow the error, none share a common pattern. This is not being fixed with a single large rewrite (see the "no speculative architectural changes" / "no large-scale rewrites where incremental refactoring is possible" principles this work operates under). Instead, `src/lib/data/` is being built up incrementally, one domain at a time, starting from the highest-value, most-repeated query.

## What this layer is — and isn't

- **Is**: a thin wrapper around `supabase.from()`/`supabase.rpc()` calls that centralizes the query itself, gives it a consistent `{ data, error }` return shape, and reports failures to Sentry once, in one place, instead of once per call site.
- **Is not**: an authorization layer. Every function here runs exactly the same RLS-governed query a component would have run directly. Moving a query into `src/lib/data/` must never become an excuse to add a privilege check in JavaScript instead of Postgres — see [`src/lib/permissions.ts`](../src/lib/permissions.ts)'s own header comment for why that boundary matters, and keep it here too.

## Current state

| Module | Status | Covers |
|---|---|---|
| [`src/lib/data/countries.ts`](../src/lib/data/countries.ts) | Implemented | `fetchCountries()` (cached + deduped, see `docs/CACHING_ASSESSMENT.md`), `toCountryIdByName()`. Migrated call sites: `BulkCaseUpload.tsx`, `BulkRapidResponseUpload.tsx`, `RapidResponseCasesPage.tsx`, `CasesPage.tsx`. |
| [`src/lib/data/cases.ts`](../src/lib/data/cases.ts) | Implemented (partial — see below) | `fetchLitigationCases()` (filtered, searched, paginated case list) and `fetchCaseFilterOptions()` (distinct categories/partners). Migrated call site: `CasesPage.tsx`'s `fetchCases`/`fetchFilterOptions`. Deliberately **not** migrated: `CaseDetails.tsx`, `EditCaseModal.tsx`, `CaseFilter.tsx`, `CasesTable.tsx` — each has its own query shape and migrating all of them in one pass would be exactly the "large-scale rewrite" this layer is meant to avoid. They're the concrete next increment for this domain. |

## Domain catalogue (not yet migrated)

Cataloguing the repeated direct-`supabase.from()` patterns by domain, so the next increment of this work has a concrete starting point instead of re-discovering the same list. This is a plan, not a claim that these modules exist yet.

| Domain | Representative tables | Components with direct access today (non-exhaustive) | Priority for next migration |
|---|---|---|---|
| Cases | `cases`, `pending_cases` | `CaseDetails.tsx`, `EditCaseModal.tsx`, `CaseFilter.tsx`, `CasesTable.tsx` (`CasesPage.tsx`'s list/filter queries migrated — see above) | High — largest, most-used domain; the remaining components are the next concrete step |
| Rapid Response | `cases` (rapid-response subset), `rate_limits` (via RPC) | `RapidResponseCasesPage.tsx`, `RapidResponseCaseForm.tsx`, `RapidResponseCaseDetails.tsx`, `RapidResponseDashboard.tsx` | High — second-largest, and already partly touched by the countries migration |
| Judgments | `judgments`, `pending_judgments` | `JudgmentsPage.tsx`, `JudgmentDetails.tsx`, `forms/SubmitJudgmentForm.tsx` | Medium |
| Profiles / Users | `profiles` | `useModeratorStatus.ts`, `ProfileSettingsForm.tsx`, `AdminManagementPanel.tsx`, `ModeratorAdminPanel.tsx` | Medium — note `useModeratorStatus.ts` already documents *why* it's read-only; any extraction must preserve that, not just move the query |
| Organisations / Partners | `profiles.organization` distinct values, `case_summaries.partner` | `RapidResponseCasesPage.tsx` (`fetchPartnerOrganizations`) | Low–Medium |
| Analytics | `health_indicators`, `data_entries`, aggregation queries | `OutcomeMetricsDashboard.tsx`, `StakeholderAnalytics.tsx`, `PerformanceTrackingModule.tsx`, `HealthIndicatorIntegration.tsx` | Low — these are read-heavy and would benefit most from the caching pattern in `countries.ts`, but each has bespoke aggregation logic worth reviewing individually rather than batch-extracting |
| Laws / Resources | `law_documents`, resources tables | `LawsRepository.tsx`, `UploadLawModal.tsx`, `UploadResourceModal.tsx`, `ResourcesPage.tsx` | Low |
| Notifications | notification queue tables (via `process_notification_queue()`) | Server-side (pg_cron) only today — no direct client access found | N/A |

## Pattern to follow for the next module

Use `src/lib/data/countries.ts` as the template:

1. Export typed row interfaces (`Country`, etc.) so callers get type safety instead of `any`.
2. Export one function per query, returning `Promise<{ data: T | null; error: unknown }>` — never throw, so callers control their own UX.
3. Call `reportError(error, { context: '...', category: 'DATA' })` inside the module on every failure, so monitoring coverage doesn't depend on every call site remembering to add it.
4. Add a Vitest file mocking `../supabase` the same way `countries.test.ts` does — this is exactly the "make query behaviour easier to test" goal from the original brief, and it's cheap once the pattern exists.
5. Only add caching/dedup (like `countries.ts` has) for data that is public and slow-changing — see `docs/CACHING_ASSESSMENT.md` before adding it to anything role-sensitive or frequently-updated.
6. Migrate call sites one component at a time, confirming `npx tsc --noEmit` and the relevant tests still pass after each one — do not batch many components into one change.
