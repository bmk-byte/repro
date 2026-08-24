-- Enhance storage policies for all buckets to enforce file type restrictions

-- Update submission-documents bucket policy
DROP POLICY IF EXISTS "Users can upload submission documents" ON storage.objects;

CREATE POLICY "Users can upload submission documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'submission-documents' AND
  (LOWER(RIGHT(storage.filename(name), 4)) = '.pdf')
);

-- Update case-documents bucket policy
DROP POLICY IF EXISTS "Users can upload case documents" ON storage.objects;

CREATE POLICY "Users can upload case documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'case-documents' AND
  (LOWER(RIGHT(storage.filename(name), 4)) = '.pdf')
);

-- Update judgments bucket policy
DROP POLICY IF EXISTS "Authenticated users can upload judgment documents" ON storage.objects;

CREATE POLICY "Authenticated users can upload judgment documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'judgments' AND
  (LOWER(RIGHT(storage.filename(name), 4)) = '.pdf')
);

-- Update stage-documents bucket policy
DROP POLICY IF EXISTS "Users can upload stage documents" ON storage.objects;

CREATE POLICY "Users can upload stage documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'stage-documents' AND
  (LOWER(RIGHT(storage.filename(name), 4)) IN ('.pdf', '.doc', '.docx'))
);

-- Update legal-documents bucket policy
DROP POLICY IF EXISTS "Authenticated users can upload legal documents" ON storage.objects;

CREATE POLICY "Authenticated users can upload legal documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'legal-documents' AND
  (LOWER(RIGHT(storage.filename(name), 4)) = '.pdf')
);

-- Update laws bucket policy
DROP POLICY IF EXISTS "Authenticated users can upload files" ON storage.objects;

CREATE POLICY "Authenticated users can upload files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'laws' AND
  (LOWER(RIGHT(storage.filename(name), 4)) = '.pdf')
);

-- Add error handling to notify_submission_change function
CREATE OR REPLACE FUNCTION notify_submission_change()
RETURNS trigger AS $$
DECLARE
  edge_function_url text;
  payload json;
  submitter_data json;
BEGIN
  -- Wrap in exception block to prevent trigger failures
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
  EXCEPTION WHEN OTHERS THEN
    -- Log error but don't fail the trigger
    RAISE NOTICE 'Error in notify_submission_change: %', SQLERRM;
  END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add error handling to log_submission_routing function
CREATE OR REPLACE FUNCTION log_submission_routing()
RETURNS TRIGGER AS $$
DECLARE
  submitter_email text;
BEGIN
  -- Wrap in exception block to prevent trigger failures
  BEGIN
    -- Get submitter's email from profiles table
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
        WHEN submitter_email LIKE '%@afyanahaki.org' THEN 'Trusted domain submission'
        ELSE 'External submission requiring review'
      END
    );
  EXCEPTION WHEN OTHERS THEN
    -- Log error but don't fail the trigger
    RAISE NOTICE 'Error in log_submission_routing: %', SQLERRM;
    
    -- Still try to insert a basic log entry
    INSERT INTO routing_audit_log (
      submission_id,
      decision,
      reason
    ) VALUES (
      NEW.id,
      'review_queue',
      'Error occurred during routing: ' || SQLERRM
    );
  END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;