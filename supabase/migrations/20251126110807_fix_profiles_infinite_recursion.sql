/*
  # Fix Infinite Recursion in Profiles RLS Policies

  1. Problem
    - Policies for other tables check profiles.is_moderator
    - This causes infinite recursion when those policies are evaluated
    - Need to use a function or simpler check
  
  2. Solution
    - Create a stable function to check moderator status
    - Update all policies to avoid recursive profile lookups
  
  3. Security
    - Maintains the same security requirements
    - Prevents infinite recursion errors
*/

-- Create a stable function to check if current user is a moderator
-- This function is marked STABLE so it won't cause recursion
CREATE OR REPLACE FUNCTION current_user_is_moderator()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT COALESCE(
    (SELECT is_moderator FROM profiles WHERE id = auth.uid()),
    false
  );
$$;

-- Drop and recreate policies that were causing recursion
-- Starting with policies that check moderator status on OTHER tables

-- Fix cases table policies
DROP POLICY IF EXISTS "Moderators can read all cases" ON cases;
DROP POLICY IF EXISTS "Moderators can insert cases" ON cases;
DROP POLICY IF EXISTS "Moderators can update any case" ON cases;
DROP POLICY IF EXISTS "Authorized users can update any case" ON cases;
DROP POLICY IF EXISTS "Authorized users can delete cases" ON cases;

CREATE POLICY "Moderators can read all cases"
  ON cases FOR SELECT
  TO authenticated
  USING (current_user_is_moderator());

CREATE POLICY "Moderators can insert cases"
  ON cases FOR INSERT
  TO authenticated
  WITH CHECK (current_user_is_moderator());

CREATE POLICY "Moderators can update any case"
  ON cases FOR UPDATE
  TO authenticated
  USING (current_user_is_moderator());

CREATE POLICY "Authorized users can update any case"
  ON cases FOR UPDATE
  TO authenticated
  USING (current_user_is_moderator());

CREATE POLICY "Authorized users can delete cases"
  ON cases FOR DELETE
  TO authenticated
  USING (current_user_is_moderator());

-- Fix judgments table policies
DROP POLICY IF EXISTS "Moderators can insert judgments" ON judgments;
DROP POLICY IF EXISTS "Moderators can update any judgment" ON judgments;
DROP POLICY IF EXISTS "Authorized users can update any judgment" ON judgments;
DROP POLICY IF EXISTS "Authorized users can delete judgments" ON judgments;

CREATE POLICY "Moderators can insert judgments"
  ON judgments FOR INSERT
  TO authenticated
  WITH CHECK (current_user_is_moderator());

CREATE POLICY "Moderators can update any judgment"
  ON judgments FOR UPDATE
  TO authenticated
  USING (current_user_is_moderator());

CREATE POLICY "Authorized users can update any judgment"
  ON judgments FOR UPDATE
  TO authenticated
  USING (current_user_is_moderator());

CREATE POLICY "Authorized users can delete judgments"
  ON judgments FOR DELETE
  TO authenticated
  USING (current_user_is_moderator());

-- Fix pending_cases table policies
DROP POLICY IF EXISTS "Moderators can view all pending cases" ON pending_cases;
DROP POLICY IF EXISTS "Moderators can update pending cases" ON pending_cases;
DROP POLICY IF EXISTS "Moderators can delete pending cases" ON pending_cases;

CREATE POLICY "Moderators can view all pending cases"
  ON pending_cases FOR SELECT
  TO authenticated
  USING (current_user_is_moderator());

CREATE POLICY "Moderators can update pending cases"
  ON pending_cases FOR UPDATE
  TO authenticated
  USING (current_user_is_moderator());

CREATE POLICY "Moderators can delete pending cases"
  ON pending_cases FOR DELETE
  TO authenticated
  USING (current_user_is_moderator());

-- Fix pending_judgments table policies
DROP POLICY IF EXISTS "Moderators can view all pending judgments" ON pending_judgments;
DROP POLICY IF EXISTS "Moderators can update pending judgments" ON pending_judgments;
DROP POLICY IF EXISTS "Moderators can delete pending judgments" ON pending_judgments;

CREATE POLICY "Moderators can view all pending judgments"
  ON pending_judgments FOR SELECT
  TO authenticated
  USING (current_user_is_moderator());

