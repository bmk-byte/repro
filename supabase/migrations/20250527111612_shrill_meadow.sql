-- Drop existing foreign key if it exists
ALTER TABLE pending_submissions
DROP CONSTRAINT IF EXISTS pending_submissions_submitted_by_fkey;

-- Add new foreign key constraint
ALTER TABLE pending_submissions
ADD CONSTRAINT pending_submissions_submitted_by_fkey
FOREIGN KEY (submitted_by)
REFERENCES auth.users(id);

-- Update the query in ReviewSubmissionsPage to use auth.users
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