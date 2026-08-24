/*
  # Create pending submission tables

  1. New Tables
    - `pending_cases`
      - `id` (uuid, primary key)
      - `title` (text, required)
      - `summary` (text)
      - `document_url` (text)
      - `submitted_by` (uuid, foreign key to profiles)
      - `country_id` (uuid, foreign key to countries)
      - `status` (text, default 'pending')
      - `submission_date` (timestamptz, default now())
      - `feedback` (text)
      - All case-specific fields from the form
      - `created_at` and `updated_at` timestamps

    - `pending_judgments`
      - `id` (uuid, primary key)
      - `title` (text, required)
      - `summary` (text)
      - `document_url` (text)
      - `submitted_by` (uuid, foreign key to profiles)
      - `country_id` (uuid, foreign key to countries)
      - `status` (text, default 'pending')
      - `submission_date` (timestamptz, default now())
      - `feedback` (text)
      - All judgment-specific fields from the form
      - `created_at` and `updated_at` timestamps

  2. Security
    - Enable RLS on both tables
    - Add policies for users to create and view their own submissions
    - Add policies for moderators to view and update all submissions

  3. Indexes
    - Add indexes for common query patterns
    - Add unique constraints where appropriate
*/

-- Create pending_cases table if it doesn't exist
CREATE TABLE IF NOT EXISTS pending_cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  summary text,
  document_url text,
  submitted_by uuid,
  submission_date timestamptz DEFAULT now(),
  status text DEFAULT 'pending' NOT NULL,
  feedback text,
  country_id uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Case-specific fields
  tracking_period text,
  programme text,
  partner text,
  nature_of_case text,
  action_taken text,
  action_timeframe text,
  next_steps text,
  court text,
  case_outcome text,
  timeline_status text,
  litigants text[],
  defending_institutions text[],
  judicial_body_type text,
  judicial_body text,
  regional_appeals boolean DEFAULT false,
  regional_bodies text[],
  legal_framework_type text,
  domestic_laws text[],
  international_laws text[],
  protocols text[],
  case_impact text,
  case_categories text[] DEFAULT '{}'::text[]
);

-- Create pending_judgments table if it doesn't exist
CREATE TABLE IF NOT EXISTS pending_judgments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  summary text,
  document_url text,
  submitted_by uuid,
  submission_date timestamptz DEFAULT now(),
  status text DEFAULT 'pending' NOT NULL,
  feedback text,
  country_id uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Judgment-specific fields
  citation text,
  media_neutral_citation text,
  court_judgment text,
  case_number_judgment text,
  judges_judgment text,
  judgment_date_judgment date,
  language_judgment text,
  type_judgment text,
  flynote_judgment text,
  timeline_status text,
  litigants text[],
  defending_institutions text[],
  judicial_body_type text,
  judicial_body text,
  regional_appeals boolean DEFAULT false,
  regional_bodies text[],
  legal_framework_type text,
  domestic_laws text[],
  international_laws text[],
  protocols text[],
  case_impact text,
  case_categories text[] DEFAULT '{}'::text[]
);

-- Add foreign key constraints
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'pending_cases_submitted_by_fkey'
  ) THEN
    ALTER TABLE pending_cases ADD CONSTRAINT pending_cases_submitted_by_fkey 
    FOREIGN KEY (submitted_by) REFERENCES profiles(id);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'pending_cases_country_id_fkey'
  ) THEN
    ALTER TABLE pending_cases ADD CONSTRAINT pending_cases_country_id_fkey 
    FOREIGN KEY (country_id) REFERENCES countries(id);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'pending_judgments_submitted_by_fkey'
  ) THEN
    ALTER TABLE pending_judgments ADD CONSTRAINT pending_judgments_submitted_by_fkey 
    FOREIGN KEY (submitted_by) REFERENCES profiles(id);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'pending_judgments_country_id_fkey'
  ) THEN
    ALTER TABLE pending_judgments ADD CONSTRAINT pending_judgments_country_id_fkey 
    FOREIGN KEY (country_id) REFERENCES countries(id);
  END IF;
END $$;

