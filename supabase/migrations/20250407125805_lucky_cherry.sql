/*
  # Legal Document Management System Schema

  1. New Tables
    - law_documents
      - id (uuid, primary key)
      - title (text)
      - description (text)
      - country_id (uuid, references countries)
      - category (text)
      - year (integer)
      - file_url (text)
      - file_type (text)
      - tags (text[])
      - ai_tags (text[])
      - language (text)
      - status (text)
      - uploaded_by (uuid)
      - created_at (timestamp)
      - updated_at (timestamp)

    - case_documents
      - id (uuid, primary key)
      - case_id (uuid, references cases)
      - title (text)
      - document_type (text)
      - file_url (text)
      - uploaded_by (uuid)
      - created_at (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for role-based access
*/

-- Create law_documents table
CREATE TABLE law_documents (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  description text,
  country_id uuid REFERENCES countries(id),
  category text NOT NULL,
  year integer,
  file_url text NOT NULL,
  file_type text NOT NULL,
  tags text[] DEFAULT '{}',
  ai_tags text[] DEFAULT '{}',
  language text NOT NULL,
  status text DEFAULT 'published',
  uploaded_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add constraints
ALTER TABLE law_documents
ADD CONSTRAINT law_documents_file_type_check
CHECK (file_type IN ('pdf', 'docx', 'html'));

ALTER TABLE law_documents
ADD CONSTRAINT law_documents_status_check
CHECK (status IN ('draft', 'published', 'archived'));

ALTER TABLE law_documents
ADD CONSTRAINT law_documents_language_check
CHECK (language IN ('en', 'fr', 'pt', 'sw', 'ar'));

-- Create case_documents table
CREATE TABLE case_documents (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  case_id uuid REFERENCES cases(id) ON DELETE CASCADE,
  title text NOT NULL,
  document_type text NOT NULL,
  file_url text NOT NULL,
  uploaded_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

-- Add constraint for document types
ALTER TABLE case_documents
ADD CONSTRAINT case_documents_type_check
CHECK (document_type IN (
  'complaint',
  'response',
  'motion',
  'brief',
  'order',
  'judgment',
  'evidence',
  'correspondence',
  'other'
));

-- Enable RLS
ALTER TABLE law_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE case_documents ENABLE ROW LEVEL SECURITY;

-- RLS Policies for law_documents
CREATE POLICY "Public can view published laws"
  ON law_documents
  FOR SELECT
  USING (status = 'published');

CREATE POLICY "Contributors can create laws"
  ON law_documents
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'contributor')
    )
  );

CREATE POLICY "Contributors can update their own laws"
  ON law_documents
  FOR UPDATE
  TO authenticated
  USING (
    uploaded_by = auth.uid() AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'contributor')
    )
  );

CREATE POLICY "Admins can delete laws"
  ON law_documents
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

-- RLS Policies for case_documents
CREATE POLICY "Authenticated users can view case documents"
  ON case_documents
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Contributors can upload case documents"
  ON case_documents
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'contributor')
    )
  );

CREATE POLICY "Contributors can update their own case documents"
  ON case_documents
  FOR UPDATE
  TO authenticated
  USING (
    uploaded_by = auth.uid() AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'contributor')
    )
  );

-- Create indexes for better query performance
CREATE INDEX law_documents_country_id_idx ON law_documents(country_id);
CREATE INDEX law_documents_category_idx ON law_documents(category);
CREATE INDEX law_documents_year_idx ON law_documents(year);
CREATE INDEX law_documents_tags_idx ON law_documents USING GIN(tags);
CREATE INDEX law_documents_ai_tags_idx ON law_documents USING GIN(ai_tags);
CREATE INDEX law_documents_language_idx ON law_documents(language);
CREATE INDEX law_documents_status_idx ON law_documents(status);

CREATE INDEX case_documents_case_id_idx ON case_documents(case_id);
CREATE INDEX case_documents_document_type_idx ON case_documents(document_type);

-- Create storage bucket for legal documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('legal-documents', 'legal-documents', true);

-- Storage policies
CREATE POLICY "Public can read legal documents"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'legal-documents');

CREATE POLICY "Contributors can upload legal documents"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'legal-documents' AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'contributor')
    )
  );

CREATE POLICY "Contributors can update their documents"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'legal-documents' AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'contributor')
    )
  );