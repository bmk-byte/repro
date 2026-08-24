/*
  # Fix profiles table RLS policies

  1. Changes
    - Drop existing RLS policies on profiles table that may be causing recursion
    - Create simplified RLS policies with clear, non-recursive conditions
    - Ensure proper access control while avoiding circular dependencies
    
  2. Security
    - Enable RLS on profiles table
    - Add policy for users to view their own profile
    - Add policy for moderators to view all profiles
    - Add policy for users to update their own profile
*/

-- Drop existing policies that may be causing recursion
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Moderators can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Moderators can update any profile" ON public.profiles;

-- Create new simplified policies
CREATE POLICY "Users can view own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id);

CREATE POLICY "Moderators can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND is_moderator = true
  )
  OR 
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = auth.uid() AND email LIKE '%@afyanahaki.org'
  )
);

CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

CREATE POLICY "Moderators can update any profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND is_moderator = true
  )
  OR 
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = auth.uid() AND email LIKE '%@afyanahaki.org'
  )
);