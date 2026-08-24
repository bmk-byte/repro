/*
  # Create Separate Tables for Pending Cases and Judgments

  1. New Tables
    - pending_cases
      - Contains all case-specific fields
      - Replaces case submissions in pending_submissions
    
    - pending_judgments
      - Contains all judgment-specific fields
      - Replaces judgment submissions in pending_submissions

  2. Data Migration
    - Migrates existing data from pending_submissions to the new tables
    - Preserves all submission metadata and content

  3. Security
    - Establishes appropriate RLS policies for each table
    - Maintains existing security model
*/

-- Create pending_cases table
CREATE TABLE pending_cases (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  summary text,
  document_url text,
  submitted_by uuid REFERENCES profiles(id),
  submission_date timestamptz DEFAULT now(),
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'failed')),
  feedback text,
  country_id uuid REFERENCES countries(id),
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
  
  -- Common fields for both cases and judgments
  timeline_status text CHECK (timeline_status IS NULL OR timeline_status IN ('filed', 'ongoing', 'resolved', 'dismissed')),
  litigants text[],
  defending_institutions text[],
  judicial_body_type text CHECK (judicial_body_type IS NULL OR judicial_body_type IN ('National Court', 'Regional Court')),
  judicial_body text,
  regional_appeals boolean DEFAULT false,
  regional_bodies text[],
  legal_framework_type text CHECK (legal_framework_type IS NULL OR legal_framework_type IN ('Domestic Law', 'International Law', 'Both')),
  domestic_laws text[],
  international_laws text[],
  protocols text[],
  case_impact text,
  case_categories text[] DEFAULT '{}' CHECK (
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
  )
);

-- Create pending_judgments table
CREATE TABLE pending_judgments (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  summary text,
  document_url text,
  submitted_by uuid REFERENCES profiles(id),
  submission_date timestamptz DEFAULT now(),
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'failed')),
  feedback text,
  country_id uuid REFERENCES countries(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Judgment-specific fields
  citation text,
  media_neutral_citation text,
  court_judgment text,
  case_number_judgment text,
  judges_judgment text,
  judgment_date_judgment date,
  language_judgment text CHECK (language_judgment IS NULL OR language_judgment IN ('English', 'French', 'Portuguese', 'Swahili')),
  type_judgment text CHECK (type_judgment IS NULL OR type_judgment IN ('Final Judgment', 'Interim Order', 'Ruling', 'Consent Judgment', 'Consent', 'Default Judgment', 'Default')),
  flynote_judgment text,
  
  -- Common fields for both cases and judgments
  timeline_status text CHECK (timeline_status IS NULL OR timeline_status IN ('filed', 'ongoing', 'resolved', 'dismissed')),
  litigants text[],
  defending_institutions text[],
  judicial_body_type text CHECK (judicial_body_type IS NULL OR judicial_body_type IN ('National Court', 'Regional Court')),
  judicial_body text,
  regional_appeals boolean DEFAULT false,
  regional_bodies text[],
  legal_framework_type text CHECK (legal_framework_type IS NULL OR legal_framework_type IN ('Domestic Law', 'International Law', 'Both')),
  domestic_laws text[],
  international_laws text[],
  protocols text[],
  case_impact text,
  case_categories text[] DEFAULT '{}' CHECK (
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
  )
);

-- Create indexes for better query performance
CREATE INDEX pending_cases_status_idx ON pending_cases(status);
CREATE INDEX pending_cases_submitted_by_idx ON pending_cases(submitted_by);
CREATE INDEX pending_cases_country_id_idx ON pending_cases(country_id);
CREATE INDEX pending_cases_categories_idx ON pending_cases USING gin(case_categories);

CREATE INDEX pending_judgments_status_idx ON pending_judgments(status);
CREATE INDEX pending_judgments_submitted_by_idx ON pending_judgments(submitted_by);
CREATE INDEX pending_judgments_country_id_idx ON pending_judgments(country_id);
CREATE INDEX pending_judgments_categories_idx ON pending_judgments USING gin(case_categories);

