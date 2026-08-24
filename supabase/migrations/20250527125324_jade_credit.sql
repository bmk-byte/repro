/*
  # Fix Foreign Key Relationship for Pending Submissions

  1. Changes
    - Drop existing foreign key constraint
    - Create new foreign key constraint to auth.users
    - Update RLS policies to use auth.users
    
  2. Security
    - Maintain existing RLS policies
    - Update policies to use auth.users for email checks
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
DROP POLICY IF EXISTS "Users can view their own submissions" ON pending_submissions;
DROP POLICY IF EXISTS "Users can create submissions" ON pending_submissions;
DROP POLICY IF EXISTS "Reviewers can view all submissions" ON pending_submissions;
DROP POLICY IF EXISTS "Reviewers can update submissions" ON pending_submissions;

-- Recreate policies with correct references
CREATE POLICY "Users can view their own submissions"
  ON pending_submissions
  FOR SELECT
  TO authenticated
  USING (submitted_by = auth.uid());

CREATE POLICY "Users can create submissions"
  ON pending_submissions
  FOR INSERT
  TO authenticated
  WITH CHECK (submitted_by = auth.uid());

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