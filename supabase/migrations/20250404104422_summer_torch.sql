/*
  # Add Stage Notes Column

  1. Changes
    - Add stage_notes column to cases table for tracking stage-specific notes
*/

ALTER TABLE cases
ADD COLUMN stage_notes text;