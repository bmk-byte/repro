/*
  # Trusted RPCs for moderator administration

  Gives moderators a safe, auditable way to grant/revoke moderator status
  and list current moderators, without any client ever writing
  `profiles.is_moderator` directly (that path is blocked by the trigger in
  20260824113626_lock_is_moderator_column.sql). All three functions check
  the caller is already a moderator before doing anything.
*/

CREATE OR REPLACE FUNCTION list_moderators()
RETURNS TABLE (id uuid, email text, full_name text, organization text, created_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_moderator = true) THEN
    RAISE EXCEPTION 'Only moderators can list moderators';
  END IF;

  RETURN QUERY
    SELECT profiles.id, profiles.email, profiles.full_name, profiles.organization, profiles.created_at
    FROM profiles
    WHERE profiles.is_moderator = true
    ORDER BY profiles.created_at ASC;
END;
$$;

CREATE OR REPLACE FUNCTION admin_set_moderator(target_email text, should_grant boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_moderator = true) THEN
    RAISE EXCEPTION 'Only moderators can change moderator status';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM profiles WHERE profiles.email = target_email) THEN
    RAISE EXCEPTION 'No profile found for %', target_email;
  END IF;

  -- Local to this transaction only — lets protect_privileged_profile_columns()
  -- (20260824113626_lock_is_moderator_column.sql) allow this specific,
  -- already-authorized write while still rejecting a direct client UPDATE.
  PERFORM set_config('app.trusted_profile_write', 'on', true);
  UPDATE profiles SET is_moderator = should_grant WHERE profiles.email = target_email;

  INSERT INTO audit_logs (table_name, record_id, action, performed_by, changes)
  SELECT 'profiles', profiles.id, 'update', auth.uid(),
         jsonb_build_object('is_moderator', should_grant, 'via', 'admin_set_moderator')
  FROM profiles WHERE profiles.email = target_email;
END;
$$;

GRANT EXECUTE ON FUNCTION list_moderators() TO authenticated;
GRANT EXECUTE ON FUNCTION admin_set_moderator(text, boolean) TO authenticated;