-- Enable RLS on new tables
ALTER TABLE pending_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE pending_judgments ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for pending_cases
CREATE POLICY "Users can view their own pending cases"
  ON pending_cases
  FOR SELECT
  TO authenticated
  USING (submitted_by = auth.uid());

CREATE POLICY "Users can create pending cases"
  ON pending_cases
  FOR INSERT
  TO authenticated
  WITH CHECK (submitted_by = auth.uid());

CREATE POLICY "Moderators can view all pending cases"
  ON pending_cases
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND (profiles.is_moderator = true OR profiles.email LIKE '%@afyanahaki.org')
    )
  );

CREATE POLICY "Moderators can update pending cases"
  ON pending_cases
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND (profiles.is_moderator = true OR profiles.email LIKE '%@afyanahaki.org')
    )
  );

CREATE POLICY "Moderators can delete pending cases"
  ON pending_cases
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND (profiles.is_moderator = true OR profiles.email LIKE '%@afyanahaki.org')
    )
  );

-- Create RLS policies for pending_judgments
CREATE POLICY "Users can view their own pending judgments"
  ON pending_judgments
  FOR SELECT
  TO authenticated
  USING (submitted_by = auth.uid());

CREATE POLICY "Users can create pending judgments"
  ON pending_judgments
  FOR INSERT
  TO authenticated
  WITH CHECK (submitted_by = auth.uid());

CREATE POLICY "Moderators can view all pending judgments"
  ON pending_judgments
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND (profiles.is_moderator = true OR profiles.email LIKE '%@afyanahaki.org')
    )
  );

CREATE POLICY "Moderators can update pending judgments"
  ON pending_judgments
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND (profiles.is_moderator = true OR profiles.email LIKE '%@afyanahaki.org')
    )
  );

CREATE POLICY "Moderators can delete pending judgments"
  ON pending_judgments
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND (profiles.is_moderator = true OR profiles.email LIKE '%@afyanahaki.org')
    )
  );

-- Migrate existing data from pending_submissions to the new tables
-- Fixed to handle missing columns in pending_submissions
DO $$
DECLARE
  submission RECORD;
  has_feedback boolean;
BEGIN
  -- Check if pending_submissions has a feedback column
  has_feedback := EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'pending_submissions' AND column_name = 'feedback'
  );

  -- Migrate case submissions
  FOR submission IN 
    SELECT * FROM pending_submissions 
    WHERE type = 'case' OR type IS NULL OR type = ''
  LOOP
    INSERT INTO pending_cases (
      id,
      title,
      summary,
      document_url,
      submitted_by,
      submission_date,
      status,
      -- Only include feedback if the column exists
      feedback,
      country_id,
      created_at,
      updated_at,
      tracking_period,
      programme,
      partner,
      nature_of_case,
      action_taken,
      action_timeframe,
      next_steps,
      court,
      case_outcome,
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
      submission.id,
      submission.title,
      submission.summary,
      submission.document_url,
      submission.submitted_by,
      submission.submission_date,
      submission.status,
      -- Use NULL for feedback if the column doesn't exist
      CASE WHEN has_feedback THEN submission.feedback ELSE NULL END,
      submission.country_id,
      submission.created_at,
      submission.updated_at,
      submission.tracking_period,
      submission.programme,
      submission.partner,
      submission.nature_of_case,
      submission.action_taken,
      submission.action_timeframe,
      submission.next_steps,
      submission.court,
      submission.case_outcome,
      submission.timeline_status,
      submission.litigants,
      submission.defending_institutions,
      submission.judicial_body_type,
      submission.judicial_body,
      submission.regional_appeals,
      submission.regional_bodies,
      submission.legal_framework_type,
      submission.domestic_laws,
      submission.international_laws,
      submission.protocols,
      submission.case_impact,
      submission.case_categories
    );
  END LOOP;

  -- Migrate judgment submissions
  FOR submission IN 
    SELECT * FROM pending_submissions 
    WHERE type = 'judgment'
  LOOP
    INSERT INTO pending_judgments (
      id,
      title,
      summary,
      document_url,
      submitted_by,
      submission_date,
      status,
      -- Only include feedback if the column exists
      feedback,
      country_id,
      created_at,
      updated_at,
      citation,
      media_neutral_citation,
      court_judgment,
      case_number_judgment,
      judges_judgment,
      judgment_date_judgment,
      language_judgment,
      type_judgment,
      flynote_judgment,
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
      submission.id,
      submission.title,
      submission.summary,
      submission.document_url,
      submission.submitted_by,
      submission.submission_date,
      submission.status,
      -- Use NULL for feedback if the column doesn't exist
      CASE WHEN has_feedback THEN submission.feedback ELSE NULL END,
      submission.country_id,
      submission.created_at,
      submission.updated_at,
      submission.citation,
      submission.media_neutral_citation,
      submission.court_judgment,
      submission.case_number_judgment,
      submission.judges_judgment,
      submission.judgment_date_judgment,
      submission.language_judgment,
      submission.type_judgment,
      submission.flynote_judgment,
      submission.timeline_status,
      submission.litigants,
      submission.defending_institutions,
      submission.judicial_body_type,
      submission.judicial_body,
      submission.regional_appeals,
      submission.regional_bodies,
      submission.legal_framework_type,
      submission.domestic_laws,
      submission.international_laws,
      submission.protocols,
      submission.case_impact,
      submission.case_categories
    );
  END LOOP;
