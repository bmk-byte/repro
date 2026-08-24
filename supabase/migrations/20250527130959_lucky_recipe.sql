-- Create or replace the submission routing function
CREATE OR REPLACE FUNCTION handle_submission_routing()
RETURNS trigger AS $$
DECLARE
  submitter_email text;
  submitter_org text;
  case_id uuid;
BEGIN
  -- Get submitter's email and organization
  SELECT 
    email,
    raw_user_meta_data->>'organization' INTO submitter_email, submitter_org
  FROM auth.users
  WHERE id = NEW.submitted_by;

  -- Log routing decision
  INSERT INTO routing_audit_log (submission_id, decision, reason)
  VALUES (
    NEW.id,
    CASE 
      WHEN submitter_email LIKE '%@afyanahaki.org' THEN 'auto_approved'
      ELSE 'review_queue'
    END,
    CASE 
      WHEN submitter_email LIKE '%@afyanahaki.org' THEN 'Trusted domain submission from ' || submitter_org
      ELSE 'External submission from ' || submitter_org || ' requiring review'
    END
  );

  -- Handle @afyanahaki.org submissions
  IF submitter_email LIKE '%@afyanahaki.org' THEN
    -- Auto-approve submission
    NEW.status := 'approved';
    
    -- Create case or judgment based on submission type
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
        created_at
      ) VALUES (
        NEW.title,
        NEW.summary,
        NEW.country_id,
        NEW.submitted_by,
        NEW.document_url,
        'pending',
        'litigation',
        'approved',
        NEW.submission_date
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
        flynote
      ) VALUES (
        NEW.title,
        NEW.summary,
        NEW.country_id,
        NEW.submitted_by,
        NEW.document_url,
        NEW.submission_date,
        'Pending',
        'Pending',
        'Pending',
        'Pending',
        NEW.submission_date,
        'English',
        'Final Judgment',
        NEW.summary
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new submissions
DROP TRIGGER IF EXISTS handle_submission_routing ON pending_submissions;
CREATE TRIGGER handle_submission_routing
  BEFORE INSERT ON pending_submissions
  FOR EACH ROW
  EXECUTE FUNCTION handle_submission_routing();