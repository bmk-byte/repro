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
      SELECT 1 FROM auth.users
      WHERE id = auth.uid()
      AND email LIKE '%@afyanahaki.org'
    )
  );

-- Update the submission routing function to be more permissive
CREATE OR REPLACE FUNCTION handle_submission_routing()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert routing audit log entry
  INSERT INTO routing_audit_log (
    submission_id,
    decision,
    reason
  ) VALUES (
    NEW.id,
    'review_queue',
    'Submission queued for review'
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;