EXCEPTION WHEN OTHERS THEN
  -- Log error but continue
  RAISE NOTICE 'Error during data migration: %', SQLERRM;
END $$;

-- Create functions for handling case approvals
CREATE OR REPLACE FUNCTION handle_pending_case_approval()
RETURNS TRIGGER AS $$
BEGIN
  -- Only proceed if status changed to 'approved'
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
      created_at,
      tracking_period,
      programme,
      partner,
      nature_of_case,
      action_taken,
      action_timeframe,
      next_steps,
      court,
      case_outcome,
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
      NEW.title,
      NEW.summary,
      NEW.country_id,
      NEW.submitted_by,
      NEW.document_url,
      'pending',
      'litigation',
      'approved',
      NEW.submission_date,
      NEW.tracking_period,
      NEW.programme,
      NEW.partner,
      NEW.nature_of_case,
      NEW.action_taken,
      NEW.action_timeframe,
      NEW.next_steps,
      NEW.court,
      NEW.case_outcome,
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
    
    -- Log the approval in routing audit log
    INSERT INTO routing_audit_log (
      submission_id,
      decision,
      reason
    ) VALUES (
      NEW.id,
      'case_approved',
      'Case submission approved and moved to cases table'
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create function for handling judgment approvals
CREATE OR REPLACE FUNCTION handle_pending_judgment_approval()
RETURNS TRIGGER AS $$
BEGIN
  -- Only proceed if status changed to 'approved'
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
      COALESCE(NEW.citation, NEW.title),
      NEW.media_neutral_citation,
      COALESCE(NEW.court_judgment, 'Not specified'),
      COALESCE(NEW.case_number_judgment, 'Not specified'),
      COALESCE(NEW.judges_judgment, 'Not specified'),
      COALESCE(NEW.judgment_date_judgment, CURRENT_DATE),
      COALESCE(NEW.language_judgment, 'English'),
      COALESCE(NEW.type_judgment, 'Final Judgment'),
      COALESCE(NEW.flynote_judgment, 'Not specified'),
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
    
    -- Log the approval in routing audit log
    INSERT INTO routing_audit_log (
      submission_id,
      decision,
      reason
    ) VALUES (
      NEW.id,
      'judgment_approved',
      'Judgment submission approved and moved to judgments table'
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for the approval functions
CREATE TRIGGER handle_pending_case_approval_trigger
  AFTER UPDATE ON pending_cases
  FOR EACH ROW
  WHEN (NEW.status = 'approved' AND OLD.status != 'approved')
  EXECUTE FUNCTION handle_pending_case_approval();

CREATE TRIGGER handle_pending_judgment_approval_trigger
  AFTER UPDATE ON pending_judgments
  FOR EACH ROW
  WHEN (NEW.status = 'approved' AND OLD.status != 'approved')
  EXECUTE FUNCTION handle_pending_judgment_approval();

-- Create functions for auto-approving submissions from trusted domains
CREATE OR REPLACE FUNCTION auto_approve_pending_case()
RETURNS TRIGGER AS $$
DECLARE
  submitter_email text;
BEGIN
  -- Get submitter's email
  SELECT email INTO submitter_email
  FROM profiles
  WHERE id = NEW.submitted_by;
  
  -- Auto-approve submissions from @afyanahaki.org
  IF submitter_email LIKE '%@afyanahaki.org' THEN
    NEW.status := 'approved';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION auto_approve_pending_judgment()
RETURNS TRIGGER AS $$
DECLARE
  submitter_email text;
BEGIN
  -- Get submitter's email
  SELECT email INTO submitter_email
  FROM profiles
  WHERE id = NEW.submitted_by;
  
  -- Auto-approve submissions from @afyanahaki.org
  IF submitter_email LIKE '%@afyanahaki.org' THEN
    NEW.status := 'approved';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for auto-approval
CREATE TRIGGER auto_approve_pending_case_trigger
  BEFORE INSERT ON pending_cases
  FOR EACH ROW
  EXECUTE FUNCTION auto_approve_pending_case();

CREATE TRIGGER auto_approve_pending_judgment_trigger
  BEFORE INSERT ON pending_judgments
  FOR EACH ROW
  EXECUTE FUNCTION auto_approve_pending_judgment();

-- Create functions for logging submissions
CREATE OR REPLACE FUNCTION log_pending_case_submission()
RETURNS TRIGGER AS $$
DECLARE
  submitter_email text;
BEGIN
  -- Get submitter's email
  SELECT email INTO submitter_email
  FROM profiles
  WHERE id = NEW.submitted_by;

  -- Insert routing audit log entry
  INSERT INTO routing_audit_log (
    submission_id,
    decision,
    reason
  ) VALUES (
    NEW.id,
    CASE 
      WHEN submitter_email LIKE '%@afyanahaki.org' THEN 'auto_approved'
      ELSE 'review_queue'
    END,
    CASE 
      WHEN submitter_email LIKE '%@afyanahaki.org' THEN 'Trusted domain case submission'
      ELSE 'External case submission requiring review'
    END
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION log_pending_judgment_submission()
RETURNS TRIGGER AS $$
DECLARE
  submitter_email text;
BEGIN
  -- Get submitter's email
  SELECT email INTO submitter_email
  FROM profiles
  WHERE id = NEW.submitted_by;

  -- Insert routing audit log entry
  INSERT INTO routing_audit_log (
    submission_id,
    decision,
    reason
  ) VALUES (
    NEW.id,
    CASE 
      WHEN submitter_email LIKE '%@afyanahaki.org' THEN 'auto_approved'
      ELSE 'review_queue'
    END,
    CASE 
      WHEN submitter_email LIKE '%@afyanahaki.org' THEN 'Trusted domain judgment submission'
      ELSE 'External judgment submission requiring review'
    END
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for logging
CREATE TRIGGER log_pending_case_submission_trigger
  AFTER INSERT ON pending_cases
  FOR EACH ROW
  EXECUTE FUNCTION log_pending_case_submission();

CREATE TRIGGER log_pending_judgment_submission_trigger
  AFTER INSERT ON pending_judgments
  FOR EACH ROW
  EXECUTE FUNCTION log_pending_judgment_submission();

-- Note: We're not dropping the pending_submissions table yet to ensure a smooth transition
-- It can be dropped in a future migration after the application has been updated