-- Defense-in-depth: enforce MIME-type/size limits at the Supabase Storage
-- layer itself, matching each bucket's existing client-side react-dropzone
-- `accept`/`maxSize` config. Client-side checks are UX only and can be
-- bypassed by calling the Storage API directly, so this is the layer that
-- actually blocks an oversized or wrong-type upload.

update storage.buckets set
  file_size_limit = 10 * 1024 * 1024,
  allowed_mime_types = array['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
where id = 'case-documents';

update storage.buckets set
  file_size_limit = 10 * 1024 * 1024,
  allowed_mime_types = array['application/pdf']
where id = 'submission-documents';

update storage.buckets set
  file_size_limit = 10 * 1024 * 1024,
  allowed_mime_types = array['application/pdf']
where id = 'judgments';

update storage.buckets set
  file_size_limit = 10 * 1024 * 1024,
  allowed_mime_types = array['application/pdf']
where id = 'laws';

update storage.buckets set
  file_size_limit = 10 * 1024 * 1024,
  allowed_mime_types = array[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'text/csv'
  ]
where id = 'resources';

update storage.buckets set
  file_size_limit = 5 * 1024 * 1024,
  allowed_mime_types = array['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
where id = 'stage-documents';

update storage.buckets set
  file_size_limit = 5 * 1024 * 1024,
  allowed_mime_types = array['image/*']
where id = 'avatars';