CREATE POLICY "Moderators can update pending judgments"
  ON pending_judgments FOR UPDATE
  TO authenticated
  USING (current_user_is_moderator());

CREATE POLICY "Moderators can delete pending judgments"
  ON pending_judgments FOR DELETE
  TO authenticated
  USING (current_user_is_moderator());

-- Fix audit_logs table policies
DROP POLICY IF EXISTS "Authorized users can view audit logs" ON audit_logs;
DROP POLICY IF EXISTS "Moderators can view audit logs" ON audit_logs;
DROP POLICY IF EXISTS "Moderators can update audit logs" ON audit_logs;
DROP POLICY IF EXISTS "Moderators can delete audit logs" ON audit_logs;

CREATE POLICY "Authorized users can view audit logs"
  ON audit_logs FOR SELECT
  TO authenticated
  USING (current_user_is_moderator());

CREATE POLICY "Moderators can view audit logs"
  ON audit_logs FOR SELECT
  TO authenticated
  USING (current_user_is_moderator());

CREATE POLICY "Moderators can update audit logs"
  ON audit_logs FOR UPDATE
  TO authenticated
  USING (current_user_is_moderator());

CREATE POLICY "Moderators can delete audit logs"
  ON audit_logs FOR DELETE
  TO authenticated
  USING (current_user_is_moderator());

-- Fix law_documents table policies
DROP POLICY IF EXISTS "Allow moderators read all law documents" ON law_documents;
DROP POLICY IF EXISTS "Moderators can read all law documents" ON law_documents;
DROP POLICY IF EXISTS "Only admins can insert law documents" ON law_documents;
DROP POLICY IF EXISTS "Only admins can update law documents" ON law_documents;

CREATE POLICY "Allow moderators read all law documents"
  ON law_documents FOR SELECT
  TO authenticated
  USING (current_user_is_moderator());

CREATE POLICY "Moderators can read all law documents"
  ON law_documents FOR SELECT
  TO authenticated
  USING (current_user_is_moderator());

CREATE POLICY "Only admins can insert law documents"
  ON law_documents FOR INSERT
  TO authenticated
  WITH CHECK (current_user_is_moderator());

CREATE POLICY "Only admins can update law documents"
  ON law_documents FOR UPDATE
  TO authenticated
  USING (current_user_is_moderator());

-- Fix health_indicators policies
DROP POLICY IF EXISTS "Moderators can update any health indicators" ON health_indicators;

CREATE POLICY "Moderators can update any health indicators"
  ON health_indicators FOR UPDATE
  TO authenticated
  USING (current_user_is_moderator());

-- Fix app_settings policies
DROP POLICY IF EXISTS "Only moderators can update app settings" ON app_settings;

CREATE POLICY "Only moderators can update app settings"
  ON app_settings FOR UPDATE
  TO authenticated
  USING (current_user_is_moderator());

-- Fix routing_audit_log policies
DROP POLICY IF EXISTS "Moderators can view audit log" ON routing_audit_log;

CREATE POLICY "Moderators can view audit log"
  ON routing_audit_log FOR SELECT
  TO authenticated
  USING (current_user_is_moderator());

-- Fix moderators table policies
DROP POLICY IF EXISTS "Admins can manage moderators" ON moderators;

CREATE POLICY "Admins can manage moderators"
  ON moderators FOR ALL
  TO authenticated
  USING (current_user_is_moderator())
  WITH CHECK (current_user_is_moderator());

-- Fix notification_queue policies
DROP POLICY IF EXISTS "Admins can manage notification queue" ON notification_queue;

CREATE POLICY "Admins can manage notification queue"
  ON notification_queue FOR ALL
  TO authenticated
  USING (current_user_is_moderator())
  WITH CHECK (current_user_is_moderator());

-- Now fix the profiles table policies themselves
DROP POLICY IF EXISTS "Moderators can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Moderators can update any profile" ON profiles;

-- These policies are simpler and won't recurse
CREATE POLICY "Moderators can view all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    (SELECT auth.uid()) = id OR current_user_is_moderator()
  );

CREATE POLICY "Moderators can update any profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (
    (SELECT auth.uid()) = id OR current_user_is_moderator()
  );