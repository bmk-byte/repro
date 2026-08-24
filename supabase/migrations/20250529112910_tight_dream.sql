-- Drop existing RLS policies for pending_submissions
DROP POLICY IF EXISTS "Reviewers can view all submissions" ON pending_submissions;
DROP POLICY IF EXISTS "Reviewers can update submissions" ON pending_submissions;

-- Create new policies that check both is_moderator flag and email domain
CREATE POLICY "Reviewers can view all submissions"
  ON pending_submissions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND (
        profiles.is_moderator = true OR
        profiles.email LIKE '%@afyanahaki.org'
      )
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
      AND (
        profiles.is_moderator = true OR
        profiles.email LIKE '%@afyanahaki.org'
      )
    )
  );

-- Add a policy to allow moderators to insert submissions
CREATE POLICY "Moderators can insert submissions"
  ON pending_submissions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = submitted_by OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND (
        profiles.is_moderator = true OR
        profiles.email LIKE '%@afyanahaki.org'
      )
    )
  );

-- Update routing_audit_log policies to be more permissive
DROP POLICY IF EXISTS "Moderators can view audit log" ON routing_audit_log;

CREATE POLICY "Moderators can view audit log"
  ON routing_audit_log
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND (
        profiles.is_moderator = true OR
        profiles.email LIKE '%@afyanahaki.org'
      )
    )
  );

-- Create a function to check if a user is a moderator
CREATE OR REPLACE FUNCTION is_moderator()
RETURNS boolean AS $$
BEGIN
  RETURN (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND (
        profiles.is_moderator = true OR
        profiles.email LIKE '%@afyanahaki.org'
      )
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;