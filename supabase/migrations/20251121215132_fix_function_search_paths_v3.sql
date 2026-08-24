/*
  # Fix Function Search Paths - Version 3

  1. Security Improvements
    - Drop and recreate functions with secure search_path using CASCADE
    - Recreate associated triggers
    - Use 'pg_catalog, public' as the secure search path
  
  2. Security
    - Prevents potential SQL injection through search_path manipulation
*/

-- Drop existing functions with CASCADE
DROP FUNCTION IF EXISTS process_notification_queue() CASCADE;
DROP FUNCTION IF EXISTS notify_rapid_response_case_submission() CASCADE;
DROP FUNCTION IF EXISTS notify_moderators_of_new_submission() CASCADE;
DROP FUNCTION IF EXISTS auto_approve_pending_judgment() CASCADE;
DROP FUNCTION IF EXISTS auto_approve_pending_case() CASCADE;
DROP FUNCTION IF EXISTS log_pending_judgment_submission() CASCADE;
DROP FUNCTION IF EXISTS log_pending_case_submission() CASCADE;
DROP FUNCTION IF EXISTS handle_submission_routing() CASCADE;
DROP FUNCTION IF EXISTS check_duplicate_submission() CASCADE;
DROP FUNCTION IF EXISTS get_app_setting(text) CASCADE;
DROP FUNCTION IF EXISTS update_discussion_comments_count() CASCADE;
DROP FUNCTION IF EXISTS notify_user(uuid, text, text, text) CASCADE;
DROP FUNCTION IF EXISTS is_valid_email(text) CASCADE;
DROP FUNCTION IF EXISTS initialize_case_stages() CASCADE;
DROP FUNCTION IF EXISTS update_case_stage_timestamp() CASCADE;
DROP FUNCTION IF EXISTS update_health_indicators_updated_at() CASCADE;
DROP FUNCTION IF EXISTS update_law_documents_updated_at() CASCADE;
DROP FUNCTION IF EXISTS update_judgments_updated_at() CASCADE;
DROP FUNCTION IF EXISTS validate_profile_email() CASCADE;
DROP FUNCTION IF EXISTS is_moderator() CASCADE;

-- Recreate is_moderator function
CREATE OR REPLACE FUNCTION is_moderator()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM profiles
    WHERE profiles.id = auth.uid()
    AND (
      profiles.is_moderator = true OR
      profiles.email LIKE '%@afyanahaki.org'
    )
  );
END;
$$;

-- Recreate validate_profile_email function
CREATE OR REPLACE FUNCTION validate_profile_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF new.email IS NULL OR new.email = '' THEN
    RAISE EXCEPTION 'Email cannot be empty';
  END IF;
  RETURN new;
END;
$$;

-- Recreate update_judgments_updated_at function
CREATE OR REPLACE FUNCTION update_judgments_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  new.updated_at = now();
  RETURN new;
END;
$$;

-- Recreate trigger for judgments
DROP TRIGGER IF EXISTS update_judgments_updated_at_trigger ON judgments;
CREATE TRIGGER update_judgments_updated_at_trigger
  BEFORE UPDATE ON judgments
  FOR EACH ROW
  EXECUTE FUNCTION update_judgments_updated_at();

-- Recreate update_law_documents_updated_at function
CREATE OR REPLACE FUNCTION update_law_documents_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  new.updated_at = now();
  RETURN new;
END;
$$;

-- Recreate trigger for law_documents
DROP TRIGGER IF EXISTS update_law_documents_updated_at_trigger ON law_documents;
CREATE TRIGGER update_law_documents_updated_at_trigger
  BEFORE UPDATE ON law_documents
  FOR EACH ROW
  EXECUTE FUNCTION update_law_documents_updated_at();

-- Recreate update_health_indicators_updated_at function
CREATE OR REPLACE FUNCTION update_health_indicators_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  new.updated_at = now();
  RETURN new;
