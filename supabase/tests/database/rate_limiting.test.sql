-- pgTAP tests for the rate-limiting functions introduced in
-- supabase/migrations/20260903071500_add_rate_limiting.sql.
--
-- Run with: supabase start && supabase test db
-- (requires Docker — supabase start spins up a local Postgres instance).
--
-- IMPORTANT: this environment did not have Docker available to actually
-- run these tests during authoring. They are written against pgTAP's
-- documented API (plan/ok/is/finish) and reviewed for correctness, but
-- have not been executed here. Run them locally or wire them into CI on
-- a machine with Docker before relying on them as a passing suite.
--
-- These tests exercise the real check_rate_limit()/peek_rate_limit()/
-- clear_rate_limit()/purge_expired_rate_limits() functions directly
-- against a real Postgres instance — this is the correct level to test
-- fixed-window rate limiting logic (application-level mocks can't
-- validate the actual SQL window-reset arithmetic).

begin;

select plan(11);

-- Clean slate for this key namespace.
delete from public.rate_limits where key like 'pgtap:%';

-- 1. Normal allowed request: first call for a fresh key is always allowed.
select ok(
  public.check_rate_limit('pgtap:normal', 3, 60) = true,
  'first call for a fresh key is allowed'
);

-- 2. Requests within the limit continue to be allowed.
select ok(
  public.check_rate_limit('pgtap:normal', 3, 60) = true,
  'second call within max_count is allowed'
);
select ok(
  public.check_rate_limit('pgtap:normal', 3, 60) = true,
  'third call within max_count is allowed'
);

-- 3. Requests exceeding the limit are blocked.
select ok(
  public.check_rate_limit('pgtap:normal', 3, 60) = false,
  'fourth call exceeding max_count of 3 is blocked'
);
select ok(
  public.check_rate_limit('pgtap:normal', 3, 60) = false,
  'further calls remain blocked within the same window'
);

-- 4. Separate rate-limit keys do not interfere with each other.
select ok(
  public.check_rate_limit('pgtap:other-key', 3, 60) = true,
  'a different key has its own independent counter (not affected by pgtap:normal being exhausted)'
);

-- 5. Window reset behaviour: manually age the window_start into the past
-- (simulating time passing) and confirm the counter resets rather than
-- staying blocked forever.
update public.rate_limits
set window_start = now() - interval '120 seconds'
where key = 'pgtap:normal';

select ok(
  public.check_rate_limit('pgtap:normal', 3, 60) = true,
  'after the window has elapsed, the counter resets and the request is allowed again'
);

select is(
  (select count from public.rate_limits where key = 'pgtap:normal'),
  1,
  'the reset window starts a fresh count of 1, not an accumulated count'
);

-- 6. clear_rate_limit() removes a key outright.
select public.clear_rate_limit('pgtap:normal');
select is(
  (select count(*) from public.rate_limits where key = 'pgtap:normal')::int,
  0,
  'clear_rate_limit() removes the row for that key'
);

-- 7. purge_expired_rate_limits() removes rows older than its 1-day window
-- without touching recent ones.
delete from public.rate_limits where key like 'pgtap:purge%';
insert into public.rate_limits (key, count, window_start)
values ('pgtap:purge-old', 1, now() - interval '2 days'),
       ('pgtap:purge-recent', 1, now());

select public.purge_expired_rate_limits();

select is(
  (select count(*) from public.rate_limits where key = 'pgtap:purge-old')::int,
  0,
  'purge_expired_rate_limits() removes rows older than 1 day'
);

select is(
  (select count(*) from public.rate_limits where key = 'pgtap:purge-recent')::int,
  1,
  'purge_expired_rate_limits() leaves recent rows untouched'
);

-- Note: concurrent-request behaviour (two simultaneous callers racing on
-- the same key) is not exercised here — pgTAP runs sequentially on a
-- single connection, so it cannot simulate true concurrency. The
-- INSERT ... ON CONFLICT DO UPDATE pattern in check_rate_limit() is
-- designed to be atomic under Postgres's row-level locking, but that
-- guarantee should be verified with a proper concurrent load test
-- (e.g. pgbench or an application-level integration test hitting the
-- RPC from multiple connections) if this becomes a priority — not
-- claimed as verified by this file.

select finish();

rollback;