-- Add check constraints
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints 
    WHERE constraint_name = 'pending_cases_status_check'
  ) THEN
    ALTER TABLE pending_cases ADD CONSTRAINT pending_cases_status_check 
    CHECK (status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text, 'failed'::text]));
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints 
    WHERE constraint_name = 'pending_judgments_status_check'
  ) THEN
    ALTER TABLE pending_judgments ADD CONSTRAINT pending_judgments_status_check 
    CHECK (status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text, 'failed'::text]));
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints 
    WHERE constraint_name = 'pending_cases_case_categories_check'
  ) THEN
    ALTER TABLE pending_cases ADD CONSTRAINT pending_cases_case_categories_check 
    CHECK (case_categories <@ ARRAY['Access to Safe Abortion'::text, 'Maternal Health and Mortality'::text, 'Forced Sterilization'::text, 'Contraceptive Access and Denial'::text, 'Sexual and Gender-Based Violence (SGBV)'::text, 'Child Marriage and Early/Forced Marriage'::text, 'Menstrual Health and Hygiene Rights'::text, 'Sexual and Reproductive Health Education'::text, 'Criminalization of Pregnancy Outcomes'::text, 'Access to Assisted Reproductive Technologies'::text, 'Access to Reproductive Health Services for Incarcerated Women'::text, 'Consent and Access for Adolescents and Minors'::text, 'Discrimination in Reproductive Healthcare'::text, 'Reproductive Rights in Conflict and Humanitarian Settings'::text, 'Access to Reproductive Health Services for Marginalized Groups'::text, 'Parental Leave and Reproductive Labor Rights'::text, 'Violation of Confidentiality and Privacy in Reproductive Healthcare'::text, 'Denial of Post-Abortion Care'::text, 'Reproductive Health and Environmental Justice'::text, 'Religious and Cultural Barriers to Reproductive Healthcare Access'::text, 'Other'::text]);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints 
    WHERE constraint_name = 'pending_judgments_case_categories_check'
  ) THEN
    ALTER TABLE pending_judgments ADD CONSTRAINT pending_judgments_case_categories_check 
    CHECK (case_categories <@ ARRAY['Access to Safe Abortion'::text, 'Maternal Health and Mortality'::text, 'Forced Sterilization'::text, 'Contraceptive Access and Denial'::text, 'Sexual and Gender-Based Violence (SGBV)'::text, 'Child Marriage and Early/Forced Marriage'::text, 'Menstrual Health and Hygiene Rights'::text, 'Sexual and Reproductive Health Education'::text, 'Criminalization of Pregnancy Outcomes'::text, 'Access to Assisted Reproductive Technologies'::text, 'Access to Reproductive Health Services for Incarcerated Women'::text, 'Consent and Access for Adolescents and Minors'::text, 'Discrimination in Reproductive Healthcare'::text, 'Reproductive Rights in Conflict and Humanitarian Settings'::text, 'Access to Reproductive Health Services for Marginalized Groups'::text, 'Parental Leave and Reproductive Labor Rights'::text, 'Violation of Confidentiality and Privacy in Reproductive Healthcare'::text, 'Denial of Post-Abortion Care'::text, 'Reproductive Health and Environmental Justice'::text, 'Religious and Cultural Barriers to Reproductive Healthcare Access'::text, 'Other'::text]);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints 
    WHERE constraint_name = 'pending_cases_timeline_status_check'
  ) THEN
    ALTER TABLE pending_cases ADD CONSTRAINT pending_cases_timeline_status_check 
    CHECK (((timeline_status IS NULL) OR (timeline_status = ANY (ARRAY['filed'::text, 'ongoing'::text, 'resolved'::text, 'dismissed'::text]))));
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints 
    WHERE constraint_name = 'pending_judgments_timeline_status_check'
  ) THEN
    ALTER TABLE pending_judgments ADD CONSTRAINT pending_judgments_timeline_status_check 
    CHECK (((timeline_status IS NULL) OR (timeline_status = ANY (ARRAY['filed'::text, 'ongoing'::text, 'resolved'::text, 'dismissed'::text]))));
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints 
    WHERE constraint_name = 'pending_cases_judicial_body_type_check'
  ) THEN
    ALTER TABLE pending_cases ADD CONSTRAINT pending_cases_judicial_body_type_check 
    CHECK (((judicial_body_type IS NULL) OR (judicial_body_type = ANY (ARRAY['National Court'::text, 'Regional Court'::text]))));
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints 
    WHERE constraint_name = 'pending_judgments_judicial_body_type_check'
  ) THEN
    ALTER TABLE pending_judgments ADD CONSTRAINT pending_judgments_judicial_body_type_check 
    CHECK (((judicial_body_type IS NULL) OR (judicial_body_type = ANY (ARRAY['National Court'::text, 'Regional Court'::text]))));
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints 
    WHERE constraint_name = 'pending_cases_legal_framework_type_check'
  ) THEN
    ALTER TABLE pending_cases ADD CONSTRAINT pending_cases_legal_framework_type_check 
    CHECK (((legal_framework_type IS NULL) OR (legal_framework_type = ANY (ARRAY['Domestic Law'::text, 'International Law'::text, 'Both'::text]))));
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints 
    WHERE constraint_name = 'pending_judgments_legal_framework_type_check'
  ) THEN
    ALTER TABLE pending_judgments ADD CONSTRAINT pending_judgments_legal_framework_type_check 
    CHECK (((legal_framework_type IS NULL) OR (legal_framework_type = ANY (ARRAY['Domestic Law'::text, 'International Law'::text, 'Both'::text]))));
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints 
    WHERE constraint_name = 'pending_judgments_language_judgment_check'
  ) THEN
    ALTER TABLE pending_judgments ADD CONSTRAINT pending_judgments_language_judgment_check 
    CHECK (((language_judgment IS NULL) OR (language_judgment = ANY (ARRAY['English'::text, 'French'::text, 'Portuguese'::text, 'Swahili'::text]))));
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints 
    WHERE constraint_name = 'pending_judgments_type_judgment_check'
  ) THEN
    ALTER TABLE pending_judgments ADD CONSTRAINT pending_judgments_type_judgment_check 
    CHECK (((type_judgment IS NULL) OR (type_judgment = ANY (ARRAY['Final Judgment'::text, 'Interim Order'::text, 'Ruling'::text, 'Consent Judgment'::text, 'Consent'::text, 'Default Judgment'::text, 'Default'::text]))));
  END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS pending_cases_submitted_by_idx ON pending_cases (submitted_by);