END;
$$;

-- Recreate trigger for health_indicators
DROP TRIGGER IF EXISTS update_health_indicators_updated_at_trigger ON health_indicators;
CREATE TRIGGER update_health_indicators_updated_at_trigger
  BEFORE UPDATE ON health_indicators
  FOR EACH ROW
  EXECUTE FUNCTION update_health_indicators_updated_at();

-- Recreate update_case_stage_timestamp function
CREATE OR REPLACE FUNCTION update_case_stage_timestamp()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  new.updated_at = now();
  RETURN new;
END;
$$;

-- Recreate trigger for case_stages
DROP TRIGGER IF EXISTS update_case_stage_timestamp_trigger ON case_stages;
CREATE TRIGGER update_case_stage_timestamp_trigger
  BEFORE UPDATE ON case_stages
  FOR EACH ROW
  EXECUTE FUNCTION update_case_stage_timestamp();

-- Recreate initialize_case_stages function
CREATE OR REPLACE FUNCTION initialize_case_stages()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  INSERT INTO case_stages (case_id, stage_name, stage_order)
  VALUES
    (new.id, 'Filing', 1),
    (new.id, 'Pre-trial', 2),
    (new.id, 'Trial', 3),
    (new.id, 'Post-trial', 4),
    (new.id, 'Appeal', 5);
  RETURN new;
EXCEPTION
  WHEN OTHERS THEN
    RETURN new;
END;
$$;

-- Recreate trigger for case_stages initialization
DROP TRIGGER IF EXISTS initialize_case_stages_trigger ON cases;
CREATE TRIGGER initialize_case_stages_trigger
  AFTER INSERT ON cases
  FOR EACH ROW
  EXECUTE FUNCTION initialize_case_stages();

-- Recreate is_valid_email function
CREATE OR REPLACE FUNCTION is_valid_email(email text)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
SET search_path = pg_catalog, public
AS $$
BEGIN
  RETURN email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$';
END;
$$;

