/*
  # Add uploaded_by column to law_documents table

  1. Changes
    - Add `uploaded_by` column to `law_documents` table
    - Add foreign key constraint to reference auth.users table
    - Add index for better query performance

  2. Security
    - No changes to RLS policies needed as they are already in place
*/

ALTER TABLE law_documents
ADD COLUMN uploaded_by uuid REFERENCES auth.users(id);

CREATE INDEX law_documents_uploaded_by_idx ON law_documents(uploaded_by);