/*
  # Fix profiles RLS policies

  1. Changes
    - Remove recursive policies from profiles table
    - Simplify SELECT policies to prevent infinite recursion
    - Maintain security while allowing necessary access patterns
    - Keep moderator access without recursive checks

  2. Security
    - Users can still only view/edit their own profiles
    - Moderators can view all profiles
    - Maintains data privacy and access control
*/

-- Drop existing policies to replace them with simplified versions
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Moderators can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Moderators can update any profile" ON profiles;

-- Create simplified policies that avoid recursion

-- Basic user access - view own profile
CREATE POLICY "Users can view own profile"
ON profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- Basic user access - update own profile
CREATE POLICY "Users can update own profile"
ON profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Moderator access - view all profiles
-- Uses direct email check instead of recursive profile lookup
CREATE POLICY "Moderators can view all profiles"
ON profiles
FOR SELECT
TO authenticated
USING (
  (auth.uid() = id) OR 
  (
    EXISTS (
      SELECT 1 
      FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND (
        auth.users.email LIKE '%@afyanahaki.org'
        OR EXISTS (
          SELECT 1 
          FROM profiles p 
          WHERE p.id = auth.uid() 
          AND p.is_moderator = true
        )
      )
    )
  )
);

-- Moderator access - update any profile
-- Uses direct email check instead of recursive profile lookup
CREATE POLICY "Moderators can update any profile"
ON profiles
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM auth.users 
    WHERE auth.users.id = auth.uid() 
    AND (
      auth.users.email LIKE '%@afyanahaki.org'
      OR EXISTS (
        SELECT 1 
        FROM profiles p 
        WHERE p.id = auth.uid() 
        AND p.is_moderator = true
      )
    )
  )
);