CREATE INDEX IF NOT EXISTS pending_cases_country_id_idx ON pending_cases (country_id);
CREATE INDEX IF NOT EXISTS pending_cases_status_idx ON pending_cases (status);
CREATE INDEX IF NOT EXISTS pending_cases_categories_idx ON pending_cases USING gin (case_categories);

CREATE INDEX IF NOT EXISTS pending_judgments_submitted_by_idx ON pending_judgments (submitted_by);
CREATE INDEX IF NOT EXISTS pending_judgments_country_id_idx ON pending_judgments (country_id);
CREATE INDEX IF NOT EXISTS pending_judgments_status_idx ON pending_judgments (status);
CREATE INDEX IF NOT EXISTS pending_judgments_categories_idx ON pending_judgments USING gin (case_categories);

-- Add unique constraints to prevent duplicate submissions
CREATE UNIQUE INDEX IF NOT EXISTS pending_cases_unique_submission 
ON pending_cases (title, country_id, nature_of_case);

CREATE UNIQUE INDEX IF NOT EXISTS pending_judgments_unique_submission 
ON pending_judgments (citation, country_id, court_judgment, judgment_date_judgment);

-- Enable Row Level Security
ALTER TABLE pending_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE pending_judgments ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for pending_cases
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'pending_cases' AND policyname = 'Users can create pending cases'
  ) THEN
    CREATE POLICY "Users can create pending cases"
      ON pending_cases
      FOR INSERT
      TO authenticated
      WITH CHECK (submitted_by = uid());
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'pending_cases' AND policyname = 'Users can view their own pending cases'
  ) THEN
    CREATE POLICY "Users can view their own pending cases"
      ON pending_cases
      FOR SELECT
      TO authenticated
      USING (submitted_by = uid());
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'pending_cases' AND policyname = 'Moderators can view all pending cases'
  ) THEN
    CREATE POLICY "Moderators can view all pending cases"
      ON pending_cases
      FOR SELECT
      TO authenticated
      USING (EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = uid() 
        AND (profiles.is_moderator = true OR profiles.email LIKE '%@afyanahaki.org')
      ));
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'pending_cases' AND policyname = 'Moderators can update pending cases'
  ) THEN
    CREATE POLICY "Moderators can update pending cases"
      ON pending_cases
      FOR UPDATE
      TO authenticated
      USING (EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = uid() 
        AND (profiles.is_moderator = true OR profiles.email LIKE '%@afyanahaki.org')
      ));
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'pending_cases' AND policyname = 'Moderators can delete pending cases'
  ) THEN
    CREATE POLICY "Moderators can delete pending cases"
      ON pending_cases
      FOR DELETE
      TO authenticated
      USING (EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = uid() 
        AND (profiles.is_moderator = true OR profiles.email LIKE '%@afyanahaki.org')
      ));
  END IF;
END $$;

