/*
  # Add Country Field to Judgments Table

  1. Changes
    - Add country_id column to judgments table as nullable first
    - Add foreign key constraint to reference countries table
    - Add index for better query performance
    - Update existing rows with a default country if needed
    - Make the column NOT NULL after data is updated

  2. Security
    - Maintain existing RLS policies
*/

-- Add country_id column as nullable first
ALTER TABLE judgments
ADD COLUMN country_id uuid REFERENCES countries(id);

-- Create index for better performance
CREATE INDEX judgments_country_id_idx ON judgments(country_id);

-- Get a default country ID (Uganda) to use for existing records
DO $$
DECLARE
  default_country_id uuid;
BEGIN
  -- Get Uganda's ID
  SELECT id INTO default_country_id
  FROM countries
  WHERE name = 'Uganda'
  LIMIT 1;

  -- Update existing records with the default country
  IF default_country_id IS NOT NULL THEN
    UPDATE judgments
    SET country_id = default_country_id
    WHERE country_id IS NULL;
  END IF;
END $$;

-- Now make the column NOT NULL
ALTER TABLE judgments
ALTER COLUMN country_id SET NOT NULL;