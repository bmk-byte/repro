/*
  # Update pending_submissions table with additional fields

  1. Changes
    - Add new columns to pending_submissions table to store all form fields
    - Add appropriate constraints for new columns
    - Update existing triggers to handle the new fields
    
  2. Security
    - Maintain existing RLS policies
*/

-- Add new columns for case submissions
ALTER TABLE pending_submissions
ADD COLUMN IF NOT EXISTS timeline_status text,
ADD COLUMN IF NOT EXISTS litigants text[],
ADD COLUMN IF NOT EXISTS defending_institutions text[],
ADD COLUMN IF NOT EXISTS judicial_body_type text,
ADD COLUMN IF NOT EXISTS judicial_body text,
ADD COLUMN IF NOT EXISTS regional_appeals boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS regional_bodies text[],
ADD COLUMN IF NOT EXISTS legal_framework_type text,
ADD COLUMN IF NOT EXISTS domestic_laws text[],
ADD COLUMN IF NOT EXISTS international_laws text[],
ADD COLUMN IF NOT EXISTS protocols text[],
ADD COLUMN IF NOT EXISTS case_impact text,
-- Add case-specific fields
ADD COLUMN IF NOT EXISTS tracking_period text,
ADD COLUMN IF NOT EXISTS programme text,
ADD COLUMN IF NOT EXISTS partner text,
ADD COLUMN IF NOT EXISTS nature_of_case text,
ADD COLUMN IF NOT EXISTS action_taken text,
ADD COLUMN IF NOT EXISTS action_timeframe text,
ADD COLUMN IF NOT EXISTS next_steps text;

-- Add new columns for judgment submissions
ALTER TABLE pending_submissions
ADD COLUMN IF NOT EXISTS media_neutral_citation text,
ADD COLUMN IF NOT EXISTS court_judgment text,
ADD COLUMN IF NOT EXISTS case_number_judgment text,
ADD COLUMN IF NOT EXISTS judges_judgment text,
ADD COLUMN IF NOT EXISTS judgment_date_judgment date,
ADD COLUMN IF NOT EXISTS language_judgment text,
ADD COLUMN IF NOT EXISTS type_judgment text,
ADD COLUMN IF NOT EXISTS flynote_judgment text;

-- Add constraints for timeline_status
ALTER TABLE pending_submissions
ADD CONSTRAINT pending_submissions_timeline_status_check
CHECK (timeline_status IS NULL OR timeline_status IN ('filed', 'ongoing', 'resolved', 'dismissed'));

-- Add constraints for judicial_body_type
ALTER TABLE pending_submissions
ADD CONSTRAINT pending_submissions_judicial_body_type_check
CHECK (judicial_body_type IS NULL OR judicial_body_type IN ('National Court', 'Regional Court'));

-- Add constraints for legal_framework_type
ALTER TABLE pending_submissions
ADD CONSTRAINT pending_submissions_legal_framework_type_check
CHECK (legal_framework_type IS NULL OR legal_framework_type IN ('Domestic Law', 'International Law', 'Both'));

-- Add constraints for language_judgment
ALTER TABLE pending_submissions
ADD CONSTRAINT pending_submissions_language_judgment_check
CHECK (language_judgment IS NULL OR language_judgment IN ('English', 'French', 'Portuguese', 'Swahili'));

-- Add constraints for type_judgment
ALTER TABLE pending_submissions
ADD CONSTRAINT pending_submissions_type_judgment_check
CHECK (type_judgment IS NULL OR type_judgment IN (
  'Final Judgment',
  'Interim Order',
  'Ruling',
  'Consent Judgment',
  'Default Judgment'
));

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