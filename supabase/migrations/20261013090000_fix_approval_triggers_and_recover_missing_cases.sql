/*
  # Fix broken approval triggers and recover cases/judgments lost to them

  1. Problem
    - handle_pending_case_approval() (last defined in
      20251201091505_fix_remaining_function_search_paths.sql) inserts into
      `cases` using column names that do not exist on that table: title,
      summary, case_filed_country, categories, outcome, document_url. The
      real columns (confirmed against src/lib/data/cases.ts and the
      direct-upload INSERT in SubmitCaseForm.tsx) are case_filed,
      case_summary, country_id, case_categories, case_outcome, pdf_url.
    - handle_pending_judgment_approval() has the same problem against
      `judgments`: date_of_judgment, categories, summary, document_url,
      moderation_status don't exist (real columns: judgment_date,
      case_categories, case_summary, file_url; judgments has no
      moderation_status column at all — only cases and law_documents do,
      per 20250507122746_maroon_pebble.sql).
    - Both functions wrap their INSERT in `EXCEPTION WHEN OTHERS THEN
      RAISE WARNING ... RETURN new;`, so every approval has been silently
      failing: pending_cases.status / pending_judgments.status flips to
      'approved', the submitter gets a "your submission is now live" email,
      a moderator sees it as handled — but no row was ever created in
      `cases` / `judgments`. This is the actual root cause of why so many
      approved submissions (including their partner organization) are
      missing from the public case list, not just inconsistent partner-org
      text entry.
    - The trigger never deletes the pending_cases/pending_judgments row (a
      separate, unused function `move_to_cases` does that, but it isn't the
      one actually wired to a trigger), so the original submission data —
      partner included — is still intact and recoverable.

  2. Changes
    - Recreate both functions with the correct column names and the FULL
      field list (previously only ~9 of ~29 columns were even attempted).
      Also drop the blanket exception handler: a future failure should
      block the status flip and surface as an error, not silently succeed
      while discarding data.
    - One-time recovery: for every pending_cases / pending_judgments row
      already marked 'approved' that has no matching row in cases /
      judgments (matched on title+country+submitter, the best available
      key since nothing recorded a direct reference), insert the missing
      row now with its original data — including whatever partner value
      the submitter entered at the time.
    - Backfill: for any cases/pending_cases row with partner NULL or empty
      where the submitter's profile has an organization on file, set
      partner to that organization. This does not touch rows that already
      have a non-empty partner value (e.g. "LIRA Programme" or another
      guess) — those need human review, not an automatic overwrite, since
      a mismatch could also be a moderator correctly entering a different
      partner's case on their behalf.

  3. Security
    - Preserves SECURITY DEFINER / SET search_path = pg_catalog, public.
      No RLS changes.
*/

CREATE OR REPLACE FUNCTION handle_pending_case_approval()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF new.status = 'approved' AND (old.status IS NULL OR old.status = 'pending') THEN
    INSERT INTO cases (
      case_filed, case_summary, country_id, user_id, pdf_url,
      status, case_type, moderation_status,
      tracking_period, programme, partner, nature_of_case,
      action_taken, action_timeframe, next_steps, court,
      timeline_status, litigants, defending_institutions,
      judicial_body_type, judicial_body, regional_appeals, regional_bodies,
      legal_framework_type, domestic_laws, international_laws, protocols,
      case_impact, case_categories, case_outcome
    )
    SELECT
      title, summary, country_id, submitted_by, document_url,
      'pending', 'litigation', 'approved',
      tracking_period, programme, partner, nature_of_case,
      action_taken, action_timeframe, next_steps, court,
      timeline_status, litigants, defending_institutions,
      judicial_body_type, judicial_body, regional_appeals, regional_bodies,
      legal_framework_type, domestic_laws, international_laws, protocols,
      case_impact, case_categories, case_outcome
    FROM pending_cases
    WHERE id = new.id;
  END IF;
  RETURN new;
END;
$$;

