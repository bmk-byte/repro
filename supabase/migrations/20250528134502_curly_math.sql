/*
  # Fix RLS Policies to Use Profiles Table

  1. Changes
    - Update RLS policies for law_documents, cases, judgments, and pending_submissions
    - Change policies to use profiles.is_moderator instead of directly querying auth.users
    - Fix "permission denied for table users" error
    
  2. Security
    - Maintain existing security model
    - Ensure consistent access control across tables
*/

-- Update RLS policies for law_documents
DROP POLICY IF EXISTS "Moderators can read all law documents" ON law_documents;

CREATE POLICY "Moderators can read all law documents"
  ON law_documents
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_moderator = true
    )
  );

-- Update RLS policies for cases
DROP POLICY IF EXISTS "Authorized users can delete cases" ON cases;
DROP POLICY IF EXISTS "Authorized users can update any case" ON cases;

CREATE POLICY "Authorized users can delete cases"
  ON cases
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_moderator = true
    )
  );

CREATE POLICY "Authorized users can update any case"
  ON cases
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_moderator = true
    )
  );

-- Update RLS policies for judgments
DROP POLICY IF EXISTS "Authorized users can delete judgments" ON judgments;
DROP POLICY IF EXISTS "Authorized users can update any judgment" ON judgments;

CREATE POLICY "Authorized users can delete judgments"
  ON judgments
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_moderator = true
    )
  );

CREATE POLICY "Authorized users can update any judgment"
  ON judgments
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_moderator = true
    )
  );

-- Update RLS policies for pending_submissions
DROP POLICY IF EXISTS "Reviewers can view all submissions" ON pending_submissions;
DROP POLICY IF EXISTS "Reviewers can update submissions" ON pending_submissions;

CREATE POLICY "Reviewers can view all submissions"
  ON pending_submissions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_moderator = true
    )
  );

CREATE POLICY "Reviewers can update submissions"
  ON pending_submissions
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_moderator = true
    )
  );

-- Add a fallback policy for moderators based on email domain
-- This ensures backward compatibility with existing code that checks for @afyanahaki.org emails
CREATE OR REPLACE FUNCTION is_moderator()
RETURNS boolean AS $$
BEGIN
  RETURN (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_moderator = true
    ) OR (
      auth.jwt() ->> 'email' LIKE '%@afyanahaki.org'
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update routing_audit_log policies
DROP POLICY IF EXISTS "Moderators can view audit log" ON routing_audit_log;

CREATE POLICY "Moderators can view audit log"
  ON routing_audit_log
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_moderator = true
    )
  );

-- Update audit_logs policies
DROP POLICY IF EXISTS "Authorized users can view audit logs" ON audit_logs;

CREATE POLICY "Authorized users can view audit logs"
  ON audit_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_moderator = true
    )
  );