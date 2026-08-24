/*
  # Add Law Documents Schema

  1. Changes
    - Create law_documents table for storing legal documents
    - Add necessary columns for document content and metadata
    - Add constraints and indexes for better performance
    
  2. Security
    - Enable RLS policies for secure access
*/

-- Drop existing table if it exists
DROP TABLE IF EXISTS law_documents;

-- Create law_documents table
CREATE TABLE law_documents (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  content text NOT NULL,
  country_id uuid REFERENCES countries(id) NOT NULL,
  category text NOT NULL,
  type text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT law_documents_type_check CHECK (type IN ('policy', 'act'))
);

-- Create indexes for better performance
CREATE INDEX law_documents_country_id_idx ON law_documents(country_id);
CREATE INDEX law_documents_type_idx ON law_documents(type);
CREATE INDEX law_documents_category_idx ON law_documents(category);
CREATE INDEX law_documents_created_at_idx ON law_documents(created_at);

-- Enable RLS
ALTER TABLE law_documents ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Public can view law documents"
  ON law_documents
  FOR SELECT
  USING (true);

CREATE POLICY "Only admins can insert law documents"
  ON law_documents
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

CREATE POLICY "Only admins can update law documents"
  ON law_documents
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_law_documents_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER update_law_documents_updated_at
  BEFORE UPDATE ON law_documents
  FOR EACH ROW
  EXECUTE FUNCTION update_law_documents_updated_at();