/*
  # Add Rapid Response Case Tracking System

  1. New Columns
    - Add priority_level column to cases table
    - Add key_deadlines column to cases table (jsonb)
    - Add assigned_team_members column to cases table (text[])
    - Add client_name, client_email, client_phone columns to cases table
    
  2. Security
    - Maintain existing RLS policies
*/

-- Add new columns to cases table
ALTER TABLE cases
ADD COLUMN IF NOT EXISTS priority_level text,
ADD COLUMN IF NOT EXISTS key_deadlines jsonb DEFAULT '[]',
ADD COLUMN IF NOT EXISTS assigned_team_members text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS client_name text,
ADD COLUMN IF NOT EXISTS client_email text,
ADD COLUMN IF NOT EXISTS client_phone text;

-- Add check constraint for priority_level
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage 
    WHERE table_name = 'cases' AND column_name = 'priority_level' 
    AND constraint_name = 'cases_priority_level_check'
  ) THEN
    ALTER TABLE cases
    ADD CONSTRAINT cases_priority_level_check
    CHECK (priority_level IS NULL OR priority_level IN ('Urgent', 'High', 'Medium', 'Low'));
  END IF;
END $$;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS cases_priority_level_idx ON cases(priority_level);
CREATE INDEX IF NOT EXISTS cases_assigned_team_members_idx ON cases USING gin(assigned_team_members);

-- Update the rapid_response_stage check constraint to include Intake/Review/Action/Resolution
ALTER TABLE cases DROP CONSTRAINT IF EXISTS cases_rapid_response_stage_check;

ALTER TABLE cases
ADD CONSTRAINT cases_rapid_response_stage_check
CHECK (rapid_response_stage IS NULL OR rapid_response_stage IN (
  'initial_assessment',
  'legal_research',
  'strategy_development',
  'immediate_action',
  'documentation',
  'stakeholder_engagement',
  'implementation',
  'monitoring',
  'evaluation',
  'intake',
  'review',
  'action',
  'resolution'
));