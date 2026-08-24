-- Create function to handle email notifications
CREATE OR REPLACE FUNCTION notify_submission_change()
RETURNS trigger AS $$
DECLARE
  edge_function_url text;
  payload json;
  submitter_data json;
BEGIN
  -- Get the Edge Function URL from environment variable
  edge_function_url := current_setting('app.settings.supabase_url') || '/functions/v1/send-submission-email';

  -- Get submitter data
  SELECT json_build_object(
    'submitter_name', p.full_name,
    'submitter_email', p.email
  ) INTO submitter_data
  FROM profiles p
  WHERE p.id = NEW.submitted_by;

  -- Prepare the payload
  IF TG_OP = 'INSERT' THEN
    payload := json_build_object(
      'type', 'new',
      'submissionData', json_build_object(
        'id', NEW.id,
        'title', NEW.title,
        'created_at', NEW.created_at,
        'submitter_name', submitter_data->>'submitter_name',
        'submitter_email', submitter_data->>'submitter_email'
      )
    );
  ELSIF TG_OP = 'UPDATE' AND NEW.status = 'approved' AND OLD.status != 'approved' THEN
    payload := json_build_object(
      'type', 'approved',
      'submissionData', json_build_object(
        'id', NEW.id,
        'title', NEW.title,
        'updated_at', NEW.updated_at,
        'submitter_name', submitter_data->>'submitter_name',
        'submitter_email', submitter_data->>'submitter_email'
      )
    );
  ELSE
    -- No email needed for other changes
    RETURN NEW;
  END IF;

  -- Make HTTP request to Edge Function
  PERFORM
    net.http_post(
      url := edge_function_url,
      body := payload::text,
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer ' || 
                current_setting('app.settings.service_role_key') || '"}'
    );

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