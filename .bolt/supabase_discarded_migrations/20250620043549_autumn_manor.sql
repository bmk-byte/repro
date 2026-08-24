/*
  # Fix Resources Table RLS Policies

  1. Changes
    - Create resources storage bucket if it doesn't exist
    - Add proper storage policies for the resources bucket
    - Enable RLS on resources table
    - Create comprehensive RLS policies for resources table
    - Add index on user_id for better performance
    
  2. Security
    - Allow authenticated users to upload resources
    - Allow public read access to resources
    - Ensure users can only update/delete their own resources
*/

-- First, ensure the resources storage bucket exists
INSERT INTO storage.buckets (id, name, public) 
VALUES ('resources', 'resources', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Storage policies for resources bucket
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Public read access to resources" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload resources" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own resources" ON storage.objects;

-- Create storage policies using the correct syntax
CREATE POLICY "Public read access to resources"
ON storage.objects FOR SELECT
USING (bucket_id = 'resources');

CREATE POLICY "Authenticated users can upload resources"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'resources');

CREATE POLICY "Users can delete their own resources"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'resources' AND owner = auth.uid()::text);

-- Ensure RLS is enabled on resources table
ALTER TABLE resources ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to recreate them properly
DROP POLICY IF EXISTS "Users can create resources" ON resources;
DROP POLICY IF EXISTS "Users can read all resources" ON resources;
DROP POLICY IF EXISTS "Users can update their own resources" ON resources;
DROP POLICY IF EXISTS "Users can delete their own resources" ON resources;

-- Create comprehensive RLS policies for resources table
CREATE POLICY "Users can create resources"
  ON resources
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read all resources"
  ON resources
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update their own resources"
  ON resources
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own resources"
  ON resources
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create index on user_id for better performance
CREATE INDEX IF NOT EXISTS resources_user_id_idx ON resources(user_id);