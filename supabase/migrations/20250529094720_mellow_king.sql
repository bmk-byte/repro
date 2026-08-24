-- Improve error handling in create_record_on_approval function
CREATE OR REPLACE FUNCTION create_record_on_approval()
RETURNS TRIGGER AS $$
DECLARE
  case_id uuid;
  error_message text;
BEGIN
  -- Wrap the record creation in a BEGIN/EXCEPTION block to catch errors
  BEGIN
    IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
      IF NEW.type = 'case' THEN
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
          -- New fields
          tracking_period,
          programme,
          partner,
          nature_of_case,
          action_taken,
          action_timeframe,
          next_steps,
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
          COALESCE(NEW.status, 'pending'),
          'litigation', -- Default case type
          'approved',
          NEW.submission_date,
          -- New fields
          NEW.tracking_period,
          NEW.programme,
          NEW.partner,
          NEW.nature_of_case,
          NEW.action_taken,
          NEW.action_timeframe,
          NEW.next_steps,
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
        ) RETURNING id INTO case_id;

      ELSIF NEW.type = 'judgment' THEN
        INSERT INTO judgments (
          citation,
          case_summary,
          country_id,
          uploaded_by,
          file_url,
          created_at,
          -- Use actual judgment fields instead of placeholders
          media_neutral_citation,
          court,
          case_number,
          judges,
          judgment_date,
          language,
          type,
          flynote,
          -- Additional fields
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
          NEW.submission_date,
          -- Use actual judgment fields from the submission
          NEW.media_neutral_citation,
          NEW.court_judgment,
          NEW.case_number_judgment,
          NEW.judges_judgment,
          COALESCE(NEW.judgment_date_judgment, NEW.submission_date),
          COALESCE(NEW.language_judgment, 'English'),
          COALESCE(NEW.type_judgment, 'Final Judgment'),
          COALESCE(NEW.flynote_judgment, NEW.summary),
          -- Additional fields
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
    END IF;
    
    RETURN NEW;
    
  EXCEPTION WHEN OTHERS THEN
    -- Capture the error message
    error_message := SQLERRM;
    
    -- Update the submission with the error message
    UPDATE pending_submissions
    SET 
      status = 'failed',
      feedback = 'Error creating record: ' || error_message
    WHERE id = NEW.id;
    
    -- Log the error to the routing_audit_log
    INSERT INTO routing_audit_log (
      submission_id,
      decision,
      reason
    ) VALUES (
      NEW.id,
      'failed',
      'Error during record creation: ' || error_message
    );
    
    -- Return the original NEW record to allow the update to proceed
    RETURN NEW;
  END;
END;
$$ LANGUAGE plpgsql;

-- Add 'failed' as a valid status for pending_submissions
ALTER TABLE pending_submissions
DROP CONSTRAINT IF EXISTS pending_submissions_status_check;

ALTER TABLE pending_submissions
ADD CONSTRAINT pending_submissions_status_check
CHECK (status IN ('pending', 'approved', 'rejected', 'failed'));

-- Enhance storage policies for submission-documents bucket
-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Users can upload submission documents" ON storage.objects;

-- Create new policy with file type restriction
CREATE POLICY "Users can upload submission documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'submission-documents' AND
  (LOWER(RIGHT(storage.filename(name), 4)) = '.pdf')
);

-- Add validation for array fields in pending_submissions
-- Add check constraint for litigants (must not be empty if provided)
ALTER TABLE pending_submissions
ADD CONSTRAINT pending_submissions_litigants_check
CHECK (litigants IS NULL OR array_length(litigants, 1) > 0);

-- Add check constraint for defending_institutions (must not be empty if provided)
ALTER TABLE pending_submissions
ADD CONSTRAINT pending_submissions_defending_institutions_check
CHECK (defending_institutions IS NULL OR array_length(defending_institutions, 1) > 0);

-- Add check constraint for protocols (must not be empty if provided)
ALTER TABLE pending_submissions
ADD CONSTRAINT pending_submissions_protocols_check
CHECK (protocols IS NULL OR array_length(protocols, 1) > 0);

-- Create a function to validate email format
CREATE OR REPLACE FUNCTION is_valid_email(email text)
RETURNS boolean AS $$
BEGIN
  RETURN email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$';
END;
$$ LANGUAGE plpgsql;

-- Add a trigger to validate email format in profiles
CREATE OR REPLACE FUNCTION validate_profile_email()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.email IS NOT NULL AND NOT is_valid_email(NEW.email) THEN
    RAISE EXCEPTION 'Invalid email format: %', NEW.email;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_profile_email_trigger
BEFORE INSERT OR UPDATE ON profiles
FOR EACH ROW
EXECUTE FUNCTION validate_profile_email();