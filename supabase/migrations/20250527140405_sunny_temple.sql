-- Drop existing RLS policies
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
      SELECT 1 FROM auth.users
      WHERE id = auth.uid()
      AND email LIKE '%@afyanahaki.org'
    )
  );

-- Update the submission routing function without SECURITY DEFINER
CREATE OR REPLACE FUNCTION handle_submission_routing()
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

  -- Auto-approve submissions from @afyanahaki.org
  IF submitter_email LIKE '%@afyanahaki.org' THEN
    NEW.status := 'approved';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;