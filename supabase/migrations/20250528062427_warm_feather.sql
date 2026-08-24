/*
  # Update RLS Policies for Authorized Users

  1. Changes
    - Add policies for @afyanahaki.org users to delete and update cases
    - Add policies for @afyanahaki.org users to delete and update judgments
    
  2. Security
    - Maintain existing RLS policies
    - Add new policies for authorized users
*/

-- Update RLS policies for cases table
DROP POLICY IF EXISTS "Authorized users can delete cases" ON cases;
DROP POLICY IF EXISTS "Authorized users can update any case" ON cases;

CREATE POLICY "Authorized users can delete cases"
  ON cases
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid()
      AND email LIKE '%@afyanahaki.org'
    )
  );

CREATE POLICY "Authorized users can update any case"
  ON cases
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid()
      AND email LIKE '%@afyanahaki.org'
    )
  );

-- Update RLS policies for judgments table
DROP POLICY IF EXISTS "Authorized users can delete judgments" ON judgments;
DROP POLICY IF EXISTS "Authorized users can update any judgment" ON judgments;

CREATE POLICY "Authorized users can delete judgments"
  ON judgments
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid()
      AND email LIKE '%@afyanahaki.org'
    )
  );

CREATE POLICY "Authorized users can update any judgment"
  ON judgments
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid()
      AND email LIKE '%@afyanahaki.org'
    )
  );