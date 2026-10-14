/*
  # Remove the resources bucket's listing-enabling SELECT policy

  1. Problem
    - Supabase's security advisor flags `public_bucket_allows_listing`: the
      "Anyone can read resources" SELECT policy on storage.objects (added in
      20261015090000_add_resources_storage_policies.sql, to fix the Resources
      upload feature) lets any client enumerate every object in the bucket
      via the Storage API's list/select operations, not just fetch a known
      file by URL.
    - It was never actually needed for that: `resources` is a `public = true`
      bucket, so direct GET-by-URL already bypasses storage.objects RLS
      entirely — confirmed against how the app actually serves files
      (ResourcesPage.tsx reads `resource.file_url`, a plain public URL
      captured at upload time in UploadResourceModal.tsx, and navigates to
      it directly; nothing calls `.list()` or `.download()` on this bucket).
      The SELECT policy's only effect was enabling bucket-wide listing.

  2. Changes
    - Drop the SELECT policy. Uploads (INSERT) and owner-scoped
      UPDATE/DELETE, added in the same prior migration, are unaffected.
*/

DROP POLICY IF EXISTS "Anyone can read resources" ON storage.objects;
