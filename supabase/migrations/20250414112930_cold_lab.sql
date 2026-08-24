/*
  # Add Judgments Table

  1. New Tables
    - judgments
      - id (uuid, primary key)
      - citation (text)
      - media_neutral_citation (text)
      - court (text)
      - case_number (text)
      - judges (text)
      - judgment_date (date)
      - language (text)
      - type (text)
      - flynote (text)
      - case_summary (text)
      - file_url (text)
      - uploaded_by (uuid, references auth.users)
      - created_at (timestamptz)
      - updated_at (timestamptz)

  2. Security
    - Enable RLS
    - Add policies for authenticated users
*/

-- Create judgments table
CREATE TABLE judgments (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  citation text NOT NULL,
  media_neutral_citation text NOT NULL,
  court text NOT NULL,
  case_number text NOT NULL,
  judges text NOT NULL,
  judgment_date date NOT NULL,
  language text NOT NULL,
  type text NOT NULL,
  flynote text NOT NULL,
  case_summary text NOT NULL,
  file_url text NOT NULL,
  uploaded_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add constraints
ALTER TABLE judgments
ADD CONSTRAINT judgments_language_check
CHECK (language IN ('English', 'French', 'Portuguese', 'Swahili'));

ALTER TABLE judgments
ADD CONSTRAINT judgments_type_check
CHECK (type IN (
  'Final Judgment',
  'Interim Order',
  'Ruling',
  'Consent Judgment',
  'Default Judgment'
));

-- Create indexes
CREATE INDEX judgments_court_idx ON judgments(court);
CREATE INDEX judgments_judgment_date_idx ON judgments(judgment_date);
CREATE INDEX judgments_uploaded_by_idx ON judgments(uploaded_by);
CREATE INDEX judgments_created_at_idx ON judgments(created_at);

-- Enable RLS
ALTER TABLE judgments ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Anyone can read judgments"
  ON judgments
  FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can upload judgments"
  ON judgments
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = uploaded_by);

CREATE POLICY "Users can update their own judgments"
  ON judgments
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = uploaded_by);

-- Create storage bucket for judgments
INSERT INTO storage.buckets (id, name, public)
VALUES ('judgments', 'judgments', true);

-- Storage policies
CREATE POLICY "Anyone can read judgment documents"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'judgments');

CREATE POLICY "Authenticated users can upload judgment documents"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'judgments');

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_judgments_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER update_judgments_updated_at
  BEFORE UPDATE ON judgments
  FOR EACH ROW
  EXECUTE FUNCTION update_judgments_updated_at();