/*
  # Performance advisor fixes that do not change who can see what

  1. Duplicate index on cases.user_id (lint 0009_duplicate_index)
    - cases_user_id_idx and idx_cases_user_id are identical, so every insert
      or update on cases maintained both. idx_cases_user_id is the one this
      repo tracks (20251204050602_organization_based_case_access_control.sql);
      cases_user_id_idx was created outside migrations. Drop the untracked
      one, and only if the tracked one exists, so cases.user_id is never left
      unindexed.

  2. "Organization moderators see only own cases" (lint 0003_auth_rls_initplan)
    - auth.uid() was evaluated once per row checked. Wrapping it as
      (select auth.uid()) lets Postgres evaluate it once per query. The
      condition is otherwise identical to the current definition in
      20261017090000_scope_moderator_case_visibility_by_default.sql.

  3. Redundant scorecard score policy (lint 0006_multiple_permissive_policies)
    - "Scorecard editors can view all scores" (SELECT, is_scorecard_editor())
      repeats what "Scorecard editors can manage scores" (FOR ALL, same
      condition) already grants, since FOR ALL includes SELECT. Dropping it
      leaves access unchanged.

  Deliberately not changed: the other multiple-permissive-policy warnings.
  Merging those policies would combine separate moderator and owner rules
  into single expressions, a security-sensitive rewrite for a negligible
  gain at the current data size.

  Rollback
    - CREATE INDEX cases_user_id_idx ON public.cases (user_id);
    - Re-run the policy from 20261017090000_... (auth.uid() unwrapped).
    - Re-run "Scorecard editors can view all scores" from
      20261001075948_create_scorecard_schema.sql.
*/

-- 1. Duplicate index
DO $$
BEGIN
  IF to_regclass('public.idx_cases_user_id') IS NOT NULL THEN
    DROP INDEX IF EXISTS public.cases_user_id_idx;
  ELSE
    RAISE NOTICE 'idx_cases_user_id missing; keeping cases_user_id_idx';
  END IF;
END $$;

-- 2. Evaluate auth.uid() once per query instead of once per row
DROP POLICY IF EXISTS "Organization moderators see only own cases" ON cases;

CREATE POLICY "Organization moderators see only own cases"
  ON cases
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.is_moderator = true
      AND NOT (profiles.email LIKE '%@afyanahaki.org')
    )
    AND user_id = (select auth.uid())
  );

-- 3. Redundant SELECT policy (covered by the FOR ALL policy)
DROP POLICY IF EXISTS "Scorecard editors can view all scores" ON scorecard_indicator_scores;
