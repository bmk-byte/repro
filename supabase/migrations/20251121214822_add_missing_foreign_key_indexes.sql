/*
  # Add Missing Foreign Key Indexes

  1. Performance Improvements
    - Add indexes for all unindexed foreign keys to improve query performance
    - Foreign keys without indexes can cause significant performance degradation
  
  2. New Indexes
    - expert_commentaries_expert_id_idx on expert_commentaries(expert_id)
    - judgments_deleted_by_idx on judgments(deleted_by)
    - law_documents_uploaded_by_idx on law_documents(uploaded_by)
    - notifications_user_id_idx on notifications(user_id)
    - projects_created_by_idx on projects(created_by)
    - services_user_id_idx on services(user_id)
    - transfer_logs_created_by_idx on transfer_logs(created_by)
*/

-- Add index for expert_commentaries.expert_id foreign key
CREATE INDEX IF NOT EXISTS expert_commentaries_expert_id_idx 
  ON expert_commentaries(expert_id);

-- Add index for judgments.deleted_by foreign key
CREATE INDEX IF NOT EXISTS judgments_deleted_by_idx 
  ON judgments(deleted_by);

-- Add index for law_documents.uploaded_by foreign key
CREATE INDEX IF NOT EXISTS law_documents_uploaded_by_idx_new 
  ON law_documents(uploaded_by);

-- Add index for notifications.user_id foreign key
CREATE INDEX IF NOT EXISTS notifications_user_id_idx_new 
  ON notifications(user_id);

-- Add index for projects.created_by foreign key
CREATE INDEX IF NOT EXISTS projects_created_by_idx_new 
  ON projects(created_by);

-- Add index for services.user_id foreign key
CREATE INDEX IF NOT EXISTS services_user_id_idx_new 
  ON services(user_id);

-- Add index for transfer_logs.created_by foreign key
CREATE INDEX IF NOT EXISTS transfer_logs_created_by_idx 
  ON transfer_logs(created_by);