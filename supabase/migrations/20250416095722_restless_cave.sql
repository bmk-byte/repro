/*
  # Add Case Summary Column

  1. Changes
    - Add case_summary column to cases table for storing case overviews
    
  2. Security
    - Maintain existing RLS policies
*/

-- Add case_summary column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'cases' AND column_name = 'case_summary'
  ) THEN
    ALTER TABLE cases
    ADD COLUMN case_summary text;
  END IF;
END $$;