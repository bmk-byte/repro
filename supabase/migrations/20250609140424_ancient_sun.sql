/*
  # Add court column to pending_submissions table

  1. Changes
    - Add `court` column to `pending_submissions` table
    - Column type: text (nullable)
    - This allows storing court information for case submissions

  2. Notes
    - This resolves the error where the form tries to insert court data
    - Column is nullable to maintain compatibility with existing records
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pending_submissions' AND column_name = 'court'
  ) THEN
    ALTER TABLE pending_submissions ADD COLUMN court text;
  END IF;
END $$;