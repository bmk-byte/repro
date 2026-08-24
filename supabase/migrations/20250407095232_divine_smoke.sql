/*
  # Add Case Repository Fields

  1. Changes
    - Add new columns to cases table for repository functionality
    - Add check constraints for new fields

  2. Security
    - Maintain existing RLS policies
*/

ALTER TABLE cases
ADD COLUMN themes text[] DEFAULT '{}',
ADD COLUMN jurisdiction text,
ADD COLUMN court_level text,
ADD COLUMN outcome text,
ADD COLUMN legal_instruments text[] DEFAULT '{}';

-- Add check constraints
ALTER TABLE cases
ADD CONSTRAINT cases_court_level_check
CHECK (court_level IN (
  'Trial courts',
  'Appellate courts',
  'Constitutional/Supreme courts'
));

ALTER TABLE cases
ADD CONSTRAINT cases_outcome_check
CHECK (outcome IN (
  'Won',
  'Lost',
  'Settled',
  'Ongoing',
  'Dismissed'
));

-- Create index for better search performance
CREATE INDEX cases_themes_idx ON cases USING GIN (themes);
CREATE INDEX cases_legal_instruments_idx ON cases USING GIN (legal_instruments);
CREATE INDEX cases_jurisdiction_idx ON cases (jurisdiction);
CREATE INDEX cases_court_level_idx ON cases (court_level);
CREATE INDEX cases_outcome_idx ON cases (outcome);