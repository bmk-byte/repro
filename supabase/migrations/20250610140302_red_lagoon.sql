/*
  # Remove functions and triggers using app.settings.supabase_url

  1. Changes
    - Drop triggers that use notify_case_change function
    - Drop notify_case_change function
    - Drop triggers that use notify_submission_change function
    - Drop notify_submission_change function
    
  2. Reason
    - These functions are causing errors due to unrecognized configuration parameter "app.settings.supabase_url"
    - Removing them will resolve the errors while maintaining core functionality
*/

-- Drop triggers for notify_case_change
DROP TRIGGER IF EXISTS notify_new_case ON cases;
DROP TRIGGER IF EXISTS notify_updated_case ON cases;

-- Drop notify_case_change function
DROP FUNCTION IF EXISTS notify_case_change();

-- Drop triggers for notify_submission_change
DROP TRIGGER IF EXISTS notify_new_submission ON pending_submissions;
DROP TRIGGER IF EXISTS notify_submission_approved ON pending_submissions;

-- Drop notify_submission_change function
DROP FUNCTION IF EXISTS notify_submission_change();

-- Log the changes to app_settings table
INSERT INTO app_settings (key, value)
VALUES 
  ('notification_functions_removed', 'true'),
  ('notification_functions_removed_date', now()::text)
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();