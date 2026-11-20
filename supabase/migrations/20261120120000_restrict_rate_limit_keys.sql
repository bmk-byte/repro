/*
  # Stop clients from tampering with other people's rate-limit counters

  1. Problem
    - check_rate_limit(p_key, ...) is SECURITY DEFINER and callable by anon
      and authenticated (the password-reset form calls it before sign-in).
      It accepted ANY key, so anyone, without signing in, could call it with
      'login:<victim email>' repeatedly and push that counter over the limit
      the auth-login Edge Function enforces, locking the victim (including
      admins) out of sign-in. The same worked for 'signup:', the IP keys,
      and other users' export/upload/email keys.
    - clear_rate_limit(p_key) and peek_rate_limit(p_key) were granted to
      authenticated (20260908100000_lock_down_security_definer_function_grants.sql)
      but nothing in the app calls them. Since sign-up is open, any account
      could call clear_rate_limit('login:<victim email>') between password
      guesses, defeating the brute-force limit entirely.

  2. Changes
    - check_rate_limit now only accepts, from client roles (anon,
      authenticated), the keys the app legitimately sends from the browser:
        pwreset:<email>                        (anyone; password reset form)
        send-email:<own user id>               (send-email Edge Function, user token)
        report-export:<own user id>            (ReportGenerationSystem)
        bulk-case-upload:<own user id>         (BulkCaseUpload)
        bulk-rapid-response-upload:<own user id> (BulkRapidResponseUpload)
      Any other key from a client role raises an error. The service role
      (Edge Functions' admin client: login:, login-ip:, signup:, signup-ip:,
      delete-account:) and direct database sessions are unrestricted.
      Every client caller already fails OPEN on an RPC error, so a rejected
      key never blocks a legitimate user; it just isn't counted.
    - clear_rate_limit and peek_rate_limit: service_role only.

  3. Remaining, accepted risk
    - pwreset:<email> is still client-callable by design (the reset form runs
      before sign-in), so someone could exhaust a victim's password-reset
      allowance (3 per 15 minutes). Moving password reset behind an Edge
      Function would close that; sign-in itself is no longer affected.

  4. Rollback
    - Re-run check_rate_limit from 20260903071500_add_rate_limiting.sql and
      the GRANTs from 20260908100000_lock_down_security_definer_function_grants.sql.
*/

create or replace function public.check_rate_limit(p_key text, p_max_count int, p_window_seconds int)
returns boolean
language plpgsql
security definer
set search_path = 'pg_catalog', 'public'
as $$
declare
  v_count int;
  v_role text := coalesce(auth.role(), '');
  v_uid text := auth.uid()::text;
begin
  -- Client roles may only touch keys the browser legitimately sends, and
  -- per-user keys only for themselves. Server (service_role) and direct
  -- database sessions are trusted.
  if v_role in ('anon', 'authenticated') then
    if not (
      p_key like 'pwreset:%'
      or (v_uid is not null and p_key in (
        'send-email:' || v_uid,
        'report-export:' || v_uid,
        'bulk-case-upload:' || v_uid,
        'bulk-rapid-response-upload:' || v_uid
      ))
    ) then
      raise exception 'rate limit key not permitted for this caller'
        using errcode = '42501';
    end if;
  end if;

  insert into public.rate_limits (key, count, window_start)
  values (p_key, 1, now())
  on conflict (key) do update
    set count = case
          when public.rate_limits.window_start <= now() - make_interval(secs => p_window_seconds)
            then 1
          else public.rate_limits.count + 1
        end,
        window_start = case
          when public.rate_limits.window_start <= now() - make_interval(secs => p_window_seconds)
            then now()
          else public.rate_limits.window_start
        end
  returning count into v_count;

  return v_count <= p_max_count;
end;
$$;

-- Unchanged grants: the password-reset form needs anon access.
revoke all on function public.check_rate_limit(text, int, int) from public;
grant execute on function public.check_rate_limit(text, int, int) to anon, authenticated, service_role;

-- No client code uses these; leaving them client-callable let any account
-- reset or probe another user's counters.
revoke all on function public.clear_rate_limit(text) from public, anon, authenticated;
grant execute on function public.clear_rate_limit(text) to service_role;

revoke all on function public.peek_rate_limit(text) from public, anon, authenticated;
grant execute on function public.peek_rate_limit(text) to service_role;
