/*
  # Index foreign keys flagged by the Supabase performance advisor

  1. Problem
    - The advisor (lint 0001_unindexed_foreign_keys, observed 2026-11-20)
      flagged 30 foreign keys with no covering index. Without one, joins on
      the key, filters such as "cases by country", and the check Postgres
      runs on the child table whenever a parent row (e.g. a profile) is
      deleted or updated all fall back to scanning the whole child table.

  2. Changes
    - For each flagged constraint, create a btree index on exactly the
      constraint's own columns, read from pg_constraint rather than typed by
      hand, so every index matches its key.
    - Idempotent: skips constraints that no longer exist and any key that
      already has an index starting with the same columns.

  3. Not changed
    - The advisor also reports idx_scorecard_indicators_pillar as unused.
      It is kept: it covers the scorecard_indicators.pillar_id foreign key,
      so dropping it would re-create the same "unindexed foreign key"
      warning. It shows as unused only because that table is small enough
      that Postgres currently prefers a full scan.

  4. Rollback
    - DROP INDEX IF EXISTS on any of the idx_fk_* indexes created here.
*/

DO $$
DECLARE
  fk record;
  cols text;
  idx_name text;
BEGIN
  FOR fk IN
    SELECT c.conname, c.conrelid, c.conkey, t.relname AS table_name
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE c.contype = 'f'
      AND n.nspname = 'public'
      AND c.conname IN (
        'audit_logs_performed_by_fkey',
        'case_documents_uploaded_by_fkey',
        'case_summaries_case_id_fkey',
        'cases_deleted_by_fkey',
        'comments_parent_id_fkey',
        'comments_user_id_fkey',
        'data_entries_project_id_fkey',
        'data_entries_uploaded_by_fkey',
        'expert_commentaries_case_id_fkey',
        'expert_commentaries_expert_id_fkey',
        'health_indicators_country_id_fkey',
        'health_indicators_created_by_fkey',
        'judgments_country_id_fkey',
        'judgments_deleted_by_fkey',
        'judgments_uploaded_by_fkey',
        'law_documents_country_id_fkey',
        'law_documents_uploaded_by_fkey',
        'metrics_user_id_fkey',
        'moderators_user_id_fkey',
        'notifications_user_id_fkey',
        'pending_judgments_country_id_fkey',
        'projects_created_by_fkey',
        'reports_user_id_fkey',
        'resources_user_id_fkey',
        'scorecard_indicator_scores_indicator_id_fkey',
        'scorecard_indicator_scores_last_edited_by_fkey',
        'scorecard_pillar_results_pillar_id_fkey',
        'scorecard_submissions_created_by_fkey',
        'services_user_id_fkey',
        'transfer_logs_created_by_fkey'
      )
  LOOP
    -- Skip if some index already leads with exactly these columns.
    IF EXISTS (
      SELECT 1 FROM pg_index i
      WHERE i.indrelid = fk.conrelid
        AND (i.indkey::int2[])[0:array_length(fk.conkey, 1) - 1] = fk.conkey
    ) THEN
      CONTINUE;
    END IF;

    SELECT string_agg(quote_ident(a.attname), ', ' ORDER BY k.ord)
      INTO cols
    FROM unnest(fk.conkey) WITH ORDINALITY AS k(attnum, ord)
    JOIN pg_attribute a ON a.attrelid = fk.conrelid AND a.attnum = k.attnum;

    -- e.g. idx_fk_judgments_country_id_fkey (trimmed to Postgres' 63 chars)
    idx_name := left('idx_fk_' || fk.conname, 63);

    EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON public.%I (%s)', idx_name, fk.table_name, cols);
    RAISE NOTICE 'Created % on %(%)', idx_name, fk.table_name, cols;
  END LOOP;
END $$;
