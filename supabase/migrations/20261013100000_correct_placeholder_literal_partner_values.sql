/*
  # Correct partner values that are literally the old placeholder text

  1. Problem
    - Before the Partner Organization field was locked to the submitter's
      own profile (see the SubmitCaseForm/RapidResponseCaseForm changes in
      this engagement), its placeholder text suggested "LIRA Programme" and
      "Afya Na Haki" as examples. A detection query run against production
      (see chat) showed ~80 cases where the submitter typed that example
      text verbatim as their partner, even though their own profile has a
      different, real organization on file (Women with a Mission, New
      World NGO, Centre for Community Law, etc). This is unambiguous: none
      of those submitters' organizations are actually named "LIRA
      Programme" or "Afya Na Haki".
    - Separately, rows exist where a submitter's partner legitimately names
      a DIFFERENT real organization than their own profile (e.g. SPRINGS
      PUBLIC INTEREST HUB filing cases on behalf of Women with a Mission,
      CEHURD, etc) — those are correct as-is and must not be touched.

  2. Changes
    - UPDATE cases/pending_cases.partner to the submitter's
      profiles.organization, but ONLY where partner (trimmed,
      case-insensitive) is exactly "LIRA Programme" or "Afya Na Haki" —
      the two known placeholder strings — and the submitter has a
      different, non-empty organization on file. Every other partner value
      is left exactly as entered.
*/

UPDATE cases c
SET partner = p.organization
FROM profiles p
WHERE c.user_id = p.id
AND lower(trim(c.partner)) IN ('lira programme', 'afya na haki')
AND p.organization IS NOT NULL
AND p.organization <> ''
AND lower(trim(p.organization)) <> lower(trim(c.partner));

UPDATE pending_cases pc
SET partner = p.organization
FROM profiles p
WHERE pc.submitted_by = p.id
AND lower(trim(pc.partner)) IN ('lira programme', 'afya na haki')
AND p.organization IS NOT NULL
AND p.organization <> ''
AND lower(trim(p.organization)) <> lower(trim(pc.partner));
