/*
  # Add Content Moderation System

  1. Changes
    - Add is_moderator column to profiles table
    - Add moderation_status column to cases and law_documents tables
    - Update RLS policies for moderation
    - Update handle_new_user function

  2. Security
    - Add RLS policies for moderators
    - Restrict content visibility based on moderation status
*/

-- Add is_moderator column to profiles
ALTER TABLE profiles 
ADD COLUMN is_moderator BOOLEAN DEFAULT FALSE;

-- Add moderation_status to cases
ALTER TABLE cases 
ADD COLUMN moderation_status TEXT DEFAULT 'pending'
CHECK (moderation_status IN ('pending', 'approved', 'rejected'));

-- Add moderation_status to law_documents
ALTER TABLE law_documents 
ADD COLUMN moderation_status TEXT DEFAULT 'pending'
CHECK (moderation_status IN ('pending', 'approved', 'rejected'));

-- Update handle_new_user function
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role, email, is_moderator)
  VALUES (
    new.id,
    new.raw_user_meta_data->>'full_name',
    'user',
    new.email,
    FALSE
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update RLS policies for cases
DROP POLICY IF EXISTS "Anyone can read cases" ON cases;
CREATE POLICY "Anyone can read approved cases"
  ON cases FOR SELECT
  USING (moderation_status = 'approved');

CREATE POLICY "Moderators can read all cases"
  ON cases FOR SELECT
  TO authenticated
  USING (
    (SELECT is_moderator FROM profiles WHERE id = auth.uid())
    OR user_id = auth.uid()
  );

-- Update RLS policies for law_documents
DROP POLICY IF EXISTS "Public can view law documents" ON law_documents;
CREATE POLICY "Anyone can read approved law documents"
  ON law_documents FOR SELECT
  USING (moderation_status = 'approved');

CREATE POLICY "Moderators can read all law documents"
  ON law_documents FOR SELECT
  TO authenticated
  USING (
    (SELECT is_moderator FROM profiles WHERE id = auth.uid())
    OR uploaded_by = auth.uid()
  );