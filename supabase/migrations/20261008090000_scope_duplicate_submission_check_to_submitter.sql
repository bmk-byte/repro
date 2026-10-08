/*
  # Scope duplicate-submission checks to the submitter; restore judgment check

  1. Problem (found during a case-submission audit, see SubmitCaseForm.tsx)
    - check_duplicate_submission()'s CURRENT live body (last redefined in
      20251121215132_fix_function_search_paths_v3.sql, as part of a function
      search_path security pass) only handles TG_TABLE_NAME = 'pending_cases',
      and checks:
          title = new.title AND country_id = new.country_id
          AND status = 'pending' AND id != new.id
      This is NOT scoped to the submitter at all. Two different, unrelated
      partner organizations submitting different cases that happen to share an
      exact title + country (a realistic collision — generic titles like
      "Access to Safe Abortion Petition" recur across submitters) get the
      second submitter's legitimate, different case hard-rejected with
      'A pending submission with this title already exists for this country',
      even though nothing they submitted duplicates their own prior work.
    - The 'pending_judgments' branch that existed in the original version of
      this function (20250703044828_fragrant_art.sql) was dropped when the
      function was rewritten for the search_path fix and never restored, so
      duplicate-judgment detection on pending_judgments is currently dead:
      the function falls through its single `IF TG_TABLE_NAME = 'pending_cases'`
      check and returns NEW unchanged for every judgment submission.
    - Underneath the trigger, pending_cases_unique_submission /
      pending_judgments_unique_submission (UNIQUE INDEXes added in
      20250703053629_lingering_peak.sql, re-creating the tables) enforce the
      same (title, country_id, nature_of_case) / (citation, country_id,
      court_judgment, judgment_date_judgment) uniqueness at the database level,
      also with no submitted_by scoping and no status scoping (so it blocks
      forever, even against a since-rejected submission). Fixing only the
      trigger would leave this index still hard-blocking two different
      submitters, so it needs the same submitted_by scoping.

  2. Changes
    - Add `submitted_by = new.submitted_by` to the pending_cases trigger check,
      so it only fires against the current user's own pending submissions.
    - Restore an equivalent, submitter-scoped trigger check for
      pending_judgments (citation + country_id + status = 'pending' +
      submitted_by), matching the simplified style the pending_cases check
      already uses post-security-fix (exact match, not the older
      LOWER()/nature_of_case/cross-table version — that broader matching was
      an intentional simplification made in the security pass and is left
      as-is here).
    - Replace both UNIQUE INDEXes with submitted_by-scoped equivalents, so the
      hard database-level constraint can no longer block two different
      submitters, while still giving a true (non-racy) uniqueness guarantee
      per submitter that the trigger's EXISTS check alone cannot.

  3. Security
    - Preserves SECURITY DEFINER / SET search_path = pg_catalog, public from
      the function's current definition. No RLS changes.
*/

ALTER TABLE pending_cases DROP CONSTRAINT IF EXISTS pending_cases_unique_submission;
ALTER TABLE pending_judgments DROP CONSTRAINT IF EXISTS pending_judgments_unique_submission;
DROP INDEX IF EXISTS pending_cases_unique_submission;
DROP INDEX IF EXISTS pending_judgments_unique_submission;

CREATE UNIQUE INDEX IF NOT EXISTS pending_cases_unique_submission
ON pending_cases (submitted_by, title, country_id, nature_of_case);

CREATE UNIQUE INDEX IF NOT EXISTS pending_judgments_unique_submission
ON pending_judgments (submitted_by, citation, country_id, court_judgment, judgment_date_judgment);

CREATE OR REPLACE FUNCTION check_duplicate_submission()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF TG_TABLE_NAME = 'pending_cases' THEN
    IF EXISTS (
      SELECT 1 FROM pending_cases
      WHERE title = new.title
      AND country_id = new.country_id
      AND status = 'pending'
      AND submitted_by = new.submitted_by
      AND id != COALESCE(new.id, '00000000-0000-0000-0000-000000000000'::uuid)
    ) THEN
      RAISE EXCEPTION 'A pending submission with this title already exists for this country';
    END IF;
  ELSIF TG_TABLE_NAME = 'pending_judgments' THEN
    IF EXISTS (
      SELECT 1 FROM pending_judgments
      WHERE citation = new.citation
      AND country_id = new.country_id
      AND status = 'pending'
      AND submitted_by = new.submitted_by
      AND id != COALESCE(new.id, '00000000-0000-0000-0000-000000000000'::uuid)
    ) THEN
      RAISE EXCEPTION 'A pending submission with this citation already exists for this country';
    END IF;
  END IF;
  RETURN new;
END;
$$;
