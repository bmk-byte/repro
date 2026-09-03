-- DB-backed atomic fixed-window rate limiter. A single INSERT ... ON
-- CONFLICT upsert avoids the read-then-write race a naive
-- "select count, compare, then insert/update" approach would have under
-- concurrent requests.

create table if not exists public.rate_limits (
  key text primary key,
  count int not null default 0,
  window_start timestamptz not null default now()
);

-- Deny-all by design: nothing queries this table directly from the client.
-- All access goes through the SECURITY DEFINER functions below, consistent
-- with how other privileged-write tables in this app are protected (see
-- profiles.is_moderator / admin_set_moderator).
alter table public.rate_limits enable row level security;

create or replace function public.check_rate_limit(p_key text, p_max_count int, p_window_seconds int)
returns boolean
language plpgsql
security definer
set search_path = 'pg_catalog', 'public'
as $$
declare
  v_count int;
begin
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

-- "Peek without incrementing" + "clear" pair, for a future
-- lockout-after-N-failures flow (not consumed by any code path today —
-- Supabase Auth already rate-limits login attempts itself).
create or replace function public.peek_rate_limit(p_key text)
returns int
language sql
security definer
set search_path = 'pg_catalog', 'public'
as $$
  select coalesce(
    (select count from public.rate_limits
       where key = p_key
         and window_start > now() - interval '1 day'),
    0
  );
$$;

create or replace function public.clear_rate_limit(p_key text)
returns void
language sql
security definer
set search_path = 'pg_catalog', 'public'
as $$
  delete from public.rate_limits where key = p_key;
$$;

create or replace function public.purge_expired_rate_limits()
returns void
language sql
security definer
set search_path = 'pg_catalog', 'public'
as $$
  delete from public.rate_limits where window_start < now() - interval '1 day';
$$;

-- Called via RPC from edge functions on the caller's own JWT, so
-- `authenticated` needs EXECUTE; `service_role` covers anything called with
-- the service key.
grant execute on function public.check_rate_limit(text, int, int) to authenticated, service_role;
grant execute on function public.peek_rate_limit(text) to authenticated, service_role;
grant execute on function public.clear_rate_limit(text) to authenticated, service_role;
grant execute on function public.purge_expired_rate_limits() to service_role;

select cron.schedule('purge-rate-limits', '*/5 * * * *', $$select public.purge_expired_rate_limits()$$);
