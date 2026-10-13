/*
  # Re-run the empty-partner backfill (now covers bulk-uploaded cases too)

  1. Problem
    - BulkCaseUpload.tsx and BulkRapidResponseUpload.tsx read `partner`
      straight from the uploaded CSV, a code path the earlier form-level
      fix (SubmitCaseForm.tsx / RapidResponseCaseForm.tsx always deriving
      partner from the submitter's own profile) never touched. Several
      bulk uploads left partner NULL/empty on dozens of real cases even
      though the uploader's own profile has an organization on file.
    - The frontend change in this same commit removes the Partner column
      from both bulk-upload CSV templates and always uses the uploader's
      profiiles.organization instead, closing the gap going forward.

  2. Changes
    - Re-run the same safe, idempotent backfill from
      20261013090000_fix_approval_triggers_and_recover_missing_cases.sql:
      only touches rows where partner is NULL/empty and the submitter has
      a non-empty organization on file. Never overwrites an existing
      value.
*/

UPDATE cases c
SET partner = p.organization
FROM profiles p
WHERE c.user_id = p.id
AND (c.partner IS NULL OR c.partner = '')
AND p.organization IS NOT NULL
AND p.organization <> '';

UPDATE pending_cases pc
SET partner = p.organization
FROM profiles p
WHERE pc.submitted_by = p.id
AND (pc.partner IS NULL OR pc.partner = '')
AND p.organization IS NOT NULL
AND p.organization <> '';
