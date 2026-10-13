/*
  # Scope moderator case visibility to "own uploads" by default

  1. Problem
    - 20251204050602_organization_based_case_access_control.sql restricted
      "see only cases you personally uploaded" to moderators from six
      explicitly named organizations ('The Hub', 'Femme Forte Uganda',
      'UGANET', 'CSCHRCL', 'KELIN', 'WLSA'), via `is_restricted_organization()`.
      Every other moderator — including any moderator from an organization
      onboarded later and never added to that list — fell through to
      "Other moderators see all cases", a broad, deny-by-exception policy.
      That makes "sees everything" the default for new moderators, and
      "sees only their own uploads" the opt-in exception, which is
      backwards from a safe default.

  2. Changes
    - Drop the restricted-organization allowlist check from "Organization
      moderators see only own cases" so it applies to every moderator who
      is not an @afyanahaki.org moderator — i.e. "see only your own
      uploads" becomes the universal default for all non-Afya-na-Haki
      moderators, regardless of organization.
    - Drop "Other moderators see all cases" entirely — there is no longer
      a fallback that grants broad access by default.
    - "Afyanahaki moderators see all cases" (central platform-operator
      staff) is unchanged, confirmed by the organization as an intentional
      broad-oversight exception.
    - `is_restricted_organization()` is left in place (now unused by any
      policy) rather than dropped, since nothing else depends on removing
      it and doing so is unnecessary churn for this fix.

  3. Security
    - No RLS is disabled; this only narrows an existing SELECT policy's
      USING clause and removes another policy outright.
*/

DROP POLICY IF EXISTS "Other moderators see all cases" ON cases;
DROP POLICY IF EXISTS "Organization moderators see only own cases" ON cases;

CREATE POLICY "Organization moderators see only own cases"
  ON cases
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_moderator = true
      AND NOT (profiles.email LIKE '%@afyanahaki.org')
    )
    AND user_id = auth.uid()
  );
