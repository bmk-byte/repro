/*
  # Add Email Notification Triggers

  1. Changes
    - Add function to handle case notifications
    - Add triggers for new and updated cases
    - Add email column to profiles table

  2. Security
    - Maintain existing RLS policies
*/

-- Add email column to profiles if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'email'
  ) THEN
    ALTER TABLE profiles ADD COLUMN email text;
  END IF;
END $$;

-- Create function to handle case notifications
CREATE OR REPLACE FUNCTION notify_case_change()
RETURNS trigger AS $$
DECLARE
  edge_function_url text;
  payload json;
BEGIN
  -- Get the Edge Function URL from environment variable
  edge_function_url := current_setting('app.settings.supabase_url') || '/functions/v1/send-case-email';

  -- Prepare the payload
  IF TG_OP = 'INSERT' THEN
    payload := json_build_object(
      'type', 'new',
      'caseData', row_to_json(NEW)
    );
  ELSE
    payload := json_build_object(
      'type', 'update',
      'caseData', row_to_json(NEW)
    );
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

-- Create trigger for new cases
DROP TRIGGER IF EXISTS notify_new_case ON cases;
CREATE TRIGGER notify_new_case
  AFTER INSERT ON cases
  FOR EACH ROW
  EXECUTE FUNCTION notify_case_change();

-- Create trigger for updated cases
DROP TRIGGER IF EXISTS notify_updated_case ON cases;
CREATE TRIGGER notify_updated_case
  AFTER UPDATE ON cases
  FOR EACH ROW
  WHEN (OLD.* IS DISTINCT FROM NEW.*)
  EXECUTE FUNCTION notify_case_change();

-- Update handle_new_user function to include email
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role, email)
  VALUES (
    new.id,
    new.raw_user_meta_data->>'full_name',
    'user',
    new.email
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;