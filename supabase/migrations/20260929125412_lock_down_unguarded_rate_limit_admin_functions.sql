/*
  # Close two real gaps found via Supabase's security advisor

  ## 1. clear_rate_limit / peek_rate_limit were callable by any signed-in user
  Both functions are plain `SECURITY DEFINER` wrappers with NO internal
  caller-authorization check (unlike admin_set_admin/admin_set_moderator,
  which correctly check `profiles.is_admin` before doing anything):

    clear_rate_limit(p_key text) -> delete from rate_limits where key = p_key
    peek_rate_limit(p_key text)  -> returns the current count for p_key

  `20260908100000_lock_down_security_definer_function_grants.sql` granted
  EXECUTE on both to `authenticated` (intended for "a future login-lockout
  flow" per supabase/SECURITY_NOTES.md — never actually built; confirmed via
  a full-repo search that nothing in src/ or supabase/functions/ calls
  either one today). Since Postgres RPC functions are reachable by ANY
  client holding a valid `authenticated` JWT — not just from within this
  app's own frontend — any signed-up user could call
  `supabase.rpc('clear_rate_limit', { p_key: 'login:someone@example.com' })`
  directly and repeatedly clear another account's login/signup/password-reset
  rate limit, fully defeating brute-force protection for a chosen target.
  `peek_rate_limit` similarly let any signed-in user probe another key's
  current attempt count.

  Fix: drop the `authenticated` grant, keep `service_role` only. If a real
  login-lockout admin feature is built later, it should go through a
  function with its own internal admin check (mirroring admin_set_admin)
  or a service-role-backed Edge Function, not raw client-side RPC access.

  ## 2. handle_new_auth_user() still had the default PUBLIC execute grant
  This is the `auth.users` insert trigger that creates the matching
  `profiles` row. It's a trigger function (`RETURNS trigger`, reads `NEW`),
  not meant to be invoked directly — but no migration had ever revoked the
  default PUBLIC grant Postgres attaches on CREATE FUNCTION, so `anon` and
  `authenticated` could reach it via `/rest/v1/rpc/handle_new_auth_user`.
  Calling it outside a real trigger context has no `NEW` record bound and
  would simply fail, but there's no reason to leave it reachable at all.

  Fix: revoke PUBLIC execute, matching the pattern
  20260908100000_lock_down_security_definer_function_grants.sql already
  established for the other 13 functions it covered (this one was missed).
*/

REVOKE ALL ON FUNCTION public.clear_rate_limit(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.clear_rate_limit(text) TO service_role;

REVOKE ALL ON FUNCTION public.peek_rate_limit(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.peek_rate_limit(text) TO service_role;

REVOKE ALL ON FUNCTION public.handle_new_auth_user() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_auth_user() TO postgres, service_role;
