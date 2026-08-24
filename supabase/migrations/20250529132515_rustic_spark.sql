-- Drop existing RLS policies for profiles
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Moderators can view all profiles" ON profiles;

-- Create new RLS policies for profiles
-- 1. Users can view their own profile
CREATE POLICY "Users can view own profile"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- 2. Only moderators can update any profile
CREATE POLICY "Moderators can update any profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND is_moderator = true
    )
  );

-- 3. Moderators can view all profiles
CREATE POLICY "Moderators can view all profiles"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND is_moderator = true
    )
    OR auth.uid() = id
  );

-- 4. Allow users to update their own password (handled separately by Supabase Auth)
-- This is just a comment as password updates are handled by Supabase Auth, not RLS