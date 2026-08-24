/*
  # Add Client Satisfaction Score to Cases

  1. Changes
    - Add client_satisfaction column to cases table
    - Add satisfaction_notes column to cases table
    - Add check constraint for client_satisfaction values (1-5)

  2. Security
    - Maintain existing RLS policies
*/

ALTER TABLE cases
ADD COLUMN client_satisfaction integer,
ADD COLUMN satisfaction_notes text;

-- Add check constraint for client_satisfaction score (1-5)
ALTER TABLE cases
ADD CONSTRAINT cases_client_satisfaction_check
CHECK (client_satisfaction >= 1 AND client_satisfaction <= 5);