-- Drop existing RLS policies for profiles table
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Moderators can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Moderators can update any profile" ON profiles;
DROP POLICY IF EXISTS "Allow own profile read" ON profiles;
DROP POLICY IF EXISTS "Allow authenticated read public profile info" ON profiles;
DROP POLICY IF EXISTS "Allow moderators read all user data" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Moderators can update any profile" ON profiles;

-- Create new simplified RLS policies
-- 1. Allow users to view their own profile
CREATE POLICY "Users can view own profile"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- 2. Allow users to update their own profile
CREATE POLICY "Users can update own profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- 3. Allow authenticated users to read basic profile info
CREATE POLICY "Allow authenticated read public profile info"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (true);

-- 4. Allow moderators to view all profiles
-- This uses a direct email check to avoid recursion
CREATE POLICY "Moderators can view all profiles"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (
    (auth.jwt() ->> 'email' LIKE '%@afyanahaki.org') OR
    (auth.uid() = id AND is_moderator = true)
  );

-- 5. Allow moderators to update any profile
-- This uses a direct email check to avoid recursion
CREATE POLICY "Moderators can update any profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (
    (auth.jwt() ->> 'email' LIKE '%@afyanahaki.org') OR
    (auth.uid() = id AND is_moderator = true)
  );

-- 6. Allow users to insert their own profile
CREATE POLICY "Users can insert own profile"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);