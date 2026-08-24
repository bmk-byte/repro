-- Enable RLS on profiles table if not already enabled
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Add phone_number column to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS phone_number text;

-- Add policy for moderators to read user data
DROP POLICY IF EXISTS "Moderators can read all user data" ON profiles;

CREATE POLICY "Moderators can read all user data"
ON profiles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles AS p
    WHERE p.id = auth.uid()
    AND p.is_moderator = true
  )
);

-- Fix foreign key relationship for law_documents
ALTER TABLE law_documents
DROP CONSTRAINT IF EXISTS law_documents_uploaded_by_fkey;

ALTER TABLE law_documents
ADD CONSTRAINT law_documents_uploaded_by_fkey
FOREIGN KEY (uploaded_by) REFERENCES auth.users(id);