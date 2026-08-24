/*
  # Optimize RLS Policies - Remaining Tables

  1. Performance Improvements
    - Continue optimizing RLS policies with SELECT auth functions
    - Covers remaining tables: expert_commentaries, case_documents, notifications, etc.
  
  2. Security
    - All policies maintain their original security requirements
*/

-- Drop and recreate policies for expert_commentaries table
DROP POLICY IF EXISTS "Experts can create commentaries" ON expert_commentaries;
DROP POLICY IF EXISTS "Experts can update their own commentaries" ON expert_commentaries;

CREATE POLICY "Experts can create commentaries"
  ON expert_commentaries FOR INSERT
  TO authenticated
  WITH CHECK (expert_id = (SELECT auth.uid()));

CREATE POLICY "Experts can update their own commentaries"
  ON expert_commentaries FOR UPDATE
  TO authenticated
  USING (expert_id = (SELECT auth.uid()));

-- Drop and recreate policies for case_documents table
DROP POLICY IF EXISTS "Contributors can upload case documents" ON case_documents;

CREATE POLICY "Contributors can upload case documents"
  ON case_documents FOR INSERT
  TO authenticated
  WITH CHECK (uploaded_by = (SELECT auth.uid()));

-- Drop and recreate policies for notifications table
DROP POLICY IF EXISTS "select_notifications" ON notifications;

CREATE POLICY "select_notifications"
  ON notifications FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- Drop and recreate policies for transfer_logs table
DROP POLICY IF EXISTS "select_transfer_logs" ON transfer_logs;

CREATE POLICY "select_transfer_logs"
  ON transfer_logs FOR SELECT
  TO authenticated
  USING (created_by = (SELECT auth.uid()));

-- Drop and recreate policies for projects table
DROP POLICY IF EXISTS "Users can create projects" ON projects;
DROP POLICY IF EXISTS "Users can update their own projects" ON projects;

CREATE POLICY "Users can create projects"
  ON projects FOR INSERT
  TO authenticated
  WITH CHECK (created_by = (SELECT auth.uid()));

CREATE POLICY "Users can update their own projects"
  ON projects FOR UPDATE
  TO authenticated
  USING (created_by = (SELECT auth.uid()));

-- Drop and recreate policies for data_entries table
DROP POLICY IF EXISTS "Users can upload data" ON data_entries;

CREATE POLICY "Users can upload data"
  ON data_entries FOR INSERT
  TO authenticated
  WITH CHECK (uploaded_by = (SELECT auth.uid()));

-- Drop and recreate policies for case_stages table
DROP POLICY IF EXISTS "Users can create case stages" ON case_stages;
DROP POLICY IF EXISTS "Users can update their case stages" ON case_stages;
DROP POLICY IF EXISTS "Users can view case stages" ON case_stages;

CREATE POLICY "Users can create case stages"
  ON case_stages FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM cases
      WHERE cases.id = case_stages.case_id
      AND cases.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Users can update their case stages"
  ON case_stages FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM cases
      WHERE cases.id = case_stages.case_id
      AND cases.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Users can view case stages"
  ON case_stages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM cases
      WHERE cases.id = case_stages.case_id
      AND cases.user_id = (SELECT auth.uid())
    )
  );

-- Drop and recreate policies for case_summaries table
DROP POLICY IF EXISTS "Users can create case summaries" ON case_summaries;
DROP POLICY IF EXISTS "Users can update their own case summaries" ON case_summaries;

CREATE POLICY "Users can create case summaries"
  ON case_summaries FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM cases
      WHERE cases.id = case_summaries.case_id
      AND cases.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Users can update their own case summaries"
  ON case_summaries FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM cases
      WHERE cases.id = case_summaries.case_id
      AND cases.user_id = (SELECT auth.uid())
    )
  );

-- Drop and recreate policies for comments table
DROP POLICY IF EXISTS "Users can create comments" ON comments;
DROP POLICY IF EXISTS "Users can update their own comments" ON comments;
DROP POLICY IF EXISTS "Users can delete their own comments" ON comments;

CREATE POLICY "Users can create comments"
  ON comments FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can update their own comments"
  ON comments FOR UPDATE
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can delete their own comments"
  ON comments FOR DELETE
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- Drop and recreate policies for health_indicators table
DROP POLICY IF EXISTS "Users can create health indicators" ON health_indicators;
DROP POLICY IF EXISTS "Users can update their own health indicators" ON health_indicators;
DROP POLICY IF EXISTS "Moderators can update any health indicators" ON health_indicators;

CREATE POLICY "Users can create health indicators"
  ON health_indicators FOR INSERT
  TO authenticated
  WITH CHECK (created_by = (SELECT auth.uid()));

CREATE POLICY "Users can update their own health indicators"
  ON health_indicators FOR UPDATE
  TO authenticated
  USING (created_by = (SELECT auth.uid()));

CREATE POLICY "Moderators can update any health indicators"
  ON health_indicators FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (SELECT auth.uid())
      AND is_moderator = true
    )
  );

-- Drop and recreate policies for metrics table
DROP POLICY IF EXISTS "Users can create metrics" ON metrics;
DROP POLICY IF EXISTS "Users can update their own metrics" ON metrics;
DROP POLICY IF EXISTS "Users can delete their own metrics" ON metrics;
DROP POLICY IF EXISTS "Users can manage their own metrics" ON metrics;

CREATE POLICY "Users can create metrics"
  ON metrics FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can update their own metrics"
  ON metrics FOR UPDATE
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can delete their own metrics"
  ON metrics FOR DELETE
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can manage their own metrics"
  ON metrics FOR ALL
  TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

-- Drop and recreate policies for reports table
DROP POLICY IF EXISTS "Users can create reports" ON reports;
DROP POLICY IF EXISTS "Users can update their own reports" ON reports;
DROP POLICY IF EXISTS "Users can delete their own reports" ON reports;
DROP POLICY IF EXISTS "Users can read published reports" ON reports;

CREATE POLICY "Users can create reports"
  ON reports FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can update their own reports"
  ON reports FOR UPDATE
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can delete their own reports"
  ON reports FOR DELETE
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can read published reports"
  ON reports FOR SELECT
  TO authenticated
  USING (
    publish_status = 'published' OR user_id = (SELECT auth.uid())
  );

-- Drop and recreate policies for resources table
DROP POLICY IF EXISTS "Users can create resources" ON resources;
DROP POLICY IF EXISTS "Users can update their own resources" ON resources;
DROP POLICY IF EXISTS "Users can delete their own resources" ON resources;

CREATE POLICY "Users can create resources"
  ON resources FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can update their own resources"
  ON resources FOR UPDATE
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can delete their own resources"
  ON resources FOR DELETE
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- Drop and recreate policies for services table
DROP POLICY IF EXISTS "Users can create services" ON services;
DROP POLICY IF EXISTS "Users can update their own services" ON services;
DROP POLICY IF EXISTS "Users can delete their own services" ON services;
DROP POLICY IF EXISTS "Users can manage their own services" ON services;

CREATE POLICY "Users can create services"
  ON services FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can update their own services"
  ON services FOR UPDATE
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can delete their own services"
  ON services FOR DELETE
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can manage their own services"
  ON services FOR ALL
  TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

-- Drop and recreate policies for app_settings table
DROP POLICY IF EXISTS "Only moderators can update app settings" ON app_settings;

CREATE POLICY "Only moderators can update app settings"
  ON app_settings FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (SELECT auth.uid())
      AND is_moderator = true
    )
  );

-- Drop and recreate policies for routing_audit_log table
DROP POLICY IF EXISTS "Moderators can view audit log" ON routing_audit_log;

CREATE POLICY "Moderators can view audit log"
  ON routing_audit_log FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (SELECT auth.uid())
      AND is_moderator = true
    )
  );

-- Drop and recreate policies for moderators table
DROP POLICY IF EXISTS "Admins can manage moderators" ON moderators;

CREATE POLICY "Admins can manage moderators"
  ON moderators FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (SELECT auth.uid())
      AND is_moderator = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (SELECT auth.uid())
      AND is_moderator = true
    )
  );

-- Drop and recreate policies for notification_queue table
DROP POLICY IF EXISTS "Admins can manage notification queue" ON notification_queue;

CREATE POLICY "Admins can manage notification queue"
  ON notification_queue FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (SELECT auth.uid())
      AND is_moderator = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (SELECT auth.uid())
      AND is_moderator = true
    )
  );