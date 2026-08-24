/*
  # Fix RLS policies for profiles table

  1. Changes
    - Remove recursive conditions from profiles RLS policies
    - Simplify policy checks to prevent infinite recursion
    - Update moderator access policy to use direct uid comparison
    - Update user access policy to use direct id comparison

  2. Security
    - Maintain data access restrictions
    - Ensure users can only access their own profiles
    - Allow moderators to view all profiles
    - Enable RLS on profiles table
*/

-- Drop existing policies to recreate them
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Moderators can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Moderators can update any profile" ON profiles;

-- Create simplified policies without recursive conditions
CREATE POLICY "Users can view own profile"
ON profiles
FOR SELECT
TO authenticated
USING (
  auth.uid() = id
);

CREATE POLICY "Users can update own profile"
ON profiles
FOR UPDATE
TO authenticated
USING (
  auth.uid() = id
)
WITH CHECK (
  auth.uid() = id
);

-- Moderator policies using direct email check and is_moderator flag
CREATE POLICY "Moderators can view all profiles"
ON profiles
FOR SELECT
TO authenticated
USING (
  (
    -- Check if user is a moderator directly
    EXISTS (
      SELECT 1
      FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.email LIKE '%@afyanahaki.org'
    )
  ) OR (
    -- Check is_moderator flag directly
    is_moderator = true
    AND auth.uid() = id
  )
);

CREATE POLICY "Moderators can update any profile"
ON profiles
FOR UPDATE
TO authenticated
USING (
  (
    -- Check if user is a moderator directly
    EXISTS (
      SELECT 1
      FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.email LIKE '%@afyanahaki.org'
    )
  ) OR (
    -- Check is_moderator flag directly
    is_moderator = true
    AND auth.uid() = id
  )
);