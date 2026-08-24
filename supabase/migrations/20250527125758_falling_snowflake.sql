-- Create routing_audit_log table if it doesn't exist
CREATE TABLE IF NOT EXISTS routing_audit_log (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  submission_id uuid REFERENCES pending_submissions(id),
  decision text NOT NULL,
  reason text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on audit log
ALTER TABLE routing_audit_log ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Moderators can view audit log" ON routing_audit_log;

-- Allow moderators to view audit log
CREATE POLICY "Moderators can view audit log"
  ON routing_audit_log
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid()
      AND email LIKE '%@afyanahaki.org'
    )
  );

-- Function to handle automated routing and case creation
CREATE OR REPLACE FUNCTION handle_submission_routing()
RETURNS trigger AS $$
DECLARE
  submitter_email text;
  case_id uuid;
BEGIN
  -- Get submitter's email
  SELECT email INTO submitter_email
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
      WHEN submitter_email LIKE '%@afyanahaki.org' THEN 'Trusted domain submission'
      ELSE 'External submission requiring review'
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
        'Pending', -- These fields will need to be updated later
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

-- Function to handle email notifications
CREATE OR REPLACE FUNCTION notify_submission_change()
RETURNS trigger AS $$
BEGIN
  -- Trigger Edge Function for email notifications
  IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND NEW.status = 'approved' AND OLD.status != 'approved') THEN
    PERFORM
      net.http_post(
        url := current_setting('app.settings.supabase_url') || '/functions/v1/send-submission-email',
        body := json_build_object(
          'type', CASE WHEN TG_OP = 'INSERT' THEN 'new' ELSE 'approved' END,
          'submissionData', row_to_json(NEW)
        )::text,
        headers := '{"Content-Type": "application/json"}'
      );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers for submission notifications
DROP TRIGGER IF EXISTS notify_new_submission ON pending_submissions;
CREATE TRIGGER notify_new_submission
  AFTER INSERT ON pending_submissions
  FOR EACH ROW
  EXECUTE FUNCTION notify_submission_change();

DROP TRIGGER IF EXISTS notify_submission_approved ON pending_submissions;
CREATE TRIGGER notify_submission_approved
  AFTER UPDATE ON pending_submissions
  FOR EACH ROW
  WHEN (OLD.* IS DISTINCT FROM NEW.*)
  EXECUTE FUNCTION notify_submission_change();