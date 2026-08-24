/*
  # Fix case_categories column in pending_submissions table

  1. Changes
    - Ensure case_categories column exists in pending_submissions table
    - Set proper data type as text array
    - Add default value as empty array
    - Update constraint to match the expected categories

  2. Security
    - No changes to existing RLS policies
*/

-- Ensure the case_categories column exists with proper configuration
DO $$
BEGIN
  -- Check if the column exists, if not add it
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pending_submissions' AND column_name = 'case_categories'
  ) THEN
    ALTER TABLE pending_submissions ADD COLUMN case_categories text[] DEFAULT '{}';
  END IF;

  -- Ensure the column has the correct default value
  ALTER TABLE pending_submissions ALTER COLUMN case_categories SET DEFAULT '{}';
  
  -- Ensure the column is nullable (it should be)
  ALTER TABLE pending_submissions ALTER COLUMN case_categories DROP NOT NULL;
END $$;

-- Update the constraint to ensure valid categories
DO $$
BEGIN
  -- Drop existing constraint if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_name = 'pending_submissions' 
    AND constraint_name = 'pending_submissions_categories_check'
  ) THEN
    ALTER TABLE pending_submissions DROP CONSTRAINT pending_submissions_categories_check;
  END IF;

  -- Add the updated constraint
  ALTER TABLE pending_submissions ADD CONSTRAINT pending_submissions_categories_check 
  CHECK ((case_categories <@ ARRAY[
    'Access to Safe Abortion'::text, 
    'Maternal Health and Mortality'::text, 
    'Forced Sterilization'::text, 
    'Contraceptive Access and Denial'::text, 
    'Sexual and Gender-Based Violence (SGBV)'::text, 
    'Child Marriage and Early/Forced Marriage'::text, 
    'Menstrual Health and Hygiene Rights'::text, 
    'Sexual and Reproductive Health Education'::text, 
    'Criminalization of Pregnancy Outcomes'::text, 
    'Access to Assisted Reproductive Technologies'::text, 
    'Access to Reproductive Health Services for Incarcerated Women'::text, 
    'Consent and Access for Adolescents and Minors'::text, 
    'Discrimination in Reproductive Healthcare'::text, 
    'Reproductive Rights in Conflict and Humanitarian Settings'::text, 
    'Access to Reproductive Health Services for Marginalized Groups'::text, 
    'Parental Leave and Reproductive Labor Rights'::text, 
    'Violation of Confidentiality and Privacy in Reproductive Healthcare'::text, 
    'Denial of Post-Abortion Care'::text, 
    'Reproductive Health and Environmental Justice'::text, 
    'Religious and Cultural Barriers to Reproductive Healthcare Access'::text, 
    'Other'::text
  ]));
END $$;

-- Create index for better performance on case_categories queries if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'pending_submissions' 
    AND indexname = 'pending_submissions_categories_idx'
  ) THEN
    CREATE INDEX pending_submissions_categories_idx ON pending_submissions USING gin (case_categories);
  END IF;
END $$;