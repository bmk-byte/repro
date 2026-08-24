/*
  # Organization-Based Case Access Control with Helper Functions
  
  ## Overview
  This migration implements organization-based access control for case viewing.
  It creates helper functions to identify user types and updates RLS policies
  to restrict case viewing based on user organization.
  
  ## Changes Made
  
  ### 1. Helper Functions
  - `is_afyanahaki_moderator()` - Returns true if current user is a moderator with @afyanahaki.org email
  - `get_user_organization()` - Returns the organization of the current user from profiles table
  - `is_restricted_organization(org_name text)` - Returns true if organization is in the restricted list
  
  ### 2. RLS Policy Updates for Cases Table
  Replaces existing moderator read policies with organization-aware policies:
  
  - **Policy 1: Afyanahaki moderators see all cases**
    - Full access to all litigation and rapid response cases
    - For moderators with @afyanahaki.org email
  
  - **Policy 2: Organization moderators see only own cases**
    - Restricted to cases they personally uploaded
    - For moderators from: The Hub, Femme Forte Uganda, UGANET, CSCHRCL, KELIN, WLSA
  
  - **Policy 3: Regular users see own cases**
    - Unchanged - non-moderators see only their own cases
  
  - **Policy 4: Other moderators see all cases**
    - Fallback for moderators not in restricted organizations and not from afyanahaki.org
  
  ### 3. Performance Indexes
  - Index on `cases.created_at` for time-based filtering
  - Composite index on `(case_type, created_at, user_id)` for common queries
  
  ## Security Notes
  - Database-level enforcement prevents unauthorized access
  - Organization-restricted moderators have focused view
  - afyanahaki.org maintains full oversight capability
  - Cannot be bypassed from frontend
*/

-- =====================================================
-- STEP 1: Create Helper Functions
-- =====================================================

-- Function to check if current user is an afyanahaki.org moderator
CREATE OR REPLACE FUNCTION is_afyanahaki_moderator()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_email text;
  user_is_moderator boolean;
BEGIN
  -- Get current user's email and moderator status
  SELECT email, is_moderator INTO user_email, user_is_moderator
  FROM profiles
  WHERE id = auth.uid();
  
  -- Return true if user is moderator AND email ends with @afyanahaki.org
  RETURN (user_is_moderator = true AND user_email LIKE '%@afyanahaki.org');
END;
$$;

-- Function to get current user's organization
CREATE OR REPLACE FUNCTION get_user_organization()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_org text;
BEGIN
  SELECT organization INTO user_org
  FROM profiles
  WHERE id = auth.uid();
  
  RETURN user_org;
END;
$$;

-- Function to check if organization is in the restricted list
CREATE OR REPLACE FUNCTION is_restricted_organization(org_name text)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  -- List of organizations that should only see their own cases
  RETURN org_name IN (
    'The Hub',
    'Femme Forte Uganda',
    'UGANET',
    'CSCHRCL',
    'KELIN',
    'WLSA'
  );
END;
$$;

-- =====================================================
-- STEP 2: Update RLS Policies for Cases Table
-- =====================================================

-- Drop existing moderator policies that allow all case viewing
DROP POLICY IF EXISTS "Moderators can read all cases" ON cases;
DROP POLICY IF EXISTS "Moderators can view all cases" ON cases;

-- Policy 1: Afyanahaki moderators see all cases
CREATE POLICY "Afyanahaki moderators see all cases"
  ON cases
  FOR SELECT
  TO authenticated
  USING (is_afyanahaki_moderator());

-- Policy 2: Organization moderators see only own cases
CREATE POLICY "Organization moderators see only own cases"
  ON cases
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_moderator = true
      AND is_restricted_organization(profiles.organization)
    )
    AND user_id = auth.uid()
  );

-- Policy 3: Other moderators see all cases (not in restricted orgs, not afyanahaki)
CREATE POLICY "Other moderators see all cases"
  ON cases
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_moderator = true
      AND NOT is_restricted_organization(COALESCE(profiles.organization, ''))
      AND NOT (profiles.email LIKE '%@afyanahaki.org')
    )
  );

-- Note: "Users can read own cases" policy should already exist and remains unchanged

-- =====================================================
-- STEP 3: Add Performance Indexes
-- =====================================================

-- Index for time-based filtering on created_at
CREATE INDEX IF NOT EXISTS idx_cases_created_at ON cases(created_at DESC);

-- Composite index for common queries (case_type, created_at, user_id)
CREATE INDEX IF NOT EXISTS idx_cases_type_date_user ON cases(case_type, created_at DESC, user_id);

-- Index on user_id for ownership filtering (if not exists)
CREATE INDEX IF NOT EXISTS idx_cases_user_id ON cases(user_id);

-- =====================================================
-- STEP 4: Grant Execute Permissions on Helper Functions
-- =====================================================

GRANT EXECUTE ON FUNCTION is_afyanahaki_moderator() TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_organization() TO authenticated;
GRANT EXECUTE ON FUNCTION is_restricted_organization(text) TO authenticated;