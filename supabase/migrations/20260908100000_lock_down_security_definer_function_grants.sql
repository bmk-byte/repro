-- Supabase's database linter flagged 13 SECURITY DEFINER functions as
-- callable by `anon` and/or `authenticated` beyond what each function's own
-- internal checks assume. None of this project's migrations ever revoked
-- the default PUBLIC execute grant Postgres attaches on CREATE FUNCTION, so
-- roles inherited it via PUBLIC even where a migration's own comments say
-- the function should be authenticated/service_role/postgres-only (e.g.
-- clear_rate_limit, peek_rate_limit, purge_expired_rate_limits,
-- process_notification_queue, current_user_is_admin, list_admins,
-- admin_set_admin). This migration is the single source of truth for who
-- may call each of them: revoke everything, then grant back only the
-- roles each function is actually meant for.

-- Rate limiting (see 20260903071500_add_rate_limiting.sql,
-- 20260903120000_allow_anon_rate_limit_checks.sql)
REVOKE ALL ON FUNCTION public.check_rate_limit(text, int, int) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_rate_limit(text, int, int) TO anon, authenticated, service_role;

REVOKE ALL ON FUNCTION public.peek_rate_limit(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.peek_rate_limit(text) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.clear_rate_limit(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.clear_rate_limit(text) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.purge_expired_rate_limits() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.purge_expired_rate_limits() TO service_role;

-- Notification queue cron worker (see
-- 20260901120000_fix_function_permission_denied_errors.sql) — only the
-- `postgres`-owned cron job and service_role calls should reach this.
REVOKE ALL ON FUNCTION public.process_notification_queue() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.process_notification_queue() TO postgres, service_role;

-- Admin role management (see 20260903080000_add_admin_role.sql) — each of
-- these already raises an exception internally unless the caller's own
-- profile has is_admin = true, so `authenticated` is the correct ceiling.
REVOKE ALL ON FUNCTION public.current_user_is_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_user_is_admin() TO authenticated;

REVOKE ALL ON FUNCTION public.list_admins() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_admins() TO authenticated;

REVOKE ALL ON FUNCTION public.admin_set_admin(text, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_admin(text, boolean) TO authenticated;

-- Moderator role management (see
-- 20260903090000_restrict_moderator_management_to_admins.sql,
-- 20251126110807_fix_profiles_infinite_recursion.sql,
-- 20251204050602_organization_based_case_access_control.sql,
-- 20251121215132_fix_function_search_paths_v3.sql) — same pattern, and
-- already authenticated-only; pinning it explicitly so it can't drift back
-- to PUBLIC the way the functions above did.
REVOKE ALL ON FUNCTION public.current_user_is_moderator() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_user_is_moderator() TO authenticated;

REVOKE ALL ON FUNCTION public.is_moderator() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_moderator() TO authenticated;

REVOKE ALL ON FUNCTION public.is_afyanahaki_moderator() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_afyanahaki_moderator() TO authenticated;

REVOKE ALL ON FUNCTION public.list_moderators() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_moderators() TO authenticated;

REVOKE ALL ON FUNCTION public.admin_set_moderator(text, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_moderator(text, boolean) TO authenticated;
