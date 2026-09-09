# Caching / Query-Deduplication Assessment

## Question

Does this application now need a query caching/deduplication library (React Query, SWR, etc.)?

## Method

Before recommending anything, the actual repeated-query and remount patterns were checked directly in the codebase, not assumed from the general "this app has no cache" observation in the prior engineering review.

- **`countries` reference data**: fetched independently, via a near-identical `supabase.from('countries').select('id, name').order('name')` call, in at least 17 files (`RapidResponseCasesPage.tsx`, `BulkRapidResponseUpload.tsx`, `BulkCaseUpload.tsx`, `SubmitCaseForm.tsx`, `RapidResponseCaseForm.tsx`, `TimelineVisualization.tsx`, `StakeholderAnalytics.tsx`, `RecentLegalUpdates.tsx`, `HealthIndicatorIntegration.tsx`, `GeographicIntelligence.tsx`, `RapidResponseDashboard.tsx`, `ModerationPage.tsx`, `SubmitJudgmentForm.tsx`, `UploadLawModal.tsx`, `JudgmentsPage.tsx`, `CasesPage.tsx`). This data is public (not role- or user-scoped), changes essentially never (it's a list of countries), and is small (under 300 rows). This is the clearest, lowest-risk case for caching in the entire app.
- **Tab switching / remounts**: the app has no real routing for most views (see `docs/SYSTEM_EVOLUTION.md` §5) — switching tabs unmounts and remounts components, so every tab switch back to a page like Cases or Rapid Response re-runs its full data fetch, including the countries lookup, team-member list, and partner-organization list.
- **Rapid Response / analytics queries**: these are scoped to the viewer's organization/role and change more often (new cases arrive, statuses update) — caching these more aggressively risks showing a moderator stale case data, which is a worse failure mode than an extra network request.
- **Stale-data tolerance**: acceptable for reference/lookup data (countries, partner organizations) on the order of minutes; not acceptable for case lists, moderation queues, or anything a moderator is actively acting on.

## Conclusion

**A full caching/query-deduplication library (React Query, SWR) is not justified yet.** The repeated-fetch problem in this codebase is concentrated in a small number of near-static reference-data queries (`countries` being the dominant one), not in the role-sensitive, frequently-changing data (cases, judgments, moderation queues) where a library's invalidation machinery would actually earn its complexity. Introducing React Query now would mean:

- A new dependency and a new mental model for ~40 components that don't need it.
- Real risk of misconfiguring cache keys/staleness for role-sensitive data, given there is no existing convention in this codebase for scoping a cache key to "this organization" or "this role" — exactly the kind of mistake that could leak one user's cached view of restricted data into another user's screen if done carelessly.

## What was implemented instead

A small, targeted in-memory cache was added directly to [`src/lib/data/countries.ts`](../src/lib/data/countries.ts) — the module introduced in this engagement as the first piece of the shared data-access layer (see `docs/DATA_ACCESS_LAYER.md`):

- The resolved country list is cached in module state for 5 minutes.
- Concurrent calls to `fetchCountries()` while a fetch is already in flight share the same promise instead of firing duplicate requests (this specifically fixes the "several components mount around the same time and all fire the same query" case, e.g. opening a page that renders both a filter dropdown and a bulk-upload panel).
- Failed fetches are never cached — a failure always allows an immediate retry on the next call.
- A `fetchCountries({ forceRefresh: true })` escape hatch is available for any caller that needs a guaranteed-fresh read (none currently do, but it's there rather than needing a workaround later).
- This is public, non-role-sensitive, effectively-static data — a 5-minute cache cannot leak anything between users or roles, and cannot bypass RLS (RLS is still evaluated on the one real fetch each cache window makes; the cache only avoids repeating a query whose result is identical for everyone).

This directly reduces redundant fetches for a query that appears in 17 places, without introducing a new dependency or a caching convention that would need to be gotten right for role-sensitive data on day one.

## When to revisit

Reconsider a real caching library if any of the following becomes true:

- The shared data-access layer (`src/lib/data/`, see `docs/DATA_ACCESS_LAYER.md`) grows to cover most of the ~40 direct `supabase.from()` call sites, and several of them would benefit from the same stale-while-revalidate/background-refetch behavior that countries.ts now has hand-rolled — at that point, re-implementing this pattern module-by-module is more work and more error-prone than adopting a library once, consistently.
- A specific, measured performance problem shows up (e.g. an analytics dashboard's expensive aggregation query firing repeatedly on every tab switch) — measure it first (per the "do not claim a performance improvement without measuring it" principle), then decide whether a library or another hand-rolled cache like this one is the right fix for that specific query.
