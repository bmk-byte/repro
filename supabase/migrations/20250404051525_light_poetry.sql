/*
  # Create storage bucket for case documents

  1. Create storage bucket for PDF files
  2. Set up access policies
*/

-- Create storage bucket for case documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('case-documents', 'case-documents', true);

-- Allow public access to case documents
CREATE POLICY "Case documents are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'case-documents');

-- Allow authenticated users to upload case documents
CREATE POLICY "Users can upload case documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'case-documents');

-- Allow users to update their own case documents
CREATE POLICY "Users can update their own case documents"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'case-documents');

-- Allow users to delete their own case documents
CREATE POLICY "Users can delete their own case documents"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'case-documents');