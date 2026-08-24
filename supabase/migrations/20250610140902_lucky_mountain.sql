/*
  # Fix description column mapping in database triggers

  1. Problem
    - Database triggers are trying to insert/update a 'description' column in the 'cases' table
    - The 'cases' table uses 'case_summary' instead of 'description'
    - This causes moderation approval to fail

  2. Solution
    - Update the trigger function to correctly map 'summary' from pending_submissions to 'case_summary' in cases
    - Update the trigger function to correctly map 'summary' from pending_submissions to 'case_summary' in judgments
*/

-- First, let's check and update the create_record_on_approval function
CREATE OR REPLACE FUNCTION create_record_on_approval()
RETURNS TRIGGER AS $$
BEGIN
  -- Only proceed if status changed to 'approved'
  IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
    
    -- Check if this looks like a judgment submission (has citation, court, etc.)
    IF NEW.citation IS NOT NULL OR NEW.court IS NOT NULL OR NEW.judges IS NOT NULL THEN
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
        case_summary,  -- Map summary to case_summary
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
        COALESCE(NEW.citation, ''),
        COALESCE(NEW.media_neutral_citation, ''),
        COALESCE(NEW.court, ''),
        COALESCE(NEW.case_number, ''),
        COALESCE(NEW.judges, ''),
        COALESCE(NEW.judgment_date, CURRENT_DATE),
        COALESCE(NEW.language, 'English'),
        COALESCE(NEW.type, 'Final Judgment'),
        COALESCE(NEW.flynote, ''),
        COALESCE(NEW.summary, NEW.title, ''),  -- Map summary to case_summary
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
        case_summary,  -- Map summary to case_summary
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
        case_outcome,
        pdf_url
      ) VALUES (
        NEW.tracking_period,
        NEW.programme,
        NEW.partner,
        NEW.country_id,
        COALESCE(NEW.title, ''),
        COALESCE(NEW.nature_of_case, ''),
        COALESCE(NEW.action_taken, ''),
        COALESCE(NEW.action_timeframe, ''),
        COALESCE(NEW.status, 'pending'),
        COALESCE(NEW.next_steps, ''),
        NEW.submitted_by,
        'litigation',
        COALESCE(NEW.summary, NEW.title, ''),  -- Map summary to case_summary
        'approved',
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
        NEW.case_outcome,
        NEW.document_url
      );
    END IF;
    
    -- Log the approval in routing audit log
    INSERT INTO routing_audit_log (submission_id, decision, reason)
    VALUES (NEW.id, 'approved', 'Approved by moderator');
    
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Also update the move_to_cases function if it exists
CREATE OR REPLACE FUNCTION move_to_cases()
RETURNS TRIGGER AS $$
BEGIN
  -- Only proceed if status changed to 'approved'
  IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
    
    -- Check if this looks like a judgment submission
    IF NEW.citation IS NOT NULL OR NEW.court IS NOT NULL OR NEW.judges IS NOT NULL THEN
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
        case_summary,  -- Map summary to case_summary
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
        COALESCE(NEW.citation, ''),
        COALESCE(NEW.media_neutral_citation, ''),
        COALESCE(NEW.court, ''),
        COALESCE(NEW.case_number, ''),
        COALESCE(NEW.judges, ''),
        COALESCE(NEW.judgment_date, CURRENT_DATE),
        COALESCE(NEW.language, 'English'),
        COALESCE(NEW.type, 'Final Judgment'),
        COALESCE(NEW.flynote, ''),
        COALESCE(NEW.summary, NEW.title, ''),  -- Map summary to case_summary
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
        case_summary,  -- Map summary to case_summary
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
        case_outcome,
        pdf_url
      ) VALUES (
        NEW.tracking_period,
        NEW.programme,
        NEW.partner,
        NEW.country_id,
        COALESCE(NEW.title, ''),
        COALESCE(NEW.nature_of_case, ''),
        COALESCE(NEW.action_taken, ''),
        COALESCE(NEW.action_timeframe, ''),
        COALESCE(NEW.status, 'pending'),
        COALESCE(NEW.next_steps, ''),
        NEW.submitted_by,
        'litigation',
        COALESCE(NEW.summary, NEW.title, ''),  -- Map summary to case_summary
        'approved',
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
        NEW.case_outcome,
        NEW.document_url
      );
    END IF;
    
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;