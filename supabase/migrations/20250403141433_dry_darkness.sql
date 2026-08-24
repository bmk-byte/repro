/*
  # Add countries to the database

  1. New Data
    - Adds predefined list of countries to the countries table
    
  2. Changes
    - Inserts country records with names and regions
*/

-- Insert countries if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM countries WHERE name = 'Benin') THEN
    INSERT INTO countries (name, region) VALUES ('Benin', 'West Africa');
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM countries WHERE name = 'Ivory Coast/Côte d''Ivoire') THEN
    INSERT INTO countries (name, region) VALUES ('Ivory Coast/Côte d''Ivoire', 'West Africa');
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM countries WHERE name = 'Kenya') THEN
    INSERT INTO countries (name, region) VALUES ('Kenya', 'East Africa');
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM countries WHERE name = 'Madagascar') THEN
    INSERT INTO countries (name, region) VALUES ('Madagascar', 'East Africa');
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM countries WHERE name = 'Malawi') THEN
    INSERT INTO countries (name, region) VALUES ('Malawi', 'Southern Africa');
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM countries WHERE name = 'Nigeria') THEN
    INSERT INTO countries (name, region) VALUES ('Nigeria', 'West Africa');
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM countries WHERE name = 'Senegal') THEN
    INSERT INTO countries (name, region) VALUES ('Senegal', 'West Africa');
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM countries WHERE name = 'South Africa') THEN
    INSERT INTO countries (name, region) VALUES ('South Africa', 'Southern Africa');
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM countries WHERE name = 'Uganda') THEN
    INSERT INTO countries (name, region) VALUES ('Uganda', 'East Africa');
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM countries WHERE name = 'Zimbabwe') THEN
    INSERT INTO countries (name, region) VALUES ('Zimbabwe', 'Southern Africa');
  END IF;
END $$;