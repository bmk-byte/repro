/*
  # Fix Permissions and Relationships for Moderation

  1. Changes
    - Add RLS policies for moderators to access data
    - Fix foreign key relationship for law_documents
    - Update relationship between pending_submissions and auth.users
    
  2. Security
    - Maintain existing RLS policies
    - Add new policies for authorized users
*/

-- Drop existing foreign key if it exists
ALTER TABLE law_documents
DROP CONSTRAINT IF EXISTS law_documents_uploaded_by_fkey;

-- Add new foreign key constraint to auth.users
ALTER TABLE law_documents
ADD CONSTRAINT law_documents_uploaded_by_fkey
FOREIGN KEY (uploaded_by)
REFERENCES auth.users(id);

-- Update RLS policies for law_documents
DROP POLICY IF EXISTS "Moderators can read all law documents" ON law_documents;
CREATE POLICY "Moderators can read all law documents"
  ON law_documents
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid()
      AND email LIKE '%@afyanahaki.org'
    )
  );

-- Update RLS policies for pending_submissions
DROP POLICY IF EXISTS "Reviewers can view all submissions" ON pending_submissions;
DROP POLICY IF EXISTS "Reviewers can update submissions" ON pending_submissions;

CREATE POLICY "Reviewers can view all submissions"
  ON pending_submissions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid()
      AND email LIKE '%@afyanahaki.org'
    )
  );

CREATE POLICY "Reviewers can update submissions"
  ON pending_submissions
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid()
      AND email LIKE '%@afyanahaki.org'
    )
  );