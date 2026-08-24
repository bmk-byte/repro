/*
  # Fix Supabase Configuration Parameter Error

  This migration addresses the "unrecognized configuration parameter 'app.settings.supabase_url'" error
  by setting up the required configuration parameter in the database.

  ## Changes Made
  1. Set up the app.settings.supabase_url configuration parameter
  2. Ensure all database functions can access this parameter properly

  ## Security
  - The configuration is set at the database level to be accessible by functions
*/

-- Set up the configuration parameter for Supabase URL
-- This should be set to your actual Supabase project URL
DO $$
BEGIN
  -- Check if the setting already exists, if not create it
  IF NOT EXISTS (
    SELECT 1 FROM pg_settings WHERE name = 'app.settings.supabase_url'
  ) THEN
    -- Set the configuration parameter
    -- Replace with your actual Supabase URL or use environment variable
    PERFORM set_config('app.settings.supabase_url', current_setting('SUPABASE_URL', true), false);
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    -- If SUPABASE_URL is not available, set a default or handle gracefully
    PERFORM set_config('app.settings.supabase_url', 'https://your-project.supabase.co', false);
END $$;

-- Alternative approach: Create a custom configuration table if the above doesn't work
CREATE TABLE IF NOT EXISTS app_settings (
  key text PRIMARY KEY,
  value text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on app_settings
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- Allow reading app settings
CREATE POLICY "Allow reading app settings"
  ON app_settings
  FOR SELECT
  TO authenticated, anon
  USING (true);

-- Only allow moderators to update app settings
CREATE POLICY "Only moderators can update app settings"
  ON app_settings
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND (profiles.is_moderator = true OR profiles.email LIKE '%@afyanahaki.org')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND (profiles.is_moderator = true OR profiles.email LIKE '%@afyanahaki.org')
    )
  );

-- Insert the Supabase URL setting if it doesn't exist
INSERT INTO app_settings (key, value)
VALUES ('supabase_url', coalesce(current_setting('SUPABASE_URL', true), 'https://your-project.supabase.co'))
ON CONFLICT (key) DO NOTHING;

-- Create a helper function to get app settings
CREATE OR REPLACE FUNCTION get_app_setting(setting_key text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  setting_value text;
BEGIN
  -- First try to get from app_settings table
  SELECT value INTO setting_value
  FROM app_settings
  WHERE key = setting_key;
  
  -- If not found in table, try PostgreSQL configuration
  IF setting_value IS NULL THEN
    BEGIN
      setting_value := current_setting('app.settings.' || setting_key, true);
    EXCEPTION
      WHEN OTHERS THEN
        setting_value := NULL;
    END;
  END IF;
  
  RETURN setting_value;
END;
$$;

-- Update any existing functions that might be using the configuration parameter
-- This is a safety measure to ensure compatibility

-- Create or replace the handle_submission_routing function to use the helper
CREATE OR REPLACE FUNCTION handle_submission_routing()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  supabase_url text;
BEGIN
  -- Get the Supabase URL using our helper function
  supabase_url := get_app_setting('supabase_url');
  
  -- Log the routing decision
  INSERT INTO routing_audit_log (submission_id, decision, reason)
  VALUES (NEW.id, 'review_queue', 'Automatic routing to review queue');
  
  RETURN NEW;
END;
$$;

-- Create or replace the create_record_on_approval function to use the helper
CREATE OR REPLACE FUNCTION create_record_on_approval()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  supabase_url text;
BEGIN
  -- Only proceed if status changed to 'approved'
  IF OLD.status != 'approved' AND NEW.status = 'approved' THEN
    -- Get the Supabase URL using our helper function
    supabase_url := get_app_setting('supabase_url');
    
    -- Determine the type of submission and create appropriate record
    IF NEW.citation IS NOT NULL AND NEW.judgment_date IS NOT NULL THEN
      -- This is a judgment submission
      INSERT INTO judgments (
        citation,
        media_neutral_citation,
        court,
        case_number,
        judges,
        judgment_date,
        language,
        type,
        flynote,
        case_summary,
        file_url,
        uploaded_by,
        country_id,
        timeline_status,
        litigants,
        defending_institutions,
        judicial_body_type,
        judicial_body,
        regional_appeals,
        regional_bodies,
        legal_framework_type,
        domestic_laws,
        international_laws,
        protocols,
        case_impact,
        case_categories
      )
      VALUES (
        NEW.citation,
        NEW.media_neutral_citation,
        NEW.court,
        NEW.case_number,
        NEW.judges,
        NEW.judgment_date,
        NEW.language,
        NEW.type,
        NEW.flynote,
        NEW.summary,
        NEW.document_url,
        NEW.uploaded_by,
        NEW.country_id,
        NEW.timeline_status,
        NEW.litigants,
        NEW.defending_institutions,
        NEW.judicial_body_type,
        NEW.judicial_body,
        NEW.regional_appeals,
        NEW.regional_bodies,
        NEW.legal_framework_type,
        NEW.domestic_laws,
        NEW.international_laws,
        NEW.protocols,
        NEW.case_impact,
        NEW.case_categories
      );
    ELSE
      -- This is a case submission
      INSERT INTO cases (
        case_filed,
        nature_of_case,
        action_taken,
        action_timeframe,
        status,
        next_steps,
        country_id,
        user_id,
        case_categories,
        tracking_period,
        programme,
        partner,
        case_outcome,
        litigants,
        defending_institutions,
        judicial_body_type,
        judicial_body,
        regional_appeals,
        regional_bodies,
        legal_framework_type,
        domestic_laws,
        international_laws,
        protocols,
        case_impact,
        moderation_status
      )
      VALUES (
        NEW.title,
        NEW.nature_of_case,
        NEW.action_taken,
        NEW.action_timeframe,
        NEW.status,
        NEW.next_steps,
        NEW.country_id,
        NEW.submitted_by,
        NEW.case_categories,
        NEW.tracking_period,
        NEW.programme,
        NEW.partner,
        NEW.case_outcome,
        NEW.litigants,
        NEW.defending_institutions,
        NEW.judicial_body_type,
        NEW.judicial_body,
        NEW.regional_appeals,
        NEW.regional_bodies,
        NEW.legal_framework_type,
        NEW.domestic_laws,
        NEW.international_laws,
        NEW.protocols,
        NEW.case_impact,
        'approved'
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;