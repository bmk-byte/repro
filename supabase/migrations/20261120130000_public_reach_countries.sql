/*
  # Public "where we work" map: countries only, no counts

  1. Profiles record a country
    - profiles.country_id (nullable; existing users can set it in Settings).
    - The sign-up trigger copies raw_user_meta_data->>'country_id' into it,
      but only when it is a well-formed id of a real countries row, so a
      tampered sign-up payload can't break sign-up or store junk.

  2. list_public_reach_countries()
    - Callable without signing in, for the public landing page.
    - Returns ONLY country name, code and region: every country that has an
      approved, non-deleted case or at least one registered user. No counts,
      no case or user details. It updates by itself: a new registration or a
      newly approved case adds its country on the next page load.
    - SECURITY DEFINER so it can look at cases/profiles without exposing
      those tables to anonymous visitors; it returns nothing else.

  3. Rollback
    - DROP FUNCTION public.list_public_reach_countries();
    - Re-run handle_new_auth_user from 20260908110000_create_profile_via_auth_trigger.sql
    - ALTER TABLE profiles DROP COLUMN country_id;
*/

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS country_id uuid REFERENCES public.countries(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_country_id ON public.profiles (country_id);

CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_country_text text := NEW.raw_user_meta_data->>'country_id';
  v_country_id uuid;
BEGIN
  IF v_country_text ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    SELECT id INTO v_country_id FROM public.countries WHERE id = v_country_text::uuid;
  END IF;

  INSERT INTO public.profiles (id, email, full_name, phone_number, profession, organization, role, country_id)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'phone_number',
    NEW.raw_user_meta_data->>'profession',
    NEW.raw_user_meta_data->>'organization',
    'user',
    v_country_id
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.list_public_reach_countries()
RETURNS TABLE (name text, code text, region text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT c.name, c.code, c.region
  FROM public.countries c
  WHERE EXISTS (
          SELECT 1 FROM public.cases k
          WHERE k.country_id = c.id
            AND k.moderation_status = 'approved'
            AND k.deleted_at IS NULL
        )
     OR EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.country_id = c.id
        )
  ORDER BY c.name;
$$;

REVOKE ALL ON FUNCTION public.list_public_reach_countries() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_public_reach_countries() TO anon, authenticated, service_role;