-- Create RLS policies for pending_judgments
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'pending_judgments' AND policyname = 'Users can create pending judgments'
  ) THEN
    CREATE POLICY "Users can create pending judgments"
      ON pending_judgments
      FOR INSERT
      TO authenticated
      WITH CHECK (submitted_by = uid());
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'pending_judgments' AND policyname = 'Users can view their own pending judgments'
  ) THEN
    CREATE POLICY "Users can view their own pending judgments"
      ON pending_judgments
      FOR SELECT
      TO authenticated
      USING (submitted_by = uid());
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'pending_judgments' AND policyname = 'Moderators can view all pending judgments'
  ) THEN
    CREATE POLICY "Moderators can view all pending judgments"
      ON pending_judgments
      FOR SELECT
      TO authenticated
      USING (EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = uid() 
        AND (profiles.is_moderator = true OR profiles.email LIKE '%@afyanahaki.org')
      ));
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'pending_judgments' AND policyname = 'Moderators can update pending judgments'
  ) THEN
    CREATE POLICY "Moderators can update pending judgments"
      ON pending_judgments
      FOR UPDATE
      TO authenticated
      USING (EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = uid() 
        AND (profiles.is_moderator = true OR profiles.email LIKE '%@afyanahaki.org')
      ));
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'pending_judgments' AND policyname = 'Moderators can delete pending judgments'
  ) THEN
    CREATE POLICY "Moderators can delete pending judgments"
      ON pending_judgments
      FOR DELETE
      TO authenticated
      USING (EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = uid() 
        AND (profiles.is_moderator = true OR profiles.email LIKE '%@afyanahaki.org')
      ));
  END IF;
END $$;

-- Create functions for handling approved submissions
CREATE OR REPLACE FUNCTION handle_pending_case_approval()
RETURNS TRIGGER AS $$
BEGIN
  -- Only proceed if status changed to approved
  IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
    -- Insert into cases table
    INSERT INTO cases (
      case_filed,
      case_summary,
      country_id,
      user_id,
      pdf_url,
      status,
      case_type,
      moderation_status,
      tracking_period,
      programme,
      partner,
      nature_of_case,
      action_taken,
      action_timeframe,
      next_steps,
      court,
      timeline_status,
      litigants,
      defending_institutions,
      judicial_body_type,
      judicial_body,
      regional_appeals,
      regional_bodies,
      legal_framework_type,
      domestic_laws,
      international_laws,
      protocols,
      case_impact,
      case_categories,
      case_outcome
    ) VALUES (
      NEW.title,
      NEW.summary,
      NEW.country_id,
      NEW.submitted_by,
      NEW.document_url,
      'pending',
      'litigation',
      'approved',
      NEW.tracking_period,
      NEW.programme,
      NEW.partner,
      NEW.nature_of_case,
      NEW.action_taken,
      NEW.action_timeframe,
      NEW.next_steps,
      NEW.court,
      NEW.timeline_status,
      NEW.litigants,
      NEW.defending_institutions,
      NEW.judicial_body_type,
      NEW.judicial_body,
      NEW.regional_appeals,
      NEW.regional_bodies,
      NEW.legal_framework_type,
      NEW.domestic_laws,
      NEW.international_laws,
      NEW.protocols,
      NEW.case_impact,
      NEW.case_categories,
      NEW.case_outcome
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION handle_pending_judgment_approval()
RETURNS TRIGGER AS $$
BEGIN
  -- Only proceed if status changed to approved
  IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
    -- Insert into judgments table
    INSERT INTO judgments (
      citation,
      media_neutral_citation,
      court,
      case_number,
      judges,
      judgment_date,
      language,
      type,
      flynote,
      case_summary,
      file_url,
      uploaded_by,
      country_id,
      timeline_status,
      litigants,
      defending_institutions,
      judicial_body_type,
      judicial_body,
      regional_appeals,
      regional_bodies,
      legal_framework_type,
      domestic_laws,
      international_laws,
      protocols,
      case_impact,
      case_categories
    ) VALUES (
      NEW.citation,
      NEW.media_neutral_citation,
      NEW.court_judgment,
      NEW.case_number_judgment,
      NEW.judges_judgment,
      NEW.judgment_date_judgment,
      NEW.language_judgment,
      NEW.type_judgment,
      NEW.flynote_judgment,
      NEW.summary,
      NEW.document_url,
      NEW.submitted_by,
      NEW.country_id,
      NEW.timeline_status,
      NEW.litigants,
      NEW.defending_institutions,
      NEW.judicial_body_type,
      NEW.judicial_body,
      NEW.regional_appeals,
      NEW.regional_bodies,
      NEW.legal_framework_type,
      NEW.domestic_laws,
      NEW.international_laws,
      NEW.protocols,
      NEW.case_impact,
      NEW.case_categories
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for handling approvals
DROP TRIGGER IF EXISTS handle_pending_case_approval_trigger ON pending_cases;
CREATE TRIGGER handle_pending_case_approval_trigger
  AFTER UPDATE ON pending_cases
  FOR EACH ROW
  WHEN (NEW.status = 'approved' AND OLD.status != 'approved')
  EXECUTE FUNCTION handle_pending_case_approval();

DROP TRIGGER IF EXISTS handle_pending_judgment_approval_trigger ON pending_judgments;
CREATE TRIGGER handle_pending_judgment_approval_trigger
  AFTER UPDATE ON pending_judgments
  FOR EACH ROW
  WHEN (NEW.status = 'approved' AND OLD.status != 'approved')
  EXECUTE FUNCTION handle_pending_judgment_approval();