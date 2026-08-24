/*
  # Add Audit Trail for Cases and Judgments

  1. New Tables
    - audit_logs
      - id (uuid)
      - table_name (text)
      - record_id (uuid)
      - action (text)
      - changes (jsonb)
      - performed_by (uuid)
      - performed_at (timestamptz)
      
  2. Security
    - Enable RLS
    - Add policies for audit trail access
*/

-- Create audit_logs table
CREATE TABLE audit_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  table_name text NOT NULL,
  record_id uuid NOT NULL,
  action text NOT NULL,
  changes jsonb NOT NULL,
  performed_by uuid REFERENCES auth.users(id),
  performed_at timestamptz DEFAULT now()
);

-- Add check constraint for action
ALTER TABLE audit_logs
ADD CONSTRAINT audit_logs_action_check
CHECK (action IN ('update', 'delete'));

-- Enable RLS
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Authorized users can view audit logs"
  ON audit_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid()
      AND email LIKE '%@afyanahaki.org'
    )
  );

-- Add soft delete columns
ALTER TABLE cases
ADD COLUMN deleted_at timestamptz,
ADD COLUMN deleted_by uuid REFERENCES auth.users(id);

ALTER TABLE judgments
ADD COLUMN deleted_at timestamptz,
ADD COLUMN deleted_by uuid REFERENCES auth.users(id);

-- Create function to log changes
CREATE OR REPLACE FUNCTION log_table_change()
RETURNS trigger AS $$
BEGIN
  INSERT INTO audit_logs (
    table_name,
    record_id,
    action,
    changes,
    performed_by
  ) VALUES (
    TG_TABLE_NAME,
    OLD.id,
    CASE 
      WHEN TG_OP = 'DELETE' THEN 'delete'
      ELSE 'update'
    END,
    jsonb_build_object(
      'old_data', to_jsonb(OLD),
      'new_data', CASE WHEN TG_OP = 'UPDATE' THEN to_jsonb(NEW) ELSE NULL END
    ),
    auth.uid()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;