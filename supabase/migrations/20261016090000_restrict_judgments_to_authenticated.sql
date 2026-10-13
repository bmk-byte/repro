/*
  # Restrict judgments to authenticated users

  1. Problem
    - The original policy on `judgments` (20250414112930_cold_lab.sql):
        CREATE POLICY "Anyone can read judgments" ON judgments FOR SELECT USING (true);
      carries no `TO authenticated` clause, so it applies to Postgres's
      `public` role — meaning the anonymous/anon Supabase role can read
      every judgment record (citation, case_summary, flynote, litigants,
      defending_institutions) with no login at all. No later migration
      ever revisited this SELECT policy (only INSERT/UPDATE/DELETE were
      touched over time), including the "organization-based case access
      control" migration, which only scopes the separate `cases` table.
    - Judgments in this platform are reproductive-rights/SGBV court
      records that can name real litigants, including minors in some
      case categories — this is a live, unauthenticated exposure of
      sensitive data, the same class of problem the `case-documents` /
      `submission-documents` / `judgments` (storage bucket) /
      `stage-documents` lockdown in 20260929151818 already fixed for file
      storage. This migration applies the identical fix to the `judgments`
      table itself.

  2. Changes
    - Replace the public SELECT policy with an authenticated-only
      equivalent, matching the pattern already used for `cases` and the
      storage-bucket lockdown.

  3. Security
    - No other judgments policies (INSERT/UPDATE/DELETE) are touched.
*/

DROP POLICY IF EXISTS "Anyone can read judgments" ON judgments;

CREATE POLICY "Authenticated users can read judgments"
  ON judgments FOR SELECT
  TO authenticated
  USING (true);
