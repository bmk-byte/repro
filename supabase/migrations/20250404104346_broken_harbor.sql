/*
  # Add Rapid Response Stage Column

  1. Changes
    - Add rapid_response_stage column to cases table
    - Add check constraint for valid stages
*/

ALTER TABLE cases
ADD COLUMN rapid_response_stage text;

-- Add check constraint for rapid_response_stage values
ALTER TABLE cases
ADD CONSTRAINT cases_rapid_response_stage_check
CHECK (rapid_response_stage IN (
  'initial_assessment',
  'legal_research',
  'strategy_development',
  'immediate_action',
  'documentation',
  'stakeholder_engagement',
  'implementation',
  'monitoring',
  'evaluation'
));