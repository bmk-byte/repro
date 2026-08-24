/*
  # Add Foreign Key from pending_submissions.country_id to countries.id

  1. Changes
    - Add foreign key constraint between pending_submissions.country_id and countries.id
    - This enables proper joins between these tables in queries
    
  2. Security
    - Maintain existing RLS policies
*/

-- Drop the existing foreign key constraint if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'pending_submissions_country_id_fkey' 
    AND table_name = 'pending_submissions'
  ) THEN
    ALTER TABLE pending_submissions DROP CONSTRAINT pending_submissions_country_id_fkey;
  END IF;
END $$;

-- Add the foreign key constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'pending_submissions_country_id_fkey' 
    AND table_name = 'pending_submissions'
  ) THEN
    ALTER TABLE pending_submissions 
    ADD CONSTRAINT pending_submissions_country_id_fkey 
    FOREIGN KEY (country_id) REFERENCES countries(id);
  END IF;
END $$;

-- Create an index on country_id for better query performance
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'pending_submissions_country_id_idx'
  ) THEN
    CREATE INDEX pending_submissions_country_id_idx ON pending_submissions(country_id);
  END IF;
END $$;