/*
  # Fix Profile RLS Policies

  1. Changes
    - Add RLS policy for profile creation
    - Add RLS policy for profile updates
    - Add RLS policy for profile reads
    
  2. Security
    - Enable RLS on profiles table
    - Allow authenticated users to create their own profile
    - Allow users to read their own profile
    - Allow users to update their own profile
*/

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Allow authenticated read public profile info" ON profiles;
DROP POLICY IF EXISTS "Moderators can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Moderators can update any profile" ON profiles;

-- Create new policies
CREATE POLICY "Users can insert own profile"
ON profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
ON profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can view own profile"
ON profiles FOR SELECT
TO authenticated
USING (auth.uid() = id);

CREATE POLICY "Allow authenticated read public profile info"
ON profiles FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Moderators can view all profiles"
ON profiles FOR SELECT
TO authenticated
USING (
  (auth.jwt()->>'email' LIKE '%@afyanahaki.org') OR 
  (auth.uid() = id AND is_moderator = true)
);

CREATE POLICY "Moderators can update any profile"
ON profiles FOR UPDATE
TO authenticated
USING (
  (auth.jwt()->>'email' LIKE '%@afyanahaki.org') OR 
  (auth.uid() = id AND is_moderator = true)
);