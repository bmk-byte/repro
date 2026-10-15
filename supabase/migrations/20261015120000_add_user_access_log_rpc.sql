-- Admin-only "who last accessed the system, and when" view for the
-- Settings page. Last-sign-in time lives on auth.users (Supabase's own
-- auth schema), which clients can never query directly — RLS doesn't apply
-- to it and there is no public grant on that table — so this has to be a
-- SECURITY DEFINER function, mirroring list_admins()/list_moderators()
-- (see 20260903080000_add_admin_role.sql) for the admin-check and grant
-- pattern.

CREATE OR REPLACE FUNCTION public.list_user_access_logs()
 RETURNS TABLE(
   id uuid,
   email text,
   full_name text,
   organization text,
   last_sign_in_at timestamptz,
   created_at timestamptz
 )
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true) THEN
    RAISE EXCEPTION 'Only admins can view user access logs';
  END IF;

  RETURN QUERY
    SELECT p.id, p.email, p.full_name, p.organization, u.last_sign_in_at, p.created_at
    FROM profiles p
    JOIN auth.users u ON u.id = p.id
    ORDER BY u.last_sign_in_at DESC NULLS LAST;
END;
$function$;

REVOKE ALL ON FUNCTION public.list_user_access_logs() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_user_access_logs() TO authenticated;
