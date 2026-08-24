/*
  # Add file_url to law_documents table

  1. Changes
    - Add file_url column to law_documents table
    - Remove content column as it's no longer needed
    - Add description column for better document metadata
*/

-- Remove content column and add file_url and description
ALTER TABLE law_documents
DROP COLUMN IF EXISTS content,
ADD COLUMN IF NOT EXISTS file_url text,
ADD COLUMN IF NOT EXISTS description text;

-- Make file_url required
ALTER TABLE law_documents
ALTER COLUMN file_url SET NOT NULL;