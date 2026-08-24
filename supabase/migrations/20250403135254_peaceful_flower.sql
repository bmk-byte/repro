/*
  # Add case type and comments fields to cases table

  1. Changes
    - Add case_type column to cases table
    - Add comments column to cases table
    - Add check constraint for case_type values

  2. Security
    - Maintain existing RLS policies
*/

ALTER TABLE cases
ADD COLUMN case_type text NOT NULL DEFAULT 'litigation',
ADD COLUMN comments text;

-- Add check constraint for case_type
ALTER TABLE cases
ADD CONSTRAINT cases_case_type_check
CHECK (case_type IN ('litigation', 'rapid-response'));