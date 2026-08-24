-- Update the create_record_on_approval function to use all available fields
CREATE OR REPLACE FUNCTION create_record_on_approval()
RETURNS TRIGGER AS $$
DECLARE
  case_id uuid;
BEGIN
  IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
    IF NEW.type = 'case' THEN
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
        -- New fields
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
        case_categories
      ) VALUES (
        NEW.title,
        NEW.summary,
        NEW.country_id,
        NEW.submitted_by,
        NEW.document_url,
        COALESCE(NEW.status, 'pending'),
        'litigation', -- Default case type
        'approved',
        NEW.submission_date,
        -- New fields
        NEW.tracking_period,
        NEW.programme,
        NEW.partner,
        NEW.nature_of_case,
        NEW.action_taken,
        NEW.action_timeframe,
        NEW.next_steps,
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
      ) RETURNING id INTO case_id;

    ELSIF NEW.type = 'judgment' THEN
      INSERT INTO judgments (
        citation,
        case_summary,
        country_id,
        uploaded_by,
        file_url,
        created_at,
        -- Use actual judgment fields instead of placeholders
        media_neutral_citation,
        court,
        case_number,
        judges,
        judgment_date,
        language,
        type,
        flynote,
        -- Additional fields
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
        NEW.title,
        NEW.summary,
        NEW.country_id,
        NEW.submitted_by,
        NEW.document_url,
        NEW.submission_date,
        -- Use actual judgment fields instead of placeholders
        COALESCE(NEW.media_neutral_citation, 'N/A'),
        COALESCE(NEW.court_judgment, 'N/A'),
        COALESCE(NEW.case_number_judgment, 'N/A'),
        COALESCE(NEW.judges_judgment, 'N/A'),
        COALESCE(NEW.judgment_date_judgment, NEW.submission_date),
        COALESCE(NEW.language_judgment, 'English'),
        COALESCE(NEW.type_judgment, 'Final Judgment'),
        COALESCE(NEW.flynote_judgment, NEW.summary),
        -- Additional fields
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
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;