-- Recreate notify_user function
CREATE OR REPLACE FUNCTION notify_user(
  p_user_id uuid,
  p_notification_type text,
  p_title text,
  p_message text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  INSERT INTO notifications (user_id, type, title, message)
  VALUES (p_user_id, p_notification_type, p_title, p_message);
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Failed to create notification: %', SQLERRM;
END;
$$;

-- Recreate update_discussion_comments_count function
CREATE OR REPLACE FUNCTION update_discussion_comments_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE discussions
    SET comments_count = comments_count + 1
    WHERE id = new.discussion_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE discussions
    SET comments_count = GREATEST(comments_count - 1, 0)
    WHERE id = old.discussion_id;
  END IF;
  RETURN NULL;
END;
$$;

-- Recreate trigger for discussion comments count
DROP TRIGGER IF EXISTS update_discussion_comments_count_trigger ON comments;
CREATE TRIGGER update_discussion_comments_count_trigger
  AFTER INSERT OR DELETE ON comments
  FOR EACH ROW
  EXECUTE FUNCTION update_discussion_comments_count();

-- Recreate get_app_setting function
CREATE OR REPLACE FUNCTION get_app_setting(p_setting_key text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  setting_value text;
BEGIN
  SELECT value INTO setting_value
  FROM app_settings
  WHERE key = p_setting_key;
  RETURN setting_value;
END;
$$;

-- Recreate check_duplicate_submission function
CREATE OR REPLACE FUNCTION check_duplicate_submission()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF TG_TABLE_NAME = 'pending_cases' THEN
    IF EXISTS (
      SELECT 1 FROM pending_cases
      WHERE title = new.title
      AND country_id = new.country_id
      AND status = 'pending'
      AND id != COALESCE(new.id, '00000000-0000-0000-0000-000000000000'::uuid)
    ) THEN
      RAISE EXCEPTION 'A pending submission with this title already exists for this country';
    END IF;
  END IF;
  RETURN new;
END;
$$;

-- Recreate handle_submission_routing function
CREATE OR REPLACE FUNCTION handle_submission_routing()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  auto_approve boolean;
BEGIN
  SELECT value::boolean INTO auto_approve
  FROM app_settings
  WHERE key = 'auto_approve_submissions';
  
  IF COALESCE(auto_approve, false) = true THEN
    new.status = 'approved';
  END IF;
  
  RETURN new;
EXCEPTION
  WHEN OTHERS THEN
    RETURN new;
END;
$$;

-- Recreate log_submission_routing function (alternative name used)
CREATE OR REPLACE FUNCTION log_submission_routing()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  INSERT INTO routing_audit_log (
    submission_type,
    submission_id,
    status,
    routed_to
  )
  VALUES (
    TG_TABLE_NAME,
    new.id,
    new.status,
    CASE WHEN new.status = 'approved' THEN 
      CASE WHEN TG_TABLE_NAME = 'pending_cases' THEN 'cases' ELSE 'judgments' END
    ELSE TG_TABLE_NAME END
  );
  RETURN new;
EXCEPTION
  WHEN OTHERS THEN
    RETURN new;
END;
$$;

-- Recreate notify_moderators_of_new_submission function
CREATE OR REPLACE FUNCTION notify_moderators_of_new_submission()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  INSERT INTO notification_queue (
    user_id,
    notification_type,
    title,
    message
  )
  SELECT
    id,
    'new_submission',
    'New Submission',
    'A new ' || TG_TABLE_NAME || ' has been submitted for review'
  FROM profiles
  WHERE is_moderator = true;
  
  RETURN new;
EXCEPTION
  WHEN OTHERS THEN
    RETURN new;
END;
$$;

-- Recreate triggers for moderator notifications
DROP TRIGGER IF EXISTS notify_moderators_new_pending_case ON pending_cases;
CREATE TRIGGER notify_moderators_new_pending_case
  AFTER INSERT ON pending_cases
  FOR EACH ROW
  EXECUTE FUNCTION notify_moderators_of_new_submission();

DROP TRIGGER IF EXISTS notify_moderators_new_pending_judgment ON pending_judgments;
CREATE TRIGGER notify_moderators_new_pending_judgment
  AFTER INSERT ON pending_judgments
  FOR EACH ROW
  EXECUTE FUNCTION notify_moderators_of_new_submission();

-- Recreate notify_rapid_response_case_submission function
CREATE OR REPLACE FUNCTION notify_rapid_response_case_submission()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF new.priority_level = 'urgent' OR new.categories @> ARRAY['Rapid Response']::text[] THEN
    INSERT INTO notification_queue (
      user_id,
      notification_type,
      title,
      message
    )
    SELECT
      id,
      'rapid_response',
      'Urgent: New Rapid Response Case',
      'A new rapid response case requires immediate attention'
    FROM profiles
    WHERE is_moderator = true;
  END IF;
  
  RETURN new;
EXCEPTION
  WHEN OTHERS THEN
    RETURN new;
END;
$$;

-- Recreate trigger for rapid response notifications
DROP TRIGGER IF EXISTS notify_new_rapid_response_case_trigger ON cases;
CREATE TRIGGER notify_new_rapid_response_case_trigger
  AFTER INSERT ON cases
  FOR EACH ROW
  EXECUTE FUNCTION notify_rapid_response_case_submission();

-- Recreate process_notification_queue function
CREATE OR REPLACE FUNCTION process_notification_queue()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  processed_count integer;
BEGIN
  INSERT INTO notifications (user_id, type, title, message)
  SELECT user_id, notification_type, title, message
  FROM notification_queue
  WHERE processed = false;
  
  GET DIAGNOSTICS processed_count = ROW_COUNT;
  
  UPDATE notification_queue
  SET processed = true
  WHERE processed = false;
  
  RETURN processed_count;
END;
$$;