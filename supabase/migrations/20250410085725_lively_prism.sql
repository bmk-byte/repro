/*
  # Create storage bucket for law documents

  1. New Storage Bucket
    - Creates a new storage bucket named 'laws' for storing legal documents
    - Sets up appropriate RLS policies for authenticated users
    - Enforces file type restrictions

  2. Security
    - Enables public access for reading documents
    - Restricts uploads to authenticated users
    - Enforces file type restrictions
*/

-- Create the storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('laws', 'laws', true);

-- Policy to allow public access to read files
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'laws');

-- Policy to allow authenticated users to upload files
CREATE POLICY "Authenticated users can upload files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'laws' 
  AND (LOWER(RIGHT(storage.filename(name), 4)) = '.pdf')
);

-- Policy to allow users to delete their own uploads
CREATE POLICY "Users can delete own files"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'laws'
  AND (auth.uid() = owner)
);