/*
  # Add Automated Case Routing System

  1. Changes
    - Add function to handle automated case routing
    - Add trigger for new submissions
    - Add audit logging for routing decisions
    
  2. Security
    - Maintain existing RLS policies
    - Add audit trail
*/

-- Create audit log table for routing decisions
CREATE TABLE routing_audit_log (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  submission_id uuid REFERENCES pending_submissions(id),
  decision text NOT NULL,
  reason text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on audit log
ALTER TABLE routing_audit_log ENABLE ROW LEVEL SECURITY;

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

-- Function to handle automated routing
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