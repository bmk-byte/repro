/*
  # Add court column to pending_submissions table

  1. Changes
    - Add `court` column to `pending_submissions` table to match the field used in SubmitCaseForm
    - The column is nullable to maintain compatibility with existing records

  2. Notes
    - This resolves the error "record 'new' has no field 'court'" during moderation updates
    - The court field is used to store court information for case submissions
*/

-- Add court column to pending_submissions table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pending_submissions' AND column_name = 'court'
  ) THEN
    ALTER TABLE pending_submissions ADD COLUMN court text;
  END IF;
END $$;