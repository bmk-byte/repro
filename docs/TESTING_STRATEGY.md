# Testing Strategy

## What runs today, and how

| Layer | Tool | Run with | CI? |
|---|---|---|---|
| Frontend unit tests | Vitest + Testing Library | `npm test` | Yes — blocking (`.github/workflows/ci.yml`) |
| Edge Function unit tests | Deno's built-in test runner | `deno test supabase/functions/_shared/` | Not yet — see below |
| Database function tests | pgTAP, via the Supabase CLI | `supabase start && supabase test db` | Not yet — see below |

## Frontend (Vitest)

Prioritized in this engagement, per the "security-sensitive and business-critical functionality first" brief:

- **`src/lib/permissions.ts`** ([`permissions.test.ts`](../src/lib/permissions.test.ts)) — role determination, moderator/admin permission boundaries, edge cases (isAdmin without isModerator, both flags true). Explicitly tests the UI-convenience layer's *own* consistency, not server-side enforcement — see the test file's header comment.
- **CSV bulk-upload validation** — the validation logic was extracted from `BulkCaseUpload.tsx`/`BulkRapidResponseUpload.tsx` into testable pure modules ([`src/lib/validation/bulkCaseUpload.ts`](../src/lib/validation/bulkCaseUpload.ts), [`bulkRapidResponseUpload.ts`](../src/lib/validation/bulkRapidResponseUpload.ts)) with no behavior change, then tested for valid rows, missing required fields, invalid enum values, unknown countries, invalid case categories, and default-value fallback behavior (priority level / stage).
- **`src/lib/data/countries.ts`** — the first shared data-access module, including its caching/dedup behavior (cache hit, concurrent-request dedup, failed fetches never cached).
- **`src/lib/data/cases.ts`** — the second shared data-access module (`fetchLitigationCases`, `fetchCaseFilterOptions`): filter application (status/type/country/category/partner), search-term sanitization reaching the query, pagination math (`range()` from page/pageSize), and error reporting.
- Pre-existing: `sanitize.test.ts`, `useModeratorStatus.test.ts` (a regression guard specifically for the moderator self-escalation vulnerability — see `docs/SYSTEM_EVOLUTION.md` SYS-004 — and fixed this engagement for a `vi.mock` hoisting bug that likely meant it never ran successfully in CI before).

Total: 72 assertions across these files as of this engagement (up from 15 at the start of it).

### Deliberately not covered yet

- Every other component with a `catch` block that isn't one of the ones prioritized in the reliability work (see the implementation report's file list).
- The Postgres RPC functions themselves as called *through* Supabase's client — covered instead at the database layer (below), which is the correct level to test SQL logic like window-reset arithmetic.
- Any Edge Function beyond the three shared helper modules (`_shared/rateLimit.ts`, `_shared/fetchWithTimeout.ts`, `_shared/sentry.ts`) — see below.

## Edge Functions (Deno)

`auth-login` and `auth-signup` had their rate-limit-check, upstream-timeout, and error-reporting logic extracted into three shared, dependency-free helper modules specifically so they could be unit tested without needing to invoke the full Edge Function (which would require mocking `Deno.serve`, a real or fake GoTrue endpoint, and a real or fake Postgres RPC):

- [`supabase/functions/_shared/rateLimit.ts`](../supabase/functions/_shared/rateLimit.ts) + [`.test.ts`](../supabase/functions/_shared/rateLimit.test.ts) — covers: normal allowed requests, requests exceeding limits (a `false` RPC result blocks), the limiter failing open on an RPC error *and* on a thrown exception, and the case where one check errors while another explicitly returns `false` (both signals must be honored).
- [`supabase/functions/_shared/fetchWithTimeout.ts`](../supabase/functions/_shared/fetchWithTimeout.ts) + [`.test.ts`](../supabase/functions/_shared/fetchWithTimeout.test.ts) — covers: a normal response resolving before the timeout, an aborted request surfacing as `UpstreamTimeoutError`, and a non-abort error propagating unchanged.
- [`supabase/functions/_shared/sentry.ts`](../supabase/functions/_shared/sentry.ts) + [`.test.ts`](../supabase/functions/_shared/sentry.test.ts) — covers only the "no `SENTRY_DSN` configured" no-op path (including with unusual error values: `null`, `undefined`, a string, a number). Deliberately does **not** test the DSN-configured path with a mocked dynamic import — see the test file's own comment for why a green mock test there would be worse than an honest gap: it could hide a real integration bug against the actual `@sentry/deno` package.

**These tests were written against Deno's documented `Deno.test`/`assert` API and reviewed for correctness, but this authoring environment had no Deno runtime available, so they have not actually been executed.** Run `deno test supabase/functions/_shared/` locally (with Deno installed) or add a CI job using `denoland/setup-deno` before treating this suite as a verified, passing gate — do not assume it passes just because it was written carefully.

Not covered: the full `auth-login`/`auth-signup` request handlers end-to-end (would need a mocked GoTrue and a mocked `createClient`), `auth-email-hook`, and `send-email`. These would need either `Deno.serve` invocation in-process with mocked `fetch`, or a local Supabase stack (`supabase functions serve`) plus an HTTP client — a reasonable next increment once the shared-helper pattern above is validated to actually run in this project's CI.

## Database functions (pgTAP)

[`supabase/tests/database/rate_limiting.test.sql`](../supabase/tests/database/rate_limiting.test.sql) exercises `check_rate_limit()`, `peek_rate_limit()`/`clear_rate_limit()`, and `purge_expired_rate_limits()` directly against a real Postgres instance — the only level at which the fixed-window reset arithmetic and the `INSERT ... ON CONFLICT` atomicity can actually be validated (an application-level mock can't tell you whether the SQL is correct). Covers: normal allowed requests, exceeding the limit, window-reset behavior, independent keys not interfering, `clear_rate_limit()`, and `purge_expired_rate_limits()` leaving recent rows untouched.

**Concurrent-request behavior is explicitly not covered** — pgTAP runs sequentially on one connection and cannot simulate two callers racing on the same key. The `INSERT ... ON CONFLICT DO UPDATE` pattern is designed to be atomic under Postgres's row-level locking, but that specific guarantee would need a real concurrent load test (e.g. multiple connections via `pgbench`, or an application-level integration test hitting the RPC from parallel requests) to actually verify — not claimed as verified here.

**This environment had no Docker available, so `supabase test db` was not run.** Run it locally (`supabase start && supabase test db`) before relying on this as a passing suite.

## Why this split (Vitest / Deno / pgTAP) instead of one framework

Each layer is tested with the tool that actually runs its runtime: Vitest for browser/Node application code (already the project's convention), Deno's test runner for Edge Functions (they run on Deno in production — testing them under Node would test different runtime behavior than what actually ships), and pgTAP for SQL functions (the only way to validate real Postgres semantics like window functions, `ON CONFLICT`, and RLS interaction without reimplementing Postgres's behavior in a mock).
