/*
  # Add Case Categories Column

  1. Changes
    - Add case_categories array column to cases table
    - Add case_categories array column to judgments table
    - Add case_categories array column to pending_submissions table
    
  2. Security
    - Maintain existing RLS policies
*/

-- Add case_categories column to cases table
ALTER TABLE cases
ADD COLUMN IF NOT EXISTS case_categories text[] DEFAULT '{}';

-- Add case_categories column to judgments table
ALTER TABLE judgments
ADD COLUMN IF NOT EXISTS case_categories text[] DEFAULT '{}';

-- Add case_categories column to pending_submissions table
ALTER TABLE pending_submissions
ADD COLUMN IF NOT EXISTS case_categories text[] DEFAULT '{}';

-- Add check constraint to validate categories
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

-- Add same constraint to judgments table
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

-- Add same constraint to pending_submissions table
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

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS cases_categories_idx ON cases USING GIN (case_categories);
CREATE INDEX IF NOT EXISTS judgments_categories_idx ON judgments USING GIN (case_categories);
CREATE INDEX IF NOT EXISTS pending_submissions_categories_idx ON pending_submissions USING GIN (case_categories);