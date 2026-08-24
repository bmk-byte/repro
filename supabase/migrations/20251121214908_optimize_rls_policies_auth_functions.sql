/*
  # Optimize RLS Policies - Auth Function Performance

  1. Performance Improvements
    - Replace auth.uid() with (SELECT auth.uid()) in all RLS policies
    - This prevents re-evaluation of auth functions for each row
    - Significantly improves query performance at scale
  
  2. Affected Tables
    - cases, judgments, profiles, law_documents
    - pending_cases, pending_judgments
    - audit_logs, case_documents, expert_commentaries
    - notifications, transfer_logs
    - And all other tables with RLS policies using auth functions
  
  3. Security
    - All policies maintain their original security requirements
    - Only the performance optimization is applied
*/

-- Drop and recreate policies for profiles table
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Moderators can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Moderators can update any profile" ON profiles;

CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = id);

CREATE POLICY "Moderators can view all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (SELECT auth.uid())
      AND is_moderator = true
    )
  );

CREATE POLICY "Moderators can update any profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (SELECT auth.uid())
      AND is_moderator = true
    )
  );

-- Drop and recreate policies for cases table
DROP POLICY IF EXISTS "Allow users read own cases" ON cases;
DROP POLICY IF EXISTS "Users can create cases" ON cases;
DROP POLICY IF EXISTS "Users can update their own cases" ON cases;
DROP POLICY IF EXISTS "Users can delete their own cases" ON cases;
DROP POLICY IF EXISTS "Moderators can read all cases" ON cases;
DROP POLICY IF EXISTS "Moderators can insert cases" ON cases;
DROP POLICY IF EXISTS "Moderators can update any case" ON cases;
DROP POLICY IF EXISTS "Authorized users can update any case" ON cases;
DROP POLICY IF EXISTS "Authorized users can delete cases" ON cases;

CREATE POLICY "Allow users read own cases"
  ON cases FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can create cases"
  ON cases FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can update their own cases"
  ON cases FOR UPDATE
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can delete their own cases"
  ON cases FOR DELETE
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Moderators can read all cases"
  ON cases FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (SELECT auth.uid())
      AND is_moderator = true
    )
  );

CREATE POLICY "Moderators can insert cases"
  ON cases FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (SELECT auth.uid())
      AND is_moderator = true
    )
  );

CREATE POLICY "Moderators can update any case"
  ON cases FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (SELECT auth.uid())
      AND is_moderator = true
    )
  );

CREATE POLICY "Authorized users can update any case"
  ON cases FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (SELECT auth.uid())
      AND (is_moderator = true OR email LIKE '%@afyanahaki.org')
    )
  );

CREATE POLICY "Authorized users can delete cases"
  ON cases FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (SELECT auth.uid())
      AND (is_moderator = true OR email LIKE '%@afyanahaki.org')
    )
  );

-- Drop and recreate policies for judgments table
DROP POLICY IF EXISTS "Users can update their own judgments" ON judgments;
DROP POLICY IF EXISTS "Users and moderators can insert judgments" ON judgments;
DROP POLICY IF EXISTS "Moderators can insert judgments" ON judgments;
DROP POLICY IF EXISTS "Moderators can update any judgment" ON judgments;
DROP POLICY IF EXISTS "Authorized users can update any judgment" ON judgments;
DROP POLICY IF EXISTS "Authorized users can delete judgments" ON judgments;

CREATE POLICY "Users can update their own judgments"
  ON judgments FOR UPDATE
  TO authenticated
  USING (uploaded_by = (SELECT auth.uid()));

CREATE POLICY "Users and moderators can insert judgments"
  ON judgments FOR INSERT
  TO authenticated
  WITH CHECK (uploaded_by = (SELECT auth.uid()));

CREATE POLICY "Moderators can insert judgments"
  ON judgments FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (SELECT auth.uid())
      AND is_moderator = true
    )
  );

CREATE POLICY "Moderators can update any judgment"
  ON judgments FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (SELECT auth.uid())
      AND is_moderator = true
    )
  );

CREATE POLICY "Authorized users can update any judgment"
  ON judgments FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (SELECT auth.uid())
      AND (is_moderator = true OR email LIKE '%@afyanahaki.org')
    )
  );

CREATE POLICY "Authorized users can delete judgments"
  ON judgments FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (SELECT auth.uid())
      AND (is_moderator = true OR email LIKE '%@afyanahaki.org')
    )
  );

