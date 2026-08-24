/*
  # Create Health Indicators Table

  1. New Table
    - health_indicators
      - id (uuid, primary key)
      - country_id (uuid, references countries)
      - indicator_type (text)
      - value (numeric)
      - year (integer)
      - month (integer)
      - source (text)
      - notes (text)
      - created_at (timestamptz)
      - updated_at (timestamptz)
      - created_by (uuid, references profiles)

  2. Security
    - Enable RLS
    - Add policies for authenticated users
*/

-- Create health_indicators table
CREATE TABLE health_indicators (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  country_id uuid REFERENCES countries(id) NOT NULL,
  indicator_type text NOT NULL,
  value numeric NOT NULL,
  year integer NOT NULL,
  month integer NOT NULL,
  source text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES profiles(id)
);

-- Add check constraint for indicator_type
ALTER TABLE health_indicators
ADD CONSTRAINT health_indicators_indicator_type_check
CHECK (indicator_type IN (
  'maternal_mortality',
  'contraceptive_access',
  'adolescent_health',
  'sgbv_reporting',
  'hiv_testing',
  'antenatal_care',
  'skilled_birth_attendance',
  'child_marriage',
  'fgm_prevalence',
  'menstrual_health'
));

-- Add check constraint for month (1-12)
ALTER TABLE health_indicators
ADD CONSTRAINT health_indicators_month_check
CHECK (month BETWEEN 1 AND 12);

-- Create indexes for better query performance
CREATE INDEX health_indicators_country_id_idx ON health_indicators(country_id);
CREATE INDEX health_indicators_indicator_type_idx ON health_indicators(indicator_type);
CREATE INDEX health_indicators_year_month_idx ON health_indicators(year, month);
CREATE INDEX health_indicators_created_by_idx ON health_indicators(created_by);

-- Enable RLS
ALTER TABLE health_indicators ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view all health indicators"
  ON health_indicators
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create health indicators"
  ON health_indicators
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own health indicators"
  ON health_indicators
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by);

CREATE POLICY "Moderators can update any health indicators"
  ON health_indicators
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND (profiles.is_moderator = true OR profiles.email LIKE '%@afyanahaki.org')
    )
  );

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_health_indicators_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER update_health_indicators_updated_at
  BEFORE UPDATE ON health_indicators
  FOR EACH ROW
  EXECUTE FUNCTION update_health_indicators_updated_at();