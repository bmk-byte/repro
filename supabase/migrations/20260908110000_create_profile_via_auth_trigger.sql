-- Fixes "new row violates row-level security policy for table profiles" on
-- signup. Auth.tsx was inserting the profiles row itself, client-side,
-- right after calling the auth-signup proxy. That only works when GoTrue
-- returns a session immediately (access_token present) so the client can
-- setSession() before the insert. When email confirmation is required
-- (this project sends a confirmation email via the auth-email-hook
-- function), signup returns a bare User with no session — the client is
-- still `anon`, auth.uid() is null, and "Users can insert own profile"
-- (WITH CHECK auth.uid() = id) rejects the row. Every confirmation-pending
-- signup hit this.
--
-- Fix: create the profile from a SECURITY DEFINER trigger on auth.users
-- instead, which runs as postgres and bypasses RLS regardless of whether
-- the new user has a session yet. The existing
-- auto_grant_moderator_trigger (BEFORE INSERT ON public.profiles) still
-- fires as before and continues to decide is_moderator/is_admin/role from
-- NEW.email — untouched by this change.

CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, phone_number, profession, organization, role)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'phone_number',
    NEW.raw_user_meta_data->>'profession',
    NEW.raw_user_meta_data->>'organization',
    'user'
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

-- Backfill: any signups that already failed to get a profiles row because
-- of this bug (auth.users row exists, profiles row doesn't).
INSERT INTO public.profiles (id, email, full_name, phone_number, profession, organization, role)
SELECT
  u.id,
  u.email,
  u.raw_user_meta_data->>'full_name',
  u.raw_user_meta_data->>'phone_number',
  u.raw_user_meta_data->>'profession',
  u.raw_user_meta_data->>'organization',
  'user'
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL;
