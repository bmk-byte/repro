/*
  # Fix routing audit log constraints

  1. Changes
    - Make the 'reason' column nullable in routing_audit_log table
    - Add default decision value for routing audit log entries
    - Update trigger function to handle judgment submissions

  2. Security
    - Maintain existing RLS policies
*/

-- Make reason column nullable
ALTER TABLE routing_audit_log 
ALTER COLUMN reason DROP NOT NULL;

-- Set default decision for judgment submissions
ALTER TABLE routing_audit_log 
ALTER COLUMN decision SET DEFAULT 'review_queue';

-- Update trigger function to handle judgment submissions
CREATE OR REPLACE FUNCTION handle_submission_routing()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert a routing audit log entry
  INSERT INTO routing_audit_log (
    submission_id,
    decision,
    reason
  ) VALUES (
    NEW.id,
    'review_queue',
    CASE 
      WHEN NEW.type = 'judgment' THEN 'Judgment submission queued for review'
      ELSE NULL
    END
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;