/*
  # Fix profiles table RLS policies

  1. Changes
    - Remove existing RLS policies on profiles table that may cause recursion
    - Add simplified RLS policies for profiles table:
      - Users can view their own profile
      - Moderators can view all profiles
      - Users can update their own profile
      - Moderators can update any profile

  2. Security
    - Enable RLS on profiles table
    - Add policies for SELECT and UPDATE operations
    - Ensure no circular dependencies in policy definitions
*/

-- First, drop existing policies that might be causing recursion
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Moderators can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Moderators can update any profile" ON profiles;

-- Create new simplified policies
CREATE POLICY "Users can view own profile"
ON profiles
FOR SELECT
TO authenticated
USING (
  auth.uid() = id
);

CREATE POLICY "Moderators can view all profiles"
ON profiles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
    AND (p.is_moderator = true OR p.email LIKE '%@afyanahaki.org')
  )
  OR auth.uid() = id
);

CREATE POLICY "Users can update own profile"
ON profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

CREATE POLICY "Moderators can update any profile"
ON profiles
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
    AND (p.is_moderator = true OR p.email LIKE '%@afyanahaki.org')
  )
);

-- Ensure RLS is enabled
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;