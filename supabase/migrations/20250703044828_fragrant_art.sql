/*
  # Prevent Duplicate Case and Judgment Submissions

  1. Changes
    - Add unique constraints to pending_cases table
    - Add unique constraints to pending_judgments table
    - Create indexes to improve query performance
    
  2. Security
    - Maintain existing RLS policies
*/

-- Add unique constraint to pending_cases table
ALTER TABLE pending_cases
ADD CONSTRAINT pending_cases_unique_submission
UNIQUE (title, country_id, nature_of_case);

-- Add unique constraint to pending_judgments table
ALTER TABLE pending_judgments
ADD CONSTRAINT pending_judgments_unique_submission
UNIQUE (citation, country_id, court_judgment, judgment_date_judgment);

-- Create function to check for duplicates before insert
CREATE OR REPLACE FUNCTION check_duplicate_submission()
RETURNS TRIGGER AS $$
BEGIN
  -- For case submissions
  IF TG_TABLE_NAME = 'pending_cases' THEN
    -- Check if a similar case already exists
    IF EXISTS (
      SELECT 1 FROM pending_cases
      WHERE 
        LOWER(title) = LOWER(NEW.title) AND
        country_id = NEW.country_id AND
        LOWER(nature_of_case) = LOWER(NEW.nature_of_case) AND
        id != NEW.id
    ) THEN
      RAISE EXCEPTION 'A similar case has already been submitted for review';
    END IF;
    
    -- Also check if it exists in the main cases table
    IF EXISTS (
      SELECT 1 FROM cases
      WHERE 
        LOWER(case_filed) = LOWER(NEW.title) AND
        country_id = NEW.country_id AND
        LOWER(nature_of_case) = LOWER(NEW.nature_of_case)
    ) THEN
      RAISE EXCEPTION 'This case already exists in the database';
    END IF;
  
  -- For judgment submissions
  ELSIF TG_TABLE_NAME = 'pending_judgments' THEN
    -- Check if a similar judgment already exists
    IF EXISTS (
      SELECT 1 FROM pending_judgments
      WHERE 
        LOWER(citation) = LOWER(NEW.citation) AND
        country_id = NEW.country_id AND
        LOWER(court_judgment) = LOWER(NEW.court_judgment) AND
        judgment_date_judgment = NEW.judgment_date_judgment AND
        id != NEW.id
    ) THEN
      RAISE EXCEPTION 'A similar judgment has already been submitted for review';
    END IF;
    
    -- Also check if it exists in the main judgments table
    IF EXISTS (
      SELECT 1 FROM judgments
      WHERE 
        LOWER(citation) = LOWER(NEW.citation) AND
        country_id = NEW.country_id AND
        LOWER(court) = LOWER(NEW.court_judgment) AND
        judgment_date = NEW.judgment_date_judgment
    ) THEN
      RAISE EXCEPTION 'This judgment already exists in the database';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers to check for duplicates
CREATE TRIGGER check_duplicate_case_trigger
  BEFORE INSERT OR UPDATE ON pending_cases
  FOR EACH ROW
  EXECUTE FUNCTION check_duplicate_submission();

CREATE TRIGGER check_duplicate_judgment_trigger
  BEFORE INSERT OR UPDATE ON pending_judgments
  FOR EACH ROW
  EXECUTE FUNCTION check_duplicate_submission();

-- Create indexes to improve performance of duplicate checks
CREATE INDEX IF NOT EXISTS idx_pending_cases_title_country_nature ON pending_cases (LOWER(title), country_id, LOWER(nature_of_case));
CREATE INDEX IF NOT EXISTS idx_pending_judgments_citation_country_court_date ON pending_judgments (LOWER(citation), country_id, LOWER(court_judgment), judgment_date_judgment);
CREATE INDEX IF NOT EXISTS idx_cases_case_filed_country_nature ON cases (LOWER(case_filed), country_id, LOWER(nature_of_case));
CREATE INDEX IF NOT EXISTS idx_judgments_citation_country_court_date ON judgments (LOWER(citation), country_id, LOWER(court), judgment_date);