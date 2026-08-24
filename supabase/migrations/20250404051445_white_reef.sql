/*
  # Add PDF attachment field to cases table

  1. Changes
    - Add pdf_url column to cases table
    
  2. Security
    - Maintain existing RLS policies
*/

ALTER TABLE cases
ADD COLUMN pdf_url text;