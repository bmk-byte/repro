-- Restrict granting/revoking moderator status to admins only (previously
-- any moderator could grant/revoke any other moderator). Moderating content
-- and managing who else can moderate are now separate capabilities.

CREATE OR REPLACE FUNCTION public.list_moderators()
 RETURNS TABLE(id uuid, email text, full_name text, organization text, created_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true) THEN
    RAISE EXCEPTION 'Only admins can list moderators';
  END IF;

  RETURN QUERY
    SELECT profiles.id, profiles.email, profiles.full_name, profiles.organization, profiles.created_at
    FROM profiles
    WHERE profiles.is_moderator = true
    ORDER BY profiles.created_at ASC;
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_set_moderator(target_email text, should_grant boolean)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true) THEN
    RAISE EXCEPTION 'Only admins can change moderator status';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM profiles WHERE profiles.email = target_email) THEN
    RAISE EXCEPTION 'No profile found for %', target_email;
  END IF;

  PERFORM set_config('app.trusted_profile_write', 'on', true);
  UPDATE profiles SET is_moderator = should_grant WHERE profiles.email = target_email;

  INSERT INTO audit_logs (table_name, record_id, action, performed_by, changes)
  SELECT 'profiles', profiles.id, 'update', auth.uid(),
         jsonb_build_object('is_moderator', should_grant, 'via', 'admin_set_moderator')
  FROM profiles WHERE profiles.email = target_email;
END;
$function$;
