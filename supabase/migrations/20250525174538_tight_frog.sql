-- Drop existing table if it exists
DROP TABLE IF EXISTS pending_submissions;

-- Create pending_submissions table
CREATE TABLE pending_submissions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  summary text NOT NULL,
  tags text[] DEFAULT '{}',
  document_url text,
  submitted_by uuid REFERENCES profiles(id),
  submission_date timestamptz DEFAULT now(),
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  type text NOT NULL CHECK (type IN ('case', 'judgment')),
  feedback text,
  country_id uuid REFERENCES countries(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE pending_submissions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own submissions"
  ON pending_submissions
  FOR SELECT
  TO authenticated
  USING (submitted_by = auth.uid());

CREATE POLICY "Users can create submissions"
  ON pending_submissions
  FOR INSERT
  TO authenticated
  WITH CHECK (submitted_by = auth.uid());

CREATE POLICY "Reviewers can view all submissions"
  ON pending_submissions
  FOR SELECT
  TO authenticated
  USING (
    (SELECT email FROM auth.users WHERE id = auth.uid()) LIKE '%@afyanahaki.org'
  );

CREATE POLICY "Reviewers can update submissions"
  ON pending_submissions
  FOR UPDATE
  TO authenticated
  USING (
    (SELECT email FROM auth.users WHERE id = auth.uid()) LIKE '%@afyanahaki.org'
  );

-- Create indexes
CREATE INDEX pending_submissions_status_idx ON pending_submissions(status);
CREATE INDEX pending_submissions_type_idx ON pending_submissions(type);
CREATE INDEX pending_submissions_submitted_by_idx ON pending_submissions(submitted_by);

-- Create storage bucket for submission documents if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'submission-documents'
  ) THEN
    INSERT INTO storage.buckets (id, name, public)
    VALUES ('submission-documents', 'submission-documents', true);
  END IF;
END $$;

-- Drop existing storage policies if they exist
DROP POLICY IF EXISTS "Users can read submission documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload submission documents" ON storage.objects;

-- Create storage policies
CREATE POLICY "Users can read submission documents"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'submission-documents');

CREATE POLICY "Users can upload submission documents"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'submission-documents');