CREATE OR REPLACE FUNCTION handle_pending_judgment_approval()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF new.status = 'approved' AND (old.status IS NULL OR old.status = 'pending') THEN
    INSERT INTO judgments (
      citation, media_neutral_citation, court, case_number, judges,
      judgment_date, language, type, flynote, case_summary, file_url,
      uploaded_by, country_id,
      timeline_status, litigants, defending_institutions,
      judicial_body_type, judicial_body, regional_appeals, regional_bodies,
      legal_framework_type, domestic_laws, international_laws, protocols,
      case_impact, case_categories
    )
    SELECT
      citation, media_neutral_citation, court_judgment, case_number_judgment, judges_judgment,
      judgment_date_judgment, language_judgment, type_judgment, flynote_judgment, summary, document_url,
      submitted_by, country_id,
      timeline_status, litigants, defending_institutions,
      judicial_body_type, judicial_body, regional_appeals, regional_bodies,
      legal_framework_type, domestic_laws, international_laws, protocols,
      case_impact, case_categories
    FROM pending_judgments
    WHERE id = new.id;
  END IF;
  RETURN new;
END;
$$;

-- One-time recovery: cases approved but never actually created.
INSERT INTO cases (
  case_filed, case_summary, country_id, user_id, pdf_url,
  status, case_type, moderation_status,
  tracking_period, programme, partner, nature_of_case,
  action_taken, action_timeframe, next_steps, court,
  timeline_status, litigants, defending_institutions,
  judicial_body_type, judicial_body, regional_appeals, regional_bodies,
  legal_framework_type, domestic_laws, international_laws, protocols,
  case_impact, case_categories, case_outcome
)
SELECT
  pc.title, pc.summary, pc.country_id, pc.submitted_by, pc.document_url,
  'pending', 'litigation', 'approved',
  pc.tracking_period, pc.programme, pc.partner, pc.nature_of_case,
  pc.action_taken, pc.action_timeframe, pc.next_steps, pc.court,
  pc.timeline_status, pc.litigants, pc.defending_institutions,
  pc.judicial_body_type, pc.judicial_body, pc.regional_appeals, pc.regional_bodies,
  pc.legal_framework_type, pc.domestic_laws, pc.international_laws, pc.protocols,
  pc.case_impact, pc.case_categories, pc.case_outcome
FROM pending_cases pc
WHERE pc.status = 'approved'
AND NOT EXISTS (
  SELECT 1 FROM cases c
  WHERE c.case_filed = pc.title
  AND c.country_id = pc.country_id
  AND c.user_id = pc.submitted_by
);

-- One-time recovery: judgments approved but never actually created.
INSERT INTO judgments (
  citation, media_neutral_citation, court, case_number, judges,
  judgment_date, language, type, flynote, case_summary, file_url,
  uploaded_by, country_id,
  timeline_status, litigants, defending_institutions,
  judicial_body_type, judicial_body, regional_appeals, regional_bodies,
  legal_framework_type, domestic_laws, international_laws, protocols,
  case_impact, case_categories
)
SELECT
  pj.citation, pj.media_neutral_citation, pj.court_judgment, pj.case_number_judgment, pj.judges_judgment,
  pj.judgment_date_judgment, pj.language_judgment, pj.type_judgment, pj.flynote_judgment, pj.summary, pj.document_url,
  pj.submitted_by, pj.country_id,
  pj.timeline_status, pj.litigants, pj.defending_institutions,
  pj.judicial_body_type, pj.judicial_body, pj.regional_appeals, pj.regional_bodies,
  pj.legal_framework_type, pj.domestic_laws, pj.international_laws, pj.protocols,
  pj.case_impact, pj.case_categories
FROM pending_judgments pj
WHERE pj.status = 'approved'
AND NOT EXISTS (
  SELECT 1 FROM judgments j
  WHERE j.citation = pj.citation
  AND j.country_id = pj.country_id
  AND j.uploaded_by = pj.submitted_by
);

-- Backfill: partner left NULL/empty where the submitter's profile has an
-- organization on file. Never overwrites an existing non-empty value.
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
