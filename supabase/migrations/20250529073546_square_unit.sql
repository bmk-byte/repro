-- Drop existing RLS policies
DROP POLICY IF EXISTS "Anyone can insert audit log entries" ON routing_audit_log;
DROP POLICY IF EXISTS "Moderators can view audit log" ON routing_audit_log;

-- Create new RLS policies for routing_audit_log
CREATE POLICY "Anyone can insert audit log entries"
  ON routing_audit_log
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Moderators can view audit log"
  ON routing_audit_log
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_moderator = true
    )
  );

-- Update the submission routing function to be more permissive
CREATE OR REPLACE FUNCTION handle_submission_routing()
RETURNS TRIGGER AS $$
DECLARE
  submitter_email text;
BEGIN
  -- Get submitter's email
  SELECT email INTO submitter_email
  FROM auth.users
  WHERE id = NEW.submitted_by;
  
  -- Auto-approve submissions from @afyanahaki.org
  IF submitter_email LIKE '%@afyanahaki.org' THEN
    NEW.status := 'approved';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a separate function for logging that runs AFTER the submission is inserted
CREATE OR REPLACE FUNCTION log_submission_routing()
RETURNS TRIGGER AS $$
DECLARE
  submitter_email text;
BEGIN
  -- Get submitter's email
  SELECT email INTO submitter_email
  FROM auth.users
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
      WHEN submitter_email LIKE '%@afyanahaki.org' THEN 'Trusted domain submission'
      ELSE 'External submission requiring review'
    END
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS handle_submission_routing ON pending_submissions;
DROP TRIGGER IF EXISTS log_submission_routing ON pending_submissions;

-- Create BEFORE INSERT trigger for auto-approval
CREATE TRIGGER handle_submission_routing
  BEFORE INSERT ON pending_submissions
  FOR EACH ROW
  EXECUTE FUNCTION handle_submission_routing();

-- Create AFTER INSERT trigger for logging
CREATE TRIGGER log_submission_routing
  AFTER INSERT ON pending_submissions
  FOR EACH ROW
  EXECUTE FUNCTION log_submission_routing();

-- Create a function to handle record creation on approval
CREATE OR REPLACE FUNCTION create_record_on_approval()
RETURNS TRIGGER AS $$
DECLARE
  case_id uuid;
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
        'pending', -- Initial status for the actual case record
        'litigation', -- Default case type, can be refined
        'approved', -- Moderation status for the actual case record
        NEW.submission_date,
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
        media_neutral_citation,
        court,
        case_number,
        judges,
        judgment_date,
        language,
        type,
        flynote,
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
        NEW.title, -- Using title as citation for now, needs proper parsing
        NEW.summary,
        NEW.country_id,
        NEW.submitted_by,
        NEW.document_url,
        NEW.submission_date,
        'N/A', -- Placeholder, needs proper data from submission form
        'N/A', -- Placeholder
        'N/A', -- Placeholder
        'N/A', -- Placeholder
        NEW.submission_date,
        'English', -- Default language, needs to be dynamic
        'Final Judgment', -- Default type, needs to be dynamic
        NEW.summary, -- Using summary as flynote for now
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
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS create_record_on_approval ON pending_submissions;

-- Create trigger for record creation on approval
CREATE TRIGGER create_record_on_approval
  AFTER UPDATE ON pending_submissions
  FOR EACH ROW
  WHEN (NEW.status = 'approved' AND OLD.status != 'approved')
  EXECUTE FUNCTION create_record_on_approval();