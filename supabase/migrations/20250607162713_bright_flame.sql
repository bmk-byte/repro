/*
  # Fix Record Creation on Approval

  1. Changes
    - Update create_record_on_approval function to handle NULL values
    - Use COALESCE to provide default values for NOT NULL columns
    - Improve error handling and logging
    
  2. Security
    - Maintain existing RLS policies
*/

-- Update the create_record_on_approval function to handle NULL values
CREATE OR REPLACE FUNCTION create_record_on_approval()
RETURNS TRIGGER AS $$
DECLARE
  case_id uuid;
  error_message text;
BEGIN
  -- Wrap the record creation in a BEGIN/EXCEPTION block to catch errors
  BEGIN
    -- Process the approved submission
    IF NEW.status = 'approved' AND (TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.status != 'approved')) THEN
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
          -- Required fields with NOT NULL constraints
          tracking_period,
          programme,
          partner,
          nature_of_case,
          action_taken,
          action_timeframe,
          next_steps,
          -- Optional fields
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
          COALESCE(NEW.summary, ''),
          NEW.country_id,
          NEW.submitted_by,
          NEW.document_url,
          'pending',
          'litigation',
          'approved',
          NEW.submission_date,
          -- Required fields with NOT NULL constraints - use COALESCE to provide defaults
          COALESCE(NEW.tracking_period, 'Not specified'),
          COALESCE(NEW.programme, 'Not specified'),
          COALESCE(NEW.partner, 'Not specified'),
          COALESCE(NEW.nature_of_case, 'Not specified'),
          COALESCE(NEW.action_taken, 'Not specified'),
          COALESCE(NEW.action_timeframe, 'Not specified'),
          COALESCE(NEW.next_steps, 'Not specified'),
          -- Optional fields
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

        -- Log successful case creation
        INSERT INTO routing_audit_log (
          submission_id,
          decision,
          reason
        ) VALUES (
          NEW.id,
          'case_created',
          'Case record created successfully with ID: ' || case_id
        );

      ELSIF NEW.type = 'judgment' THEN
        INSERT INTO judgments (
          citation,
          case_summary,
          country_id,
          uploaded_by,
          file_url,
          created_at,
          -- Use actual judgment fields
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
          COALESCE(NEW.summary, ''),
          NEW.country_id,
          NEW.submitted_by,
          COALESCE(NEW.document_url, ''),
          NEW.submission_date,
          -- Use actual judgment fields with COALESCE for NOT NULL constraints
          COALESCE(NEW.media_neutral_citation, 'Not specified'),
          COALESCE(NEW.court_judgment, 'Not specified'),
          COALESCE(NEW.case_number_judgment, 'Not specified'),
          COALESCE(NEW.judges_judgment, 'Not specified'),
          COALESCE(NEW.judgment_date_judgment, NEW.submission_date),
          COALESCE(NEW.language_judgment, 'English'),
          COALESCE(NEW.type_judgment, 'Final Judgment'),
          COALESCE(NEW.flynote_judgment, NEW.summary, 'Not specified'),
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

        -- Log successful judgment creation
        INSERT INTO routing_audit_log (
          submission_id,
          decision,
          reason
        ) VALUES (
          NEW.id,
          'judgment_created',
          'Judgment record created successfully'
        );
      END IF;
    END IF;
    
    RETURN NEW;
    
  EXCEPTION WHEN OTHERS THEN
    -- Capture the error message
    error_message := SQLERRM;
    
    -- Update the submission with the error message
    UPDATE pending_submissions
    SET 
      status = 'failed',
      feedback = 'Error creating record: ' || error_message
    WHERE id = NEW.id;
    
    -- Log the error to the routing_audit_log
    INSERT INTO routing_audit_log (
      submission_id,
      decision,
      reason
    ) VALUES (
      NEW.id,
      'failed',
      'Error during record creation: ' || error_message
    );
    
    -- Return the original NEW record to allow the update to proceed
    RETURN NEW;
  END;
END;
$$ LANGUAGE plpgsql;