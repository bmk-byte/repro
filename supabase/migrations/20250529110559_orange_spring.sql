/*
  # Add case outcome column to pending submissions

  1. Changes
    - Add `case_outcome` column to `pending_submissions` table
      - Type: text
      - Nullable: true (to maintain compatibility with existing records)

  2. Reason
    - Required for storing case outcome information in submissions
    - Fixes schema mismatch error in form submission
*/

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'pending_submissions' 
    AND column_name = 'case_outcome'
  ) THEN
    ALTER TABLE pending_submissions 
    ADD COLUMN case_outcome text;
  END IF;
END $$;