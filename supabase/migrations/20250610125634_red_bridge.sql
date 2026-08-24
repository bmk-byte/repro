/*
  # Fix moderation approval column mapping

  1. Problem
    - Database trigger trying to insert 'title' column into 'cases' table
    - 'cases' table uses 'case_filed' instead of 'title'
    - Need to fix the mapping in the approval trigger function

  2. Solution
    - Update the trigger function to correctly map pending_submissions.title to cases.case_filed
    - Ensure all other column mappings are correct between the two tables
*/

-- First, let's check if the function exists and drop it if it does
DROP FUNCTION IF EXISTS create_record_on_approval() CASCADE;

-- Recreate the function with correct column mapping
CREATE OR REPLACE FUNCTION create_record_on_approval()
RETURNS TRIGGER AS $$
BEGIN
  -- Only proceed if status changed to 'approved'
  IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
    
    -- Check if this is a judgment submission (has citation, court, etc.)
    IF NEW.citation IS NOT NULL AND NEW.court IS NOT NULL THEN
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
        NEW.citation,
        NEW.media_neutral_citation,
        NEW.title, -- Use title as court name if court is not provided
        NEW.case_number,
        NEW.judges,
        NEW.judgment_date,
        NEW.language,
        NEW.type,
        NEW.flynote,
        NEW.summary, -- Map summary to case_summary
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
      -- Insert into cases table with correct column mapping
      INSERT INTO cases (
        case_filed, -- Map title to case_filed
        tracking_period,
        programme,
        partner,
        country_id,
        nature_of_case,
        action_taken,
        action_timeframe,
        status,
        next_steps,
        user_id,
        case_type,
        case_summary,
        pdf_url,
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
        moderation_status
      ) VALUES (
        NEW.title, -- Map title to case_filed
        NEW.tracking_period,
        NEW.programme,
        NEW.partner,
        NEW.country_id,
        NEW.nature_of_case,
        NEW.action_taken,
        NEW.action_timeframe,
        COALESCE(NEW.status, 'pending'), -- Use submission status or default
        NEW.next_steps,
        NEW.submitted_by, -- Map submitted_by to user_id
        'litigation', -- Default case type
        NEW.summary, -- Map summary to case_summary
        NEW.document_url, -- Map document_url to pdf_url
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
        'approved' -- Set moderation status to approved
      );
    END IF;
    
    -- Log the approval in routing audit log
    INSERT INTO routing_audit_log (
      submission_id,
      decision,
      reason,
      created_at
    ) VALUES (
      NEW.id,
      'approved',
      'Submission approved and moved to main database',
      NOW()
    );
    
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger
DROP TRIGGER IF EXISTS create_record_on_approval_trigger ON pending_submissions;

CREATE TRIGGER create_record_on_approval_trigger
  AFTER UPDATE ON pending_submissions
  FOR EACH ROW
  EXECUTE FUNCTION create_record_on_approval();

-- Also ensure the routing function exists and works correctly
CREATE OR REPLACE FUNCTION handle_submission_routing()
RETURNS TRIGGER AS $$
BEGIN
  -- Log the routing decision
  INSERT INTO routing_audit_log (
    submission_id,
    decision,
    reason
  ) VALUES (
    NEW.id,
    'review_queue',
    'New submission routed to moderation queue'
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Ensure the routing trigger exists
DROP TRIGGER IF EXISTS handle_submission_routing_trigger ON pending_submissions;

CREATE TRIGGER handle_submission_routing_trigger
  AFTER INSERT ON pending_submissions
  FOR EACH ROW
  EXECUTE FUNCTION handle_submission_routing();