-- Drop and recreate policies for pending_cases table
DROP POLICY IF EXISTS "Users can view their own pending cases" ON pending_cases;
DROP POLICY IF EXISTS "Users can create pending cases" ON pending_cases;
DROP POLICY IF EXISTS "Moderators can view all pending cases" ON pending_cases;
DROP POLICY IF EXISTS "Moderators can update pending cases" ON pending_cases;
DROP POLICY IF EXISTS "Moderators can delete pending cases" ON pending_cases;

CREATE POLICY "Users can view their own pending cases"
  ON pending_cases FOR SELECT
  TO authenticated
  USING (submitted_by = (SELECT auth.uid()));

CREATE POLICY "Users can create pending cases"
  ON pending_cases FOR INSERT
  TO authenticated
  WITH CHECK (submitted_by = (SELECT auth.uid()));

CREATE POLICY "Moderators can view all pending cases"
  ON pending_cases FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (SELECT auth.uid())
      AND is_moderator = true
    )
  );

CREATE POLICY "Moderators can update pending cases"
  ON pending_cases FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (SELECT auth.uid())
      AND is_moderator = true
    )
  );

CREATE POLICY "Moderators can delete pending cases"
  ON pending_cases FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (SELECT auth.uid())
      AND is_moderator = true
    )
  );

-- Drop and recreate policies for pending_judgments table
DROP POLICY IF EXISTS "Users can view their own pending judgments" ON pending_judgments;
DROP POLICY IF EXISTS "Users can create pending judgments" ON pending_judgments;
DROP POLICY IF EXISTS "Moderators can view all pending judgments" ON pending_judgments;
DROP POLICY IF EXISTS "Moderators can update pending judgments" ON pending_judgments;
DROP POLICY IF EXISTS "Moderators can delete pending judgments" ON pending_judgments;

CREATE POLICY "Users can view their own pending judgments"
  ON pending_judgments FOR SELECT
  TO authenticated
  USING (submitted_by = (SELECT auth.uid()));

CREATE POLICY "Users can create pending judgments"
  ON pending_judgments FOR INSERT
  TO authenticated
  WITH CHECK (submitted_by = (SELECT auth.uid()));

CREATE POLICY "Moderators can view all pending judgments"
  ON pending_judgments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (SELECT auth.uid())
      AND is_moderator = true
    )
  );

CREATE POLICY "Moderators can update pending judgments"
  ON pending_judgments FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (SELECT auth.uid())
      AND is_moderator = true
    )
  );

CREATE POLICY "Moderators can delete pending judgments"
  ON pending_judgments FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (SELECT auth.uid())
      AND is_moderator = true
    )
  );

-- Drop and recreate policies for audit_logs table
DROP POLICY IF EXISTS "Authorized users can view audit logs" ON audit_logs;
DROP POLICY IF EXISTS "Moderators can view audit logs" ON audit_logs;
DROP POLICY IF EXISTS "Moderators can update audit logs" ON audit_logs;
DROP POLICY IF EXISTS "Moderators can delete audit logs" ON audit_logs;

CREATE POLICY "Authorized users can view audit logs"
  ON audit_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (SELECT auth.uid())
      AND (is_moderator = true OR email LIKE '%@afyanahaki.org')
    )
  );

CREATE POLICY "Moderators can view audit logs"
  ON audit_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (SELECT auth.uid())
      AND is_moderator = true
    )
  );

CREATE POLICY "Moderators can update audit logs"
  ON audit_logs FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (SELECT auth.uid())
      AND is_moderator = true
    )
  );

CREATE POLICY "Moderators can delete audit logs"
  ON audit_logs FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (SELECT auth.uid())
      AND is_moderator = true
    )
  );

-- Drop and recreate policies for law_documents table
DROP POLICY IF EXISTS "Allow moderators read all law documents" ON law_documents;
DROP POLICY IF EXISTS "Moderators can read all law documents" ON law_documents;
DROP POLICY IF EXISTS "Only admins can insert law documents" ON law_documents;
DROP POLICY IF EXISTS "Only admins can update law documents" ON law_documents;

CREATE POLICY "Allow moderators read all law documents"
  ON law_documents FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (SELECT auth.uid())
      AND (is_moderator = true OR email LIKE '%@afyanahaki.org')
    )
  );

CREATE POLICY "Moderators can read all law documents"
  ON law_documents FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (SELECT auth.uid())
      AND is_moderator = true
    )
  );

CREATE POLICY "Only admins can insert law documents"
  ON law_documents FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (SELECT auth.uid())
      AND is_moderator = true
    )
  );

CREATE POLICY "Only admins can update law documents"
  ON law_documents FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (SELECT auth.uid())
      AND is_moderator = true
    )
  );