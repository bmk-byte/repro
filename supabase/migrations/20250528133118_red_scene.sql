/*
  # Fix profiles table RLS policies

  1. Changes
    - Drop existing RLS policies on profiles table that are causing infinite recursion
    - Create new, simplified RLS policies that avoid circular dependencies
    - Maintain security while allowing proper data access

  2. Security
    - Enable RLS on profiles table
    - Add policies for:
      - Users can read their own profile
      - Users can update their own profile
      - Moderators can read all profiles (using direct email check)
*/

-- First, drop existing problematic policies
DROP POLICY IF EXISTS "Moderators can read all user data" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;

-- Re-enable RLS (in case it was disabled)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create new, simplified policies

-- Users can view their own profile
CREATE POLICY "Users can view own profile"
ON profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
ON profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Moderators can read all profiles (using direct email check)
CREATE POLICY "Moderators can view all profiles"
ON profiles
FOR SELECT
TO authenticated
USING (
  auth.jwt() ->> 'email' LIKE '%@afyanahaki.org'
);