/*
  # Fix Remaining Function Search Paths

  1. Security Improvements
    - Set search_path explicitly for remaining functions
    - Prevents search path manipulation attacks
  
  2. Functions Fixed
    - notify_user
    - create_record_on_approval
    - handle_pending_case_approval
    - handle_pending_judgment_approval
    - move_to_cases
    - transfer_approved_cases
*/

-- Drop and recreate notify_user with secure search_path
DROP FUNCTION IF EXISTS notify_user(uuid, text, text, text) CASCADE;

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

-- Drop and recreate create_record_on_approval with secure search_path
DROP FUNCTION IF EXISTS create_record_on_approval() CASCADE;

CREATE OR REPLACE FUNCTION create_record_on_approval()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF new.status = 'approved' AND (old.status IS NULL OR old.status != 'approved') THEN
    IF TG_TABLE_NAME = 'pending_cases' THEN
      INSERT INTO cases (
        title, nature_of_case, case_filed_country, categories,
        summary, outcome, user_id, document_url
      )
      SELECT
        title, nature_of_case, country_id, categories,
        summary, outcome, submitted_by, document_url
      FROM pending_cases
      WHERE id = new.id;
    ELSIF TG_TABLE_NAME = 'pending_judgments' THEN
      INSERT INTO judgments (
        citation, court, date_of_judgment, country_id,
        categories, summary, document_url, uploaded_by
      )
      SELECT
        citation, court, date_of_judgment, country_id,
        categories, summary, document_url, submitted_by
      FROM pending_judgments
      WHERE id = new.id;
    END IF;
  END IF;
  RETURN new;
EXCEPTION
  WHEN OTHERS THEN
    RETURN new;
END;
$$;

-- Drop and recreate handle_pending_case_approval with secure search_path
DROP FUNCTION IF EXISTS handle_pending_case_approval() CASCADE;

CREATE OR REPLACE FUNCTION handle_pending_case_approval()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF new.status = 'approved' AND (old.status IS NULL OR old.status = 'pending') THEN
    INSERT INTO cases (
      title, nature_of_case, case_filed_country, categories,
      summary, outcome, user_id, document_url, moderation_status
    )
    SELECT
      title, nature_of_case, country_id, categories,
      summary, outcome, submitted_by, document_url, 'approved'
    FROM pending_cases
    WHERE id = new.id;
  END IF;
  RETURN new;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Failed to create approved case: %', SQLERRM;
    RETURN new;
END;
$$;

-- Recreate trigger
DROP TRIGGER IF EXISTS handle_pending_case_approval_trigger ON pending_cases;
CREATE TRIGGER handle_pending_case_approval_trigger
  AFTER UPDATE ON pending_cases
  FOR EACH ROW
  WHEN (new.status = 'approved' AND old.status IS DISTINCT FROM 'approved')
  EXECUTE FUNCTION handle_pending_case_approval();

-- Drop and recreate handle_pending_judgment_approval with secure search_path
DROP FUNCTION IF EXISTS handle_pending_judgment_approval() CASCADE;

CREATE OR REPLACE FUNCTION handle_pending_judgment_approval()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF new.status = 'approved' AND (old.status IS NULL OR old.status = 'pending') THEN
    INSERT INTO judgments (
      citation, court, date_of_judgment, country_id,
      categories, summary, document_url, uploaded_by, moderation_status
    )
    SELECT
      citation, court, date_of_judgment, country_id,
      categories, summary, document_url, submitted_by, 'approved'
    FROM pending_judgments
    WHERE id = new.id;
  END IF;
  RETURN new;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Failed to create approved judgment: %', SQLERRM;
    RETURN new;
END;
$$;

-- Recreate trigger
DROP TRIGGER IF EXISTS handle_pending_judgment_approval_trigger ON pending_judgments;
CREATE TRIGGER handle_pending_judgment_approval_trigger
  AFTER UPDATE ON pending_judgments
  FOR EACH ROW
  WHEN (new.status = 'approved' AND old.status IS DISTINCT FROM 'approved')
  EXECUTE FUNCTION handle_pending_judgment_approval();

-- Drop and recreate move_to_cases with secure search_path
DROP FUNCTION IF EXISTS move_to_cases() CASCADE;

CREATE OR REPLACE FUNCTION move_to_cases()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF new.status = 'approved' THEN
    INSERT INTO cases (
      title, nature_of_case, case_filed_country, categories,
      summary, outcome, user_id, document_url, moderation_status
    )
    VALUES (
      new.title, new.nature_of_case, new.country_id, new.categories,
      new.summary, new.outcome, new.submitted_by, new.document_url, 'approved'
    );
    
    DELETE FROM pending_cases WHERE id = new.id;
  END IF;
  RETURN new;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Failed to move case: %', SQLERRM;
    RETURN new;
END;
$$;

-- Drop and recreate transfer_approved_cases with secure search_path
DROP FUNCTION IF EXISTS transfer_approved_cases() CASCADE;

CREATE OR REPLACE FUNCTION transfer_approved_cases()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  transfer_count integer := 0;
BEGIN
  INSERT INTO cases (
    title, nature_of_case, case_filed_country, categories,
    summary, outcome, user_id, document_url, moderation_status
  )
  SELECT
    title, nature_of_case, country_id, categories,
    summary, outcome, submitted_by, document_url, 'approved'
  FROM pending_cases
  WHERE status = 'approved';
  
  GET DIAGNOSTICS transfer_count = ROW_COUNT;
  
  DELETE FROM pending_cases WHERE status = 'approved';
  
  RETURN transfer_count;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Failed to transfer approved cases: %', SQLERRM;
    RETURN 0;
END;
$$;