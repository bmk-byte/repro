# Security conventions

This app is a Vite/React SPA — there is no server process or middleware layer
of our own between the browser and Supabase. The conventions below exist so
future changes don't quietly contradict them.

## Enforcement layer: RLS, not the client

Every write goes straight from the browser through `supabase-js`, gated by
Postgres Row Level Security. Client-side checks (`useModeratorStatus()`,
`can()` in `src/lib/permissions.ts`, `if (!isModerator) ...` in page
components) are **UI convenience only** — they decide what renders, not what's
allowed. A bug in any of them can show/hide the wrong button; it cannot grant
real access, because RLS re-checks every read/write server-side regardless of
what the client believes. See
`supabase/migrations/20251204050602_organization_based_case_access_control.sql`
for the canonical example of how case access is actually scoped.

`profiles.is_moderator` itself is protected the same way: a trigger
(`20260824113626_lock_is_moderator_column.sql`) rejects any client write to
that column, deriving it server-side from an email allow-list on insert and
from the `admin_set_moderator` RPC (`20260824114500_moderator_admin_rpc.sql`)
thereafter — both audit-logged.

## Admin role (superset of moderator)

`profiles.is_admin` (`20260903080000_add_admin_role.sql`) is a full-access
role for IT staff, protected/granted the same way as `is_moderator` (trigger
allow-list on insert + `admin_set_admin` RPC thereafter, audit-logged).
**Admin is implemented as a superset of moderator by redefinition, not by
touching every policy/check individually**:
- `current_user_is_moderator()`'s body is `is_moderator OR is_admin` — every
  RLS policy on the 12 tables that reference it (see that migration's header
  comment) automatically admits admins too.
- `useModeratorStatus()`'s returned `isModerator` is likewise `is_moderator
  || is_admin` client-side, so every existing `if (!isModerator)` UI gate
  admits admins without being individually updated.
- `current_user_is_admin()` (DB) / `isAdmin` (client, same hook) stay
  available wherever something must be admin-exclusive, e.g. the
  `admin_set_admin`/`list_admins` RPCs themselves and
  `AdminManagementPanel.tsx`.
If you add a new privileged check, prefer branching on `isModerator`/
`current_user_is_moderator()` (admits both roles) unless the thing you're
gating is genuinely admin-only.

## Rate limiting

`public.rate_limits` + `check_rate_limit()` / `peek_rate_limit()` /
`clear_rate_limit()` (`20260903071500_add_rate_limiting.sql`) is a generic,
atomic, DB-backed fixed-window limiter — one `INSERT ... ON CONFLICT` upsert,
no read-then-write race. Currently used by the `send-email` edge function
(20 sends/hour/user). `peek`/`clear` exist for a future login-lockout flow but
aren't wired to anything yet. `purge_expired_rate_limits()` runs every 5
minutes via `pg_cron`. Callers should fail OPEN if the RPC itself errors —
availability of the underlying feature matters more than perfect limiting.

## File uploads

Every upload form validates MIME type and size client-side via react-dropzone
(`accept`/`maxSize`), listed per-bucket in
`20260903070614_add_storage_bucket_upload_limits.sql`, which sets the same
limits at the Storage bucket level — client checks are UX only and can be
bypassed by calling the Storage API directly, so the bucket config is what
actually blocks an oversized/wrong-type file.

## Known drift

Several edge functions exist in this project (`send-case-email`,
`send-submission-email`, `send-password-recovery`,
`send-moderator-notifications`, `rapid-response-alerts`) that aren't in this
repo's `supabase/functions/` directory and aren't invoked by any current
frontend code — likely leftovers from an earlier notification architecture,
superseded by the single `send-email` function + direct frontend calls. They
haven't been audited or removed as part of this pass; confirm whether they're
still needed before relying on or deleting them.
