/*
  # Add Row Level Security Policies

  1. New Policies
    - Enable RLS on all tables
    - Add read policies for profiles table
    - Add read policies for cases table
    - Add read policies for law_documents table
    - Add read policies for pending_submissions table
    - Add read policies for countries table

  2. Security
    - Ensure proper access control for different user roles
    - Protect sensitive data while allowing necessary access
    - Enable public access where appropriate

  3. Changes
    - Add RLS policies for authenticated users
    - Add RLS policies for anonymous users
    - Add special policies for moderators
*/

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE law_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE pending_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE countries ENABLE ROW LEVEL SECURITY;

-- Profiles table policies
CREATE POLICY "Allow own profile read"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Allow authenticated read public profile info"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (true);

-- Cases table policies
CREATE POLICY "Allow authenticated read approved cases"
  ON cases
  FOR SELECT
  TO authenticated
  USING (moderation_status = 'approved'::text);

CREATE POLICY "Allow anon read approved cases"
  ON cases
  FOR SELECT
  TO anon
  USING (moderation_status = 'approved'::text);

-- Law documents table policies
CREATE POLICY "Allow authenticated read approved law docs"
  ON law_documents
  FOR SELECT
  TO authenticated
  USING (moderation_status = 'approved'::text);

CREATE POLICY "Allow anon read approved law docs"
  ON law_documents
  FOR SELECT
  TO anon
  USING (moderation_status = 'approved'::text);

-- Pending submissions table policies
CREATE POLICY "Allow moderators read pending submissions"
  ON pending_submissions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM profiles
      WHERE profiles.id = auth.uid()
      AND (profiles.is_moderator = true OR profiles.email LIKE '%@afyanahaki.org')
    )
  );

-- Countries table policies
CREATE POLICY "Allow all read countries"
  ON countries
  FOR SELECT
  TO authenticated, anon
  USING (true);

-- Add special moderator read policies
CREATE POLICY "Allow moderators read all cases"
  ON cases
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM profiles
      WHERE profiles.id = auth.uid()
      AND (profiles.is_moderator = true OR profiles.email LIKE '%@afyanahaki.org')
    )
  );

CREATE POLICY "Allow moderators read all law documents"
  ON law_documents
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM profiles
      WHERE profiles.id = auth.uid()
      AND (profiles.is_moderator = true OR profiles.email LIKE '%@afyanahaki.org')
    )
  );

-- Add policies for users to read their own submissions
CREATE POLICY "Allow users read own submissions"
  ON pending_submissions
  FOR SELECT
  TO authenticated
  USING (submitted_by = auth.uid());

-- Add policies for users to read their own cases
CREATE POLICY "Allow users read own cases"
  ON cases
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());