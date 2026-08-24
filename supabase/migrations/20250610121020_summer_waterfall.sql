/*
  # Add RLS policies for pending_submissions table

  1. Security
    - Add policy for authenticated users to insert their own submissions
    - Add policy for authenticated users to view their own submissions
    - Add policy for moderators to view all submissions
    - Add policy for moderators to update submissions

  This migration fixes the RLS violation error when submitting cases by allowing
  authenticated users to insert records into the pending_submissions table.
*/

-- Allow authenticated users to insert their own submissions
CREATE POLICY "Users can insert their own submissions"
  ON pending_submissions
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = submitted_by);

-- Allow authenticated users to view their own submissions
CREATE POLICY "Users can view their own submissions"
  ON pending_submissions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = submitted_by);

-- Allow moderators to view all submissions
CREATE POLICY "Moderators can view all submissions"
  ON pending_submissions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND (profiles.is_moderator = true OR profiles.email LIKE '%@afyanahaki.org')
    )
  );

-- Allow moderators to update submissions (for status changes, etc.)
CREATE POLICY "Moderators can update submissions"
  ON pending_submissions
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND (profiles.is_moderator = true OR profiles.email LIKE '%@afyanahaki.org')
    )
  );

-- Allow moderators to delete submissions if needed
CREATE POLICY "Moderators can delete submissions"
  ON pending_submissions
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND (profiles.is_moderator = true OR profiles.email LIKE '%@afyanahaki.org')
    )
  );