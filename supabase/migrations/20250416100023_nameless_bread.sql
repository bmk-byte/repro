/*
  # Add Court Column to Cases Table

  1. Changes
    - Add court column to cases table for storing court information
    
  2. Security
    - Maintain existing RLS policies
*/

-- Add court column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'cases' AND column_name = 'court'
  ) THEN
    ALTER TABLE cases
    ADD COLUMN court text;
  END IF;
END $$;