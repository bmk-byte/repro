/*
  # Lock down profiles.is_moderator against client self-escalation

  ## Problem
  The existing "Users can update own profile" RLS policy on `profiles` is
  row-scoped only (`auth.uid() = id`) and does not restrict which columns an
  owner may write. Combined with client code that calls
  `supabase.from('profiles').update({ is_moderator: true })`, any
  authenticated user can grant themselves moderator status directly from the
  browser, bypassing every access-control decision downstream of that column
  (cases, judgments, pending submissions, audit logs, other users' profiles).

  ## Fix
  1. A BEFORE UPDATE trigger on `profiles` that silently preserves
     `is_moderator` (and `role`) unless the acting Postgres role is
     `service_role` or `supabase_admin` — i.e. no ordinary client session,
     however it phrases the UPDATE, can change these columns.
  2. A BEFORE INSERT trigger that auto-grants `is_moderator = true` to a
     server-side allow-list of approved partner-organisation emails at
     signup time — this folds in and supersedes the untracked
     `GRANT_MODERATOR_ACCESS.sql` script (which only guarded INSERT and was
     never checked into migration history). Keep this list in sync with the
     canonical list; it replaces the client-exposed VITE_MODERATOR_CONFIG
     env var as the source of truth.

  ## Notes
  - `SECURITY DEFINER` + `SET search_path = pg_catalog, public` per the
    hardening convention already established in
    20251121215132_fix_function_search_paths_v3.sql.
  - This does not change how `is_moderator` is read — existing RLS SELECT
    policies and helper functions (`is_moderator()`, etc.) are untouched.
*/

-- ---------------------------------------------------------------------------
-- 1. Auto-grant on INSERT for approved emails (supersedes GRANT_MODERATOR_ACCESS.sql)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION auto_grant_moderator_to_approved_emails()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  -- Unconditionally derive is_moderator/role from the server-side allow-list
  -- on every INSERT — a client sending is_moderator:true for an unlisted
  -- email is overridden here, not just ignored when the list doesn't match.
  IF NEW.email IN (
    'litigation@wlsazim.co.zw',
    'snamuganza@womenwithmission.org',
    'hnalubega@iwilap.org',
    'rochuli@spi-hub.org',
    'ajalo@cehurd.org',
    'serwanjjasolomon@gmail.com',
    'veronicamercyamito@gmail.com',
    'jovia7@gmail.com',
    'hajara@femmeforteug.org',
    'ubuntujusticecentre@gmail.com',
    'dkibira@gmail.com',
    'programs.coswak@gmail.com',
    'litigation@kelinkenya.org',
    'lamole.hailey@gmail.com',
    'tadalamtambo@vitalrightsfoundation.com',
    'kevinobede@gmail.com',
    'mhlaba@wag.org.zw'
  ) OR NEW.email LIKE '%@afyanahaki.org' THEN
    NEW.is_moderator := true;
    NEW.role := coalesce(nullif(NEW.role, 'user'), 'expert');
  ELSE
    NEW.is_moderator := false;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS auto_grant_moderator_trigger ON profiles;
CREATE TRIGGER auto_grant_moderator_trigger
  BEFORE INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION auto_grant_moderator_to_approved_emails();

-- ---------------------------------------------------------------------------
-- 2. One-time backfill: grant the existing allow-list retroactively (mirrors
--    GRANT_MODERATOR_ACCESS.sql's manual UPDATE). Runs BEFORE the
--    UPDATE-blocking trigger below is created, so it isn't intercepted by
--    its own protection.
-- ---------------------------------------------------------------------------
UPDATE profiles
SET is_moderator = true
WHERE email IN (
  'litigation@wlsazim.co.zw',
  'snamuganza@womenwithmission.org',
  'hnalubega@iwilap.org',
  'rochuli@spi-hub.org',
  'ajalo@cehurd.org',
  'serwanjjasolomon@gmail.com',
  'veronicamercyamito@gmail.com',
  'jovia7@gmail.com',
  'hajara@femmeforteug.org',
  'ubuntujusticecentre@gmail.com',
  'dkibira@gmail.com',
  'programs.coswak@gmail.com',
  'litigation@kelinkenya.org',
  'lamole.hailey@gmail.com',
  'tadalamtambo@vitalrightsfoundation.com',
  'kevinobede@gmail.com',
  'mhlaba@wag.org.zw'
) OR email LIKE '%@afyanahaki.org';

-- ---------------------------------------------------------------------------
-- 3. Block client-side changes to is_moderator / role on UPDATE
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION protect_privileged_profile_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  -- Allowed to change is_moderator/role: a direct service_role write, a
  -- manual edit by a DBA in the Supabase SQL editor (runs as `postgres`),
  -- or a call that went through admin_set_moderator() in this same
  -- transaction (it sets the local sentinel below before its UPDATE — see
  -- that function). Everything else — including a client calling
  -- .update({is_moderator:true}) directly — gets silently reverted.
  IF current_setting('request.jwt.claim.role', true) IS DISTINCT FROM 'service_role'
     AND current_user NOT IN ('service_role', 'supabase_admin', 'postgres')
     AND current_setting('app.trusted_profile_write', true) IS DISTINCT FROM 'on' THEN
    NEW.is_moderator := OLD.is_moderator;
    NEW.role := OLD.role;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_privileged_profile_columns_trigger ON profiles;
CREATE TRIGGER protect_privileged_profile_columns_trigger
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION protect_privileged_profile_columns();
