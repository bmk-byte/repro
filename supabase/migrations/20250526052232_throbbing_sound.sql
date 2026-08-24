/*
  # Add Foreign Key Constraint for Submitter Profile

  1. Changes
    - Add foreign key constraint between pending_submissions and profiles tables
    - Update existing references to use profiles instead of auth.users
    
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
REFERENCES profiles(id);

-- Update RLS policies to use profiles table
DROP POLICY IF EXISTS "Reviewers can view all submissions" ON pending_submissions;
DROP POLICY IF EXISTS "Reviewers can update submissions" ON pending_submissions;

CREATE POLICY "Reviewers can view all submissions"
  ON pending_submissions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
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
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND email LIKE '%@afyanahaki.org'
    )
  );