/*
  # Fix Pending Submissions Query

  1. Changes
    - Drop existing foreign key constraint
    - Add new foreign key constraint to auth.users
    - Update RLS policies
    
  2. Security
    - Maintain existing RLS policies
*/

-- Drop existing foreign key if it exists
ALTER TABLE pending_submissions
DROP CONSTRAINT IF EXISTS pending_submissions_submitted_by_fkey;

-- Add new foreign key constraint
ALTER TABLE pending_submissions
ADD CONSTRAINT pending_submissions_submitted_by_fkey
FOREIGN KEY (submitted_by)
REFERENCES auth.users(id);

-- Update RLS policies
DROP POLICY IF EXISTS "Reviewers can view all submissions" ON pending_submissions;
DROP POLICY IF EXISTS "Reviewers can update submissions" ON pending_submissions;

CREATE POLICY "Reviewers can view all submissions"
  ON pending_submissions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid()
      AND email LIKE '%@afyanahaki.org'
    )
  );

CREATE POLICY "Reviewers can update submissions"
  ON pending_submissions
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid()
      AND email LIKE '%@afyanahaki.org'
    )
  );