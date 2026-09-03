-- Login/signup happen before the caller has a session, so the client calls
-- check_rate_limit() as `anon`, not `authenticated`. Grant execute to `anon`
-- for that one function only (peek/clear stay authenticated+service_role
-- only — nothing pre-auth needs them).

grant execute on function public.check_rate_limit(text, int, int) to anon;
