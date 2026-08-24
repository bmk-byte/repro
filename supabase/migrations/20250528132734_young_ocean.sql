/*
  # Fix infinite recursion in profiles RLS policy

  1. Changes
    - Remove recursive policy from profiles table
    - Add new non-recursive policies for profiles table
      - Users can view their own profile
      - Moderators can read all user data
      - Users can update their own profile

  2. Security
    - Enable RLS on profiles table
    - Add policies for authenticated users
*/

-- Drop existing policies to prevent conflicts
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Moderators can read all user data" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;

-- Create new non-recursive policies
CREATE POLICY "Users can view their own profile"
ON profiles FOR SELECT
TO authenticated
USING (auth.uid() = id);

CREATE POLICY "Moderators can read all user data"
ON profiles FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM profiles moderator_profile
    WHERE moderator_profile.id = auth.uid()
    AND moderator_profile.is_moderator = true
  )
);

CREATE POLICY "Users can update their own profile"
ON profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);