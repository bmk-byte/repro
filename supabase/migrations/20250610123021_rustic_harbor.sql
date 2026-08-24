/*
  # Fix foreign key relationship for pending_submissions

  1. Changes
    - Drop existing foreign key constraint from pending_submissions.submitted_by to users(id)
    - Add new foreign key constraint from pending_submissions.submitted_by to profiles(id)
    - This allows the moderation page to properly join pending_submissions with profiles

  2. Security
    - No changes to RLS policies needed
    - Maintains existing data integrity
*/

-- Drop the existing foreign key constraint that references users table
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'pending_submissions_submitted_by_fkey' 
    AND table_name = 'pending_submissions'
  ) THEN
    ALTER TABLE pending_submissions DROP CONSTRAINT pending_submissions_submitted_by_fkey;
  END IF;
END $$;

-- Add the correct foreign key constraint that references profiles table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'pending_submissions_submitted_by_profiles_fkey' 
    AND table_name = 'pending_submissions'
  ) THEN
    ALTER TABLE pending_submissions 
    ADD CONSTRAINT pending_submissions_submitted_by_profiles_fkey 
    FOREIGN KEY (submitted_by) REFERENCES profiles(id);
  END IF;
END $$;