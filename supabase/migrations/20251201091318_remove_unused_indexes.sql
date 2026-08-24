/*
  # Remove Unused Indexes

  1. Performance Improvements
    - Remove indexes that are not being used by queries
    - Reduces storage overhead and maintenance cost
    - Improves INSERT/UPDATE/DELETE performance
  
  2. Indexes Removed
    - Foreign key indexes that are never used
    - Filtering indexes that are never used
    - Composite indexes that are never used
  
  3. Note
    - Primary key and unique constraint indexes are kept
    - Actively used indexes are kept
*/

-- Remove unused foreign key indexes
DROP INDEX IF EXISTS expert_commentaries_expert_id_idx;
DROP INDEX IF EXISTS judgments_deleted_by_idx;
DROP INDEX IF EXISTS law_documents_uploaded_by_idx_new;
DROP INDEX IF EXISTS notifications_user_id_idx_new;
DROP INDEX IF EXISTS projects_created_by_idx_new;
DROP INDEX IF EXISTS services_user_id_idx_new;
DROP INDEX IF EXISTS transfer_logs_created_by_idx;
DROP INDEX IF EXISTS idx_moderators_user_id;

-- Remove unused filtering indexes
DROP INDEX IF EXISTS case_stages_status_idx;
DROP INDEX IF EXISTS cases_assigned_team_members_idx;
DROP INDEX IF EXISTS cases_categories_idx;
DROP INDEX IF EXISTS cases_priority_level_idx;
DROP INDEX IF EXISTS cases_status_idx;
DROP INDEX IF EXISTS comments_discussion_id_idx;
DROP INDEX IF EXISTS comments_parent_id_idx;
DROP INDEX IF EXISTS comments_user_id_idx;
DROP INDEX IF EXISTS data_entries_project_id_idx;
DROP INDEX IF EXISTS health_indicators_country_id_idx;
DROP INDEX IF EXISTS health_indicators_created_by_idx;
DROP INDEX IF EXISTS health_indicators_indicator_type_idx;

-- Remove unused audit and tracking indexes
DROP INDEX IF EXISTS idx_audit_logs_performed_by;
DROP INDEX IF EXISTS idx_case_documents_uploaded_by;
DROP INDEX IF EXISTS idx_case_summaries_case_id;
DROP INDEX IF EXISTS idx_cases_case_filed_country_nature;
DROP INDEX IF EXISTS idx_cases_deleted_by;
DROP INDEX IF EXISTS idx_data_entries_uploaded_by;
DROP INDEX IF EXISTS idx_expert_commentaries_case_id;

-- Remove unused composite indexes
DROP INDEX IF EXISTS idx_judgments_citation_country_court_date;
DROP INDEX IF EXISTS idx_pending_cases_title_country_nature;
DROP INDEX IF EXISTS idx_pending_judgments_citation_country_court_date;

-- Remove unused judgment indexes
DROP INDEX IF EXISTS judgments_categories_idx;
DROP INDEX IF EXISTS judgments_country_id_idx;
DROP INDEX IF EXISTS judgments_court_idx;
DROP INDEX IF EXISTS judgments_created_at_idx;
DROP INDEX IF EXISTS judgments_uploaded_by_idx;

-- Remove unused law document indexes
DROP INDEX IF EXISTS law_documents_category_idx;
DROP INDEX IF EXISTS law_documents_country_id_idx;
DROP INDEX IF EXISTS law_documents_type_idx;

-- Remove unused metrics indexes
DROP INDEX IF EXISTS metrics_user_id_idx;
DROP INDEX IF EXISTS metrics_year_month_idx;

-- Remove unused pending submission indexes
DROP INDEX IF EXISTS pending_cases_categories_idx;
DROP INDEX IF EXISTS pending_cases_submitted_by_idx;
DROP INDEX IF EXISTS pending_judgments_categories_idx;
DROP INDEX IF EXISTS pending_judgments_country_id_idx;
DROP INDEX IF EXISTS pending_judgments_submitted_by_idx;

-- Remove unused report and resource indexes
DROP INDEX IF EXISTS reports_publish_status_idx;
DROP INDEX IF EXISTS reports_user_id_idx;
DROP INDEX IF EXISTS resources_user_id_idx;
DROP INDEX IF EXISTS services_year_quarter_idx;

-- Remove unused profile indexes
DROP INDEX IF EXISTS idx_profiles_receive_notifications;
DROP INDEX IF EXISTS idx_profiles_role;

-- Note: If these indexes become needed in the future due to new queries,
-- they can be recreated with CREATE INDEX CONCURRENTLY to avoid locking