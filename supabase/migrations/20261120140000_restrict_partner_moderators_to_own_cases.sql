/*
  # Partner moderators: only their own cases

  1. Intended rule (already stated in
     20261017090000_scope_moderator_case_visibility_by_default.sql)
    - Moderators from partner organizations (any moderator without an
      @afyanahaki.org email) see only the cases they uploaded themselves.
      Afya na Haki moderators keep oversight of every case.

  2. Problem
    - Row-level security policies are permissive by default and combine
      with OR. A policy created outside the migrations, "Users can read
      approved or own cases", lets every signed-in user read every approved
      case, so partner moderators could read all approved cases despite
      "Organization moderators see only own cases".
    - "Moderators can update any litigation case" let every moderator,
      including partner moderators, edit any litigation case.
    - "Authenticated users can view case documents" (USING true) let any
      signed-in user read every case's documents.

  3. Fix
    - RESTRICTIVE policies. These are ANDed with every permissive policy,
      so they cap access regardless of how the other policies are worded
      (including the one that isn't in this repo). For a partner moderator:
        cases SELECT / UPDATE / DELETE  -> only rows they uploaded
        case_documents SELECT           -> only documents of those cases
    - Nobody else is affected: for anyone who is not a partner moderator
      the restrictive check is simply true.

  4. Not changed
    - The moderation queue: partner moderators already could not see other
      people's pending cases (the broad policy above covers approved cases
      only), so moderating stays with Afya na Haki moderators as today.
    - Regular (non-moderator) users keep reading approved cases.

  5. Rollback
    - DROP POLICY the four "Partner moderators: own ..." policies below and
      DROP FUNCTION public.is_partner_moderator();
*/

CREATE OR REPLACE FUNCTION public.is_partner_moderator()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND is_moderator = true
      AND NOT (lower(coalesce(email, '')) LIKE '%@afyanahaki.org')
  );
$$;

REVOKE ALL ON FUNCTION public.is_partner_moderator() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_partner_moderator() TO authenticated, service_role;

DROP POLICY IF EXISTS "Partner moderators: own cases only (read)" ON public.cases;
CREATE POLICY "Partner moderators: own cases only (read)"
  ON public.cases
  AS RESTRICTIVE
  FOR SELECT
  TO authenticated
  USING (NOT (select public.is_partner_moderator()) OR user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Partner moderators: own cases only (update)" ON public.cases;
CREATE POLICY "Partner moderators: own cases only (update)"
  ON public.cases
  AS RESTRICTIVE
  FOR UPDATE
  TO authenticated
  USING (NOT (select public.is_partner_moderator()) OR user_id = (select auth.uid()))
  WITH CHECK (NOT (select public.is_partner_moderator()) OR user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Partner moderators: own cases only (delete)" ON public.cases;
CREATE POLICY "Partner moderators: own cases only (delete)"
  ON public.cases
  AS RESTRICTIVE
  FOR DELETE
  TO authenticated
  USING (NOT (select public.is_partner_moderator()) OR user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Partner moderators: own case documents only (read)" ON public.case_documents;
CREATE POLICY "Partner moderators: own case documents only (read)"
  ON public.case_documents
  AS RESTRICTIVE
  FOR SELECT
  TO authenticated
  USING (
    NOT (select public.is_partner_moderator())
    OR EXISTS (
      SELECT 1 FROM public.cases c
      WHERE c.id = case_documents.case_id
        AND c.user_id = (select auth.uid())
    )
  );
