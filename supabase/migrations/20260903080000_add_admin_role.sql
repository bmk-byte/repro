-- Full-access "admin" role, distinct from "moderator": the org's IT team
-- (kuteesa@, sendaula@, chaciyo@afyanahaki.org) needs unrestricted access
-- for ad hoc system modifications. Admin is a strict superset of moderator,
-- implemented by redefining current_user_is_moderator()'s meaning to
-- "moderator or admin" rather than touching every one of the 12 RLS
-- policies that already reference it — one function change instead of a
-- dozen policy rewrites, so no table can be missed.

ALTER TABLE profiles ADD COLUMN is_admin boolean NOT NULL DEFAULT false;

-- Extends the existing moderator auto-grant trigger with an independent
-- admin check (named allow-list only — unlike moderator, no @afyanahaki.org
-- domain wildcard, since this is 3 specific IT staff, not "anyone at the org").
CREATE OR REPLACE FUNCTION public.auto_grant_moderator_to_approved_emails()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
BEGIN
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

  IF NEW.email IN (
    'kuteesa@afyanahaki.org',
    'sendaula@afyanahaki.org',
    'chaciyo@afyanahaki.org'
  ) THEN
    NEW.is_admin := true;
  ELSE
    NEW.is_admin := false;
  END IF;

  RETURN NEW;
END;
$function$;

-- Extends the existing UPDATE-protection trigger to also lock is_admin.
CREATE OR REPLACE FUNCTION public.protect_privileged_profile_columns()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
BEGIN
  IF current_setting('request.jwt.claim.role', true) IS DISTINCT FROM 'service_role'
     AND current_user NOT IN ('service_role', 'supabase_admin', 'postgres')
     AND current_setting('app.trusted_profile_write', true) IS DISTINCT FROM 'on' THEN
    NEW.is_moderator := OLD.is_moderator;
    NEW.role := OLD.role;
    NEW.is_admin := OLD.is_admin;
  END IF;

  RETURN NEW;
END;
$function$;

-- The superset trick: every existing RLS policy on the 12 tables that
-- already calls current_user_is_moderator() now also admits admins,
-- without touching any of those policies.
CREATE OR REPLACE FUNCTION public.current_user_is_moderator()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
SELECT COALESCE(
(SELECT is_moderator OR is_admin FROM profiles WHERE id = auth.uid()),
false
);
$function$;

GRANT EXECUTE ON FUNCTION public.current_user_is_moderator() TO authenticated;

-- Literal admin-only check, for anything that must exclude moderators.
CREATE OR REPLACE FUNCTION public.current_user_is_admin()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
SELECT COALESCE(
(SELECT is_admin FROM profiles WHERE id = auth.uid()),
false
);
$function$;

GRANT EXECUTE ON FUNCTION public.current_user_is_admin() TO authenticated;

-- Admin grant/revoke + listing, mirroring list_moderators()/admin_set_moderator() exactly.
CREATE OR REPLACE FUNCTION public.list_admins()
 RETURNS TABLE(id uuid, email text, full_name text, organization text, created_at timestamptz)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true) THEN
    RAISE EXCEPTION 'Only admins can list admins';
  END IF;

  RETURN QUERY
    SELECT profiles.id, profiles.email, profiles.full_name, profiles.organization, profiles.created_at
    FROM profiles
    WHERE profiles.is_admin = true
    ORDER BY profiles.created_at ASC;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.list_admins() TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_set_admin(target_email text, should_grant boolean)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true) THEN
    RAISE EXCEPTION 'Only admins can change admin status';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM profiles WHERE profiles.email = target_email) THEN
    RAISE EXCEPTION 'No profile found for %', target_email;
  END IF;

  PERFORM set_config('app.trusted_profile_write', 'on', true);
  UPDATE profiles SET is_admin = should_grant WHERE profiles.email = target_email;

  INSERT INTO audit_logs (table_name, record_id, action, performed_by, changes)
  SELECT 'profiles', profiles.id, 'update', auth.uid(),
         jsonb_build_object('is_admin', should_grant, 'via', 'admin_set_admin')
  FROM profiles WHERE profiles.email = target_email;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.admin_set_admin(text, boolean) TO authenticated;

-- Immediate effect for the 3 named accounts if they already have profile rows.
UPDATE profiles SET is_admin = true
WHERE email IN ('kuteesa@afyanahaki.org', 'sendaula@afyanahaki.org', 'chaciyo@afyanahaki.org');
