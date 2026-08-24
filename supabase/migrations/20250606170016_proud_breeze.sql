/*
  # Enhance storage policies for all buckets to enforce file type restrictions

  1. Changes
    - Update storage policies for all buckets to enforce file type restrictions
    - Standardize file type validation across all buckets
    - Ensure consistent file type handling

  2. Security
    - Maintain existing RLS policies
    - Add file type validation to prevent invalid uploads
*/

-- Update submission-documents bucket policy
DROP POLICY IF EXISTS "Users can upload submission documents" ON storage.objects;

CREATE POLICY "Users can upload submission documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'submission-documents' AND
  (LOWER(RIGHT(storage.filename(name), 4)) = '.pdf')
);

-- Update case-documents bucket policy
DROP POLICY IF EXISTS "Users can upload case documents" ON storage.objects;

CREATE POLICY "Users can upload case documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'case-documents' AND
  (LOWER(RIGHT(storage.filename(name), 4)) = '.pdf')
);

-- Update judgments bucket policy
DROP POLICY IF EXISTS "Authenticated users can upload judgment documents" ON storage.objects;

CREATE POLICY "Authenticated users can upload judgment documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'judgments' AND
  (LOWER(RIGHT(storage.filename(name), 4)) = '.pdf')
);

-- Update stage-documents bucket policy
DROP POLICY IF EXISTS "Users can upload stage documents" ON storage.objects;

CREATE POLICY "Users can upload stage documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'stage-documents' AND
  (LOWER(RIGHT(storage.filename(name), 4)) = '.pdf')
);

-- Update legal-documents bucket policy
DROP POLICY IF EXISTS "Authenticated users can upload legal documents" ON storage.objects;

CREATE POLICY "Authenticated users can upload legal documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'legal-documents' AND
  (LOWER(RIGHT(storage.filename(name), 4)) = '.pdf')
);

-- Update laws bucket policy
DROP POLICY IF EXISTS "Authenticated users can upload files" ON storage.objects;

CREATE POLICY "Authenticated users can upload files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'laws' AND
  (LOWER(RIGHT(storage.filename(name), 4)) = '.pdf')
);