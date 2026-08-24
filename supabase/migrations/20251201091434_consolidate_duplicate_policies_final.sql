/*
  # Consolidate Duplicate RLS Policies - Final

  1. Security Improvements
    - Remove only the actual duplicate policies
    - Keep consolidated policies that already exist
*/

-- Check and drop old duplicate policies on cases (new consolidated ones already exist)
DROP POLICY IF EXISTS "Allow anon read approved cases" ON cases;
DROP POLICY IF EXISTS "Authorized users can delete cases" ON cases;
DROP POLICY IF EXISTS "Authorized users can update any case" ON cases;
DROP POLICY IF EXISTS "Allow authenticated read approved cases" ON cases;
DROP POLICY IF EXISTS "Allow moderators read all cases" ON cases;
DROP POLICY IF EXISTS "Allow users read own cases" ON cases;
DROP POLICY IF EXISTS "Moderators can insert cases" ON cases;

-- Drop duplicate countries policies
DROP POLICY IF EXISTS "Allow all read countries" ON countries;

-- Drop duplicate judgments policies
DROP POLICY IF EXISTS "Moderators can insert judgments" ON judgments;
DROP POLICY IF EXISTS "Authorized users can update any judgment" ON judgments;

-- Drop duplicate law_documents policies
DROP POLICY IF EXISTS "Allow anon read approved law docs" ON law_documents;
DROP POLICY IF EXISTS "Allow authenticated read approved law docs" ON law_documents;
DROP POLICY IF EXISTS "Allow moderators read all law documents" ON law_documents;

-- Drop duplicate audit_logs policies
DROP POLICY IF EXISTS "Authorized users can view audit logs" ON audit_logs;

-- Drop duplicate metrics policies
DROP POLICY IF EXISTS "Users can manage their own metrics" ON metrics;

-- Drop duplicate moderators policies
DROP POLICY IF EXISTS "Moderators can view all moderators" ON moderators;

-- Drop duplicate profiles policies
DROP POLICY IF EXISTS "Allow authenticated read public profile info" ON profiles;

-- Drop duplicate reports policies
DROP POLICY IF EXISTS "Users can read all reports" ON reports;

-- Drop duplicate services policies
DROP POLICY IF EXISTS "Users can manage their own services" ON services;