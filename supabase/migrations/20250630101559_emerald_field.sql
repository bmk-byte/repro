/*
  # Fix approval routing for pending submissions

  1. Problem
    - When approving pending submissions, the system incorrectly tries to insert all submissions into the judgments table
    - This causes constraint violations when the submission is actually a case, not a judgment
    - The 'type' field values don't match the judgments table constraints

  2. Solution
    - Update the approval trigger function to properly route submissions based on their actual type
    - Cases should go to the 'cases' table
    - Judgments should go to the 'judgments' table with proper type mapping
    - Use the correct field mappings for each table type

  3. Changes
    - Replace the existing approval function with proper routing logic
    - Add proper field mapping for both cases and judgments
    - Ensure constraint compliance for both target tables
*/

-- Drop the existing trigger and function
DROP TRIGGER IF EXISTS create_record_on_approval_trigger ON pending_submissions;
DROP FUNCTION IF EXISTS create_record_on_approval();

-- Create the new approval function with proper routing
CREATE OR REPLACE FUNCTION create_record_on_approval()
RETURNS TRIGGER AS $$
BEGIN
  -- Only process when status changes to 'approved'
  IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
    
    -- Check if this is a judgment submission (has judgment-specific fields)
    IF NEW.citation IS NOT NULL OR NEW.judgment_date IS NOT NULL OR NEW.judges IS NOT NULL THEN
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
        COALESCE(NEW.citation, 'Not specified'),
        COALESCE(NEW.media_neutral_citation, 'Not specified'),
        COALESCE(NEW.court, 'Not specified'),
        COALESCE(NEW.case_number_judgement, NEW.case_number, 'Not specified'),
        COALESCE(NEW.judges, 'Not specified'),
        COALESCE(NEW.judgment_date, CURRENT_DATE),
        COALESCE(NEW.language, 'English'),
        -- Map the type field to valid judgment types
        CASE 
          WHEN NEW.type = 'Final Judgment' THEN 'Final Judgment'
          WHEN NEW.type = 'Interim Order' THEN 'Interim Order'
          WHEN NEW.type = 'Ruling' THEN 'Ruling'
          WHEN NEW.type = 'Consent Judgment' THEN 'Consent Judgment'
          WHEN NEW.type = 'Default Judgment' THEN 'Default Judgment'
          ELSE 'Final Judgment' -- Default fallback
        END,
        COALESCE(NEW.flynote, 'Not specified'),
        COALESCE(NEW.summary, 'Not specified'),
        COALESCE(NEW.document_url, ''),
        NEW.uploaded_by,
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
      -- Insert into cases table
      INSERT INTO cases (
        title,
        tracking_period,
        programme,
        partner,
        country_id,
        case_filed,
        nature_of_case,
        action_taken,
        action_timeframe,
        status,
        next_steps,
        user_id,
        case_type,
        comments,
        pdf_url,
        case_summary,
        court,
        moderation_status,
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
        case_outcome
      ) VALUES (
        COALESCE(NEW.title, 'Untitled Case'),
        NEW.tracking_period,
        NEW.programme,
        NEW.partner,
        NEW.country_id,
        COALESCE(NEW.status, 'Filed'), -- Use status as case_filed
        COALESCE(NEW.nature_of_case, 'Not specified'),
        COALESCE(NEW.action_taken, 'Not specified'),
        COALESCE(NEW.action_timeframe, 'Not specified'),
        COALESCE(NEW.status, 'Active'),
        COALESCE(NEW.next_steps, 'Not specified'),
        NEW.submitted_by,
        'litigation', -- Default case type
        NEW.summary, -- Use summary as comments
        NEW.document_url,
        NEW.summary,
        NEW.court,
        'approved', -- Set as approved since we're processing an approval
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
        COALESCE(NEW.case_categories, '{}'),
        NEW.case_outcome
      );
    END IF;
    
    -- Delete the processed submission
    DELETE FROM pending_submissions WHERE id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
CREATE TRIGGER create_record_on_approval_trigger
  AFTER UPDATE ON pending_submissions
  FOR EACH ROW
  EXECUTE FUNCTION create_record_on_approval();