/*
  # Add foreign key constraint to pending_submissions table

  1. Changes
    - Add foreign key constraint between pending_submissions.submitted_by and profiles.id
    - Drop existing foreign key to users table if it exists
    - Update RLS policies to use profiles instead of users

  2. Security
    - Maintain existing RLS policies but update references
*/

-- First, safely drop the existing foreign key if it exists
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'pending_submissions_submitted_by_fkey'
    AND table_name = 'pending_submissions'
  ) THEN
    ALTER TABLE pending_submissions DROP CONSTRAINT pending_submissions_submitted_by_fkey;
  END IF;
END $$;

-- Add the new foreign key constraint
ALTER TABLE pending_submissions
ADD CONSTRAINT pending_submissions_submitted_by_fkey
FOREIGN KEY (submitted_by) REFERENCES profiles(id);

-- Update RLS policies to use profiles
DROP POLICY IF EXISTS "Users can create submissions" ON pending_submissions;
DROP POLICY IF EXISTS "Users can view their own submissions" ON pending_submissions;

CREATE POLICY "Users can create submissions"
ON pending_submissions
FOR INSERT
TO authenticated
WITH CHECK (submitted_by = auth.uid());

CREATE POLICY "Users can view their own submissions"
ON pending_submissions
FOR SELECT
TO authenticated
USING (submitted_by = auth.uid());