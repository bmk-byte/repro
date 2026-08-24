/*
  # Add Case Categories and Constraints

  1. Changes
    - Add case_categories column to cases, judgments, and pending_submissions tables
    - Add check constraints to validate categories
    - Create GIN indexes for better query performance
    
  2. Security
    - Maintain existing RLS policies
*/

-- Add case_categories column to tables if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'cases' AND column_name = 'case_categories'
  ) THEN
    ALTER TABLE cases ADD COLUMN case_categories text[] DEFAULT '{}';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'judgments' AND column_name = 'case_categories'
  ) THEN
    ALTER TABLE judgments ADD COLUMN case_categories text[] DEFAULT '{}';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'pending_submissions' AND column_name = 'case_categories'
  ) THEN
    ALTER TABLE pending_submissions ADD COLUMN case_categories text[] DEFAULT '{}';
  END IF;
END $$;

-- Drop existing constraints if they exist
DO $$ 
BEGIN
  ALTER TABLE cases DROP CONSTRAINT IF EXISTS cases_categories_check;
  ALTER TABLE judgments DROP CONSTRAINT IF EXISTS judgments_categories_check;
  ALTER TABLE pending_submissions DROP CONSTRAINT IF EXISTS pending_submissions_categories_check;
END $$;

-- Add check constraints to validate categories
ALTER TABLE cases
ADD CONSTRAINT cases_categories_check
CHECK (
  case_categories <@ ARRAY[
    'Access to Safe Abortion',
    'Maternal Health and Mortality',
    'Forced Sterilization',
    'Contraceptive Access and Denial',
    'Sexual and Gender-Based Violence (SGBV)',
    'Child Marriage and Early/Forced Marriage',
    'Menstrual Health and Hygiene Rights', 
    'Sexual and Reproductive Health Education',
    'Criminalization of Pregnancy Outcomes',
    'Access to Assisted Reproductive Technologies',
    'Access to Reproductive Health Services for Incarcerated Women',
    'Consent and Access for Adolescents and Minors',
    'Discrimination in Reproductive Healthcare',
    'Reproductive Rights in Conflict and Humanitarian Settings',
    'Access to Reproductive Health Services for Marginalized Groups',
    'Parental Leave and Reproductive Labor Rights',
    'Violation of Confidentiality and Privacy in Reproductive Healthcare',
    'Denial of Post-Abortion Care',
    'Reproductive Health and Environmental Justice',
    'Religious and Cultural Barriers to Reproductive Healthcare Access',
    'Other'
  ]::text[]
);

ALTER TABLE judgments
ADD CONSTRAINT judgments_categories_check
CHECK (
  case_categories <@ ARRAY[
    'Access to Safe Abortion',
    'Maternal Health and Mortality',
    'Forced Sterilization',
    'Contraceptive Access and Denial',
    'Sexual and Gender-Based Violence (SGBV)',
    'Child Marriage and Early/Forced Marriage',
    'Menstrual Health and Hygiene Rights',
    'Sexual and Reproductive Health Education',
    'Criminalization of Pregnancy Outcomes',
    'Access to Assisted Reproductive Technologies',
    'Access to Reproductive Health Services for Incarcerated Women',
    'Consent and Access for Adolescents and Minors',
    'Discrimination in Reproductive Healthcare',
    'Reproductive Rights in Conflict and Humanitarian Settings',
    'Access to Reproductive Health Services for Marginalized Groups',
    'Parental Leave and Reproductive Labor Rights',
    'Violation of Confidentiality and Privacy in Reproductive Healthcare',
    'Denial of Post-Abortion Care',
    'Reproductive Health and Environmental Justice',
    'Religious and Cultural Barriers to Reproductive Healthcare Access',
    'Other'
  ]::text[]
);

ALTER TABLE pending_submissions
ADD CONSTRAINT pending_submissions_categories_check
CHECK (
  case_categories <@ ARRAY[
    'Access to Safe Abortion',
    'Maternal Health and Mortality',
    'Forced Sterilization',
    'Contraceptive Access and Denial',
    'Sexual and Gender-Based Violence (SGBV)',
    'Child Marriage and Early/Forced Marriage',
    'Menstrual Health and Hygiene Rights',
    'Sexual and Reproductive Health Education',
    'Criminalization of Pregnancy Outcomes',
    'Access to Assisted Reproductive Technologies',
    'Access to Reproductive Health Services for Incarcerated Women',
    'Consent and Access for Adolescents and Minors',
    'Discrimination in Reproductive Healthcare',
    'Reproductive Rights in Conflict and Humanitarian Settings',
    'Access to Reproductive Health Services for Marginalized Groups',
    'Parental Leave and Reproductive Labor Rights',
    'Violation of Confidentiality and Privacy in Reproductive Healthcare',
    'Denial of Post-Abortion Care',
    'Reproductive Health and Environmental Justice',
    'Religious and Cultural Barriers to Reproductive Healthcare Access',
    'Other'
  ]::text[]
);

-- Drop existing indexes if they exist
DROP INDEX IF EXISTS cases_categories_idx;
DROP INDEX IF EXISTS judgments_categories_idx;
DROP INDEX IF EXISTS pending_submissions_categories_idx;

-- Create indexes for better query performance
CREATE INDEX cases_categories_idx ON cases USING GIN (case_categories);
CREATE INDEX judgments_categories_idx ON judgments USING GIN (case_categories);
CREATE INDEX pending_submissions_categories_idx ON pending_submissions USING GIN (case_categories);