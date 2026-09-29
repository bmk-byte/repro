/*
  # Lock down public storage buckets holding litigation documents

  ## Problem
  `case-documents`, `submission-documents`, `judgments`, and `stage-documents`
  were all created with `public = true`, and their SELECT storage policies
  carry no `TO` clause (defaulting to both `anon` and `authenticated`). In
  Supabase Storage, a `public` bucket serves objects directly over a stable
  public URL with no RLS/auth check at all — meaning any litigation case
  filing, judgment, or rapid-response document uploaded to this platform is
  readable by anyone on the internet who has or guesses its URL, no account
  required.

  ## Fix
  Make the four buckets private and restrict SELECT to `authenticated`
  users. This is a floor, not a ceiling: uploaded filenames do not currently
  encode a case id or uploader id (`${Date.now()}-${Math.random()}.${ext}`),
  so a per-case/per-owner storage ACL isn't feasible without also changing
  the upload path convention and backfilling existing objects — out of
  scope for this pass. Requiring authentication closes the actual reported
  gap (unauthenticated, internet-wide access); a signed-in user with a
  guessed filename for a case they don't own remains a residual, much
  smaller risk, tracked separately.

  `legal-documents` is a superseded bucket with zero references anywhere in
  application code (confirmed via full-repo search before writing this
  migration, and confirmed via a live read-only query that it does not even
  exist in production). Supabase blocks direct `DELETE` on
  `storage.buckets`/`storage.objects` (a `protect_delete()` trigger requires
  going through the Storage API instead — running a raw `DELETE` here
  fails with `42501`), so this migration does not attempt to drop it via
  SQL at all. If it's ever found to exist in some other environment, remove
  it via the Supabase Dashboard's Storage UI or the Storage API, not a
  migration.

  ## Buckets intentionally left untouched (public reference material, not
  case-specific)
  - `avatars` — low-sensitivity profile photos, public is an accepted
    product choice.
  - `laws`, `resources` — public statutes/policy PDFs and public-facing
    Resources-page material, meant for open access.
*/

-- 1. Flip the four case-document buckets to private.
UPDATE storage.buckets
SET public = false
WHERE id IN ('case-documents', 'submission-documents', 'judgments', 'stage-documents');

-- 2. Replace each bucket's permissive SELECT policy with an
--    authenticated-only equivalent. INSERT/UPDATE/DELETE policies were
--    already `TO authenticated` and are left as-is.

DROP POLICY IF EXISTS "Case documents are publicly accessible" ON storage.objects;
CREATE POLICY "Authenticated users can read case documents"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'case-documents');

DROP POLICY IF EXISTS "Users can read submission documents" ON storage.objects;
CREATE POLICY "Authenticated users can read submission documents"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'submission-documents');

DROP POLICY IF EXISTS "Anyone can read judgment documents" ON storage.objects;
CREATE POLICY "Authenticated users can read judgment documents"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'judgments');

DROP POLICY IF EXISTS "Users can read stage documents" ON storage.objects;
CREATE POLICY "Authenticated users can read stage documents"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'stage-documents');
