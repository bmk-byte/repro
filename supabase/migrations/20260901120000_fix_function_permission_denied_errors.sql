/*
  # Fix "permission denied for function" errors flooding the postgres logs

  ## Problem
  1. `current_user_is_moderator()` is called from RLS policies evaluated as
     the `authenticated` role, but was never granted EXECUTE to that role
     (or `anon`) — only its owner `postgres` and `service_role` could call
     it. Every RLS check that references it (cases, judgments, profiles,
     audit_logs, etc.) was silently failing with 42501 for real users,
     including moderators.
  2. The `process-notification-queue` pg_cron job (schedule `* * * * *`)
     was registered to run as `supabase_read_only_user` — a role with
     neither EXECUTE on `process_notification_queue()` nor write access to
     the tables it updates. It has been failing every single run.

  ## Fix
  - Grant EXECUTE on both functions to the roles that legitimately need to
    call them.
  - Repoint the cron job at `postgres`, which owns the function and has
    the necessary table privileges.
*/

GRANT EXECUTE ON FUNCTION current_user_is_moderator() TO authenticated;
GRANT EXECUTE ON FUNCTION process_notification_queue() TO postgres, service_role;

SELECT cron.alter_job(job_id := jobid, username := 'postgres')
FROM cron.job
WHERE command = 'SELECT public.process_notification_queue()';
