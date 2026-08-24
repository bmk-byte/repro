/*
  # Add missing judgment columns to pending_submissions table

  1. New Columns
    - `case_number_judgment` (text) - Case number for judgment submissions
    - `judges_judgment` (text) - Judges information for judgment submissions  
    - `judgment_date_judgment` (date) - Date of judgment for judgment submissions
    - `language_judgment` (text) - Language of judgment document
    - `type_judgment` (text) - Type of judgment (Final Judgment, Interim Order, etc.)
    - `flynote_judgment` (text) - Flynote/headnote for judgment submissions
    - `court_judgment` (text) - Court information for judgment submissions

  2. Constraints
    - Add check constraints for language_judgment and type_judgment to match judgments table
    
  This migration adds the missing judgment-specific columns that the SubmitJudgmentForm 
  is trying to insert into the pending_submissions table.
*/

-- Add missing judgment-specific columns to pending_submissions table
DO $$
BEGIN
  -- Add case_number_judgment column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pending_submissions' AND column_name = 'case_number_judgment'
  ) THEN
    ALTER TABLE pending_submissions ADD COLUMN case_number_judgment text;
  END IF;

  -- Add judges_judgment column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pending_submissions' AND column_name = 'judges_judgment'
  ) THEN
    ALTER TABLE pending_submissions ADD COLUMN judges_judgment text;
  END IF;

  -- Add judgment_date_judgment column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pending_submissions' AND column_name = 'judgment_date_judgment'
  ) THEN
    ALTER TABLE pending_submissions ADD COLUMN judgment_date_judgment date;
  END IF;

  -- Add language_judgment column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pending_submissions' AND column_name = 'language_judgment'
  ) THEN
    ALTER TABLE pending_submissions ADD COLUMN language_judgment text;
  END IF;

  -- Add type_judgment column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pending_submissions' AND column_name = 'type_judgment'
  ) THEN
    ALTER TABLE pending_submissions ADD COLUMN type_judgment text;
  END IF;

  -- Add flynote_judgment column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pending_submissions' AND column_name = 'flynote_judgment'
  ) THEN
    ALTER TABLE pending_submissions ADD COLUMN flynote_judgment text;
  END IF;

  -- Add court_judgment column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pending_submissions' AND column_name = 'court_judgment'
  ) THEN
    ALTER TABLE pending_submissions ADD COLUMN court_judgment text;
  END IF;
END $$;

-- Add check constraints for language_judgment to match judgments table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints 
    WHERE constraint_name = 'pending_submissions_language_judgment_check'
  ) THEN
    ALTER TABLE pending_submissions 
    ADD CONSTRAINT pending_submissions_language_judgment_check 
    CHECK (language_judgment IS NULL OR language_judgment = ANY (ARRAY['English'::text, 'French'::text, 'Portuguese'::text, 'Swahili'::text]));
  END IF;
END $$;

-- Add check constraints for type_judgment to match judgments table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints 
    WHERE constraint_name = 'pending_submissions_type_judgment_check'
  ) THEN
    ALTER TABLE pending_submissions 
    ADD CONSTRAINT pending_submissions_type_judgment_check 
    CHECK (type_judgment IS NULL OR type_judgment = ANY (ARRAY['Final Judgment'::text, 'Interim Order'::text, 'Ruling'::text, 'Consent Judgment'::text, 'Consent'::text, 'Default Judgment'::text, 'Default'::text]));
  END IF;
END $$;