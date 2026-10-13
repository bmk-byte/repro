/*
  # Add storage.objects policies for the resources bucket

  1. Problem
    - Uploading via Resources > Upload Resource fails with a generic
      "Request failed" error. No migration in this repo ever created
      storage.objects RLS policies for the `resources` bucket (confirmed
      by searching every migration for `bucket_id = 'resources'`), while
      every comparable document bucket (case-documents, judgments, laws,
      stage-documents) has explicit SELECT/INSERT policies. The `resources`
      bucket itself is public (per 20260929151818), but a public bucket
      still requires an INSERT policy on storage.objects for an
      authenticated client to be allowed to upload into it at all.

  2. Changes
    - Add policies mirroring the `resources` DB table's own RLS (any
      authenticated user can upload; owner can update/delete their own
      object) and the public-read intent already documented for this
      bucket in 20260929151818_lock_down_case_document_storage_buckets.sql.
*/

DROP POLICY IF EXISTS "Anyone can read resources" ON storage.objects;
CREATE POLICY "Anyone can read resources"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'resources');

DROP POLICY IF EXISTS "Authenticated users can upload resources" ON storage.objects;
CREATE POLICY "Authenticated users can upload resources"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'resources');

DROP POLICY IF EXISTS "Owners can update their resource files" ON storage.objects;
CREATE POLICY "Owners can update their resource files"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'resources' AND owner = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Owners can delete their resource files" ON storage.objects;
CREATE POLICY "Owners can delete their resource files"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'resources' AND owner = (SELECT auth.uid()));
