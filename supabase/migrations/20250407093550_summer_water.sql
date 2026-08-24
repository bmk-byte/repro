/*
  # Add Case Summaries and Expert Commentary

  1. New Tables
    - case_summaries
      - id (uuid, primary key)
      - case_id (uuid, references cases)
      - key_issues (text[])
      - legal_arguments (text)
      - majority_opinion (text)
      - dissenting_opinion (text)
      - concurring_opinion (text)
      - case_outcome (text)
      - implications (text)
      - created_at (timestamp)
      - updated_at (timestamp)
    
    - expert_commentaries
      - id (uuid, primary key)
      - case_id (uuid, references cases)
      - expert_id (uuid, references profiles)
      - analysis (text)
      - significance (text)
      - recommendations (text)
      - created_at (timestamp)
      - updated_at (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
*/

-- Create case_summaries table
CREATE TABLE case_summaries (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  case_id uuid REFERENCES cases(id) ON DELETE CASCADE,
  key_issues text[],
  legal_arguments text,
  majority_opinion text,
  dissenting_opinion text,
  concurring_opinion text,
  case_outcome text,
  implications text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE case_summaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read case summaries"
  ON case_summaries
  FOR SELECT
  USING (true);

CREATE POLICY "Users can create case summaries"
  ON case_summaries
  FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM cases
    WHERE id = case_id AND user_id = auth.uid()
  ));

CREATE POLICY "Users can update their own case summaries"
  ON case_summaries
  FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM cases
    WHERE id = case_id AND user_id = auth.uid()
  ));

-- Create expert_commentaries table
CREATE TABLE expert_commentaries (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  case_id uuid REFERENCES cases(id) ON DELETE CASCADE,
  expert_id uuid REFERENCES profiles(id),
  analysis text,
  significance text,
  recommendations text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE expert_commentaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read expert commentaries"
  ON expert_commentaries
  FOR SELECT
  USING (true);

CREATE POLICY "Experts can create commentaries"
  ON expert_commentaries
  FOR INSERT
  TO authenticated
  WITH CHECK (
    expert_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'expert'
    )
  );

CREATE POLICY "Experts can update their own commentaries"
  ON expert_commentaries
  FOR UPDATE
  TO authenticated
  USING (expert_id = auth.uid());

-- Add expert role to profiles
DO $$
BEGIN
  ALTER TABLE profiles
    DROP CONSTRAINT IF EXISTS profiles_role_check;
  
  ALTER TABLE profiles
    ADD CONSTRAINT profiles_role_check
    CHECK (role IN ('user', 'expert', 'admin'));
END $$;