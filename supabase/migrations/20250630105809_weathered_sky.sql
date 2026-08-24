/*
  # Fix Judgment Type Constraint

  1. Changes
    - Update the judgments_type_check constraint to handle more flexible type values
    - Add additional valid judgment types to support the moderation workflow
    - Ensure backward compatibility with existing records
    
  2. Security
    - Maintain existing RLS policies
*/

-- First, drop the existing constraint
ALTER TABLE judgments DROP CONSTRAINT IF EXISTS judgments_type_check;

-- Add the updated constraint with more flexible type options
ALTER TABLE judgments
ADD CONSTRAINT judgments_type_check
CHECK (type IN (
  'Final Judgment',
  'Interim Order',
  'Ruling',
  'Consent Judgment',
  'Consent', -- Add shorter version
  'Default Judgment',
  'Default' -- Add shorter version
));

-- Update the create_record_on_approval function to handle judgment types properly
CREATE OR REPLACE FUNCTION create_record_on_approval()
RETURNS TRIGGER AS $$
DECLARE
  judgment_type text;
BEGIN
  -- Only proceed if status changed to 'approved'
  IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
    
    -- Check if this is a judgment submission
    IF NEW.type = 'judgment' THEN
      -- Map judgment type to a valid value
      judgment_type := CASE 
        WHEN NEW.type_judgment = 'Final Judgment' THEN 'Final Judgment'
        WHEN NEW.type_judgment = 'Interim Order' THEN 'Interim Order'
        WHEN NEW.type_judgment = 'Ruling' THEN 'Ruling'
        WHEN NEW.type_judgment = 'Consent Judgment' OR NEW.type_judgment = 'Consent' THEN 'Consent Judgment'
        WHEN NEW.type_judgment = 'Default Judgment' OR NEW.type_judgment = 'Default' THEN 'Default Judgment'
        ELSE 'Final Judgment' -- Default fallback
      END;
      
      -- Insert into judgments table
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
      ) VALUES (
        COALESCE(NEW.citation, NEW.title, 'Not specified'),
        COALESCE(NEW.media_neutral_citation, 'Not specified'),
        COALESCE(NEW.court_judgment, NEW.court, 'Not specified'),
        COALESCE(NEW.case_number_judgment, 'Not specified'),
        COALESCE(NEW.judges_judgment, 'Not specified'),
        COALESCE(NEW.judgment_date_judgment, CURRENT_DATE),
        COALESCE(NEW.language_judgment, 'English'),
        judgment_type,
        COALESCE(NEW.flynote_judgment, 'Not specified'),
        COALESCE(NEW.summary, 'Not specified'),
        COALESCE(NEW.document_url, ''),
        NEW.submitted_by,
        NEW.country_id,
        NEW.timeline_status,
        NEW.litigants,
        NEW.defending_institutions,
        NEW.judicial_body_type,
        NEW.judicial_body,
        COALESCE(NEW.regional_appeals, false),
        NEW.regional_bodies,
        NEW.legal_framework_type,
        NEW.domestic_laws,
        NEW.international_laws,
        NEW.protocols,
        NEW.case_impact,
        COALESCE(NEW.case_categories, '{}')
      );
    ELSE
      -- This is a case submission - insert into cases table
      INSERT INTO cases (
        case_filed,
        case_summary,
        country_id,
        user_id,
        pdf_url,
        status,
        case_type,
        moderation_status,
        created_at,
        tracking_period,
        programme,
        partner,
        nature_of_case,
        action_taken,
        action_timeframe,
        next_steps,
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
        case_categories,
        case_outcome,
        court
      ) VALUES (
        COALESCE(NEW.title, 'Untitled Case'),
        COALESCE(NEW.summary, ''),
        NEW.country_id,
        NEW.submitted_by,
        COALESCE(NEW.document_url, ''),
        'pending',
        'litigation',
        'approved',
        NEW.submission_date,
        NEW.tracking_period,
        NEW.programme,
        NEW.partner,
        COALESCE(NEW.nature_of_case, 'Not specified'),
        COALESCE(NEW.action_taken, 'Not specified'),
        COALESCE(NEW.action_timeframe, 'Not specified'),
        COALESCE(NEW.next_steps, 'Not specified'),
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
        NEW.case_categories,
        NEW.case_outcome,
        NEW.court
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger
DROP TRIGGER IF EXISTS create_record_on_approval_trigger ON pending_submissions;
CREATE TRIGGER create_record_on_approval_trigger
  AFTER UPDATE ON pending_submissions
  FOR EACH ROW
  WHEN (NEW.status = 'approved' AND OLD.status != 'approved')
  EXECUTE FUNCTION create_record_on_approval();