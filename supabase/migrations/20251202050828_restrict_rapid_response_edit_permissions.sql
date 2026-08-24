/*
  # Restrict Rapid Response Case Edit Permissions

  1. Security Changes
    - Update RLS policy to allow moderators to edit only their own rapid response cases
    - Moderators can only edit cases where user_id matches their auth.uid()
    - Regular users can still edit their own cases
    - Litigation cases maintain existing permissions
  
  2. Policy Changes
    - Drop broad "Moderators can update any case" policy for rapid response cases
    - Create specific policy for moderators to edit their own rapid response cases
    - Keep existing policy for users to edit their own cases
*/

-- Drop the duplicate "Authorized users can update any case" policy
DROP POLICY IF EXISTS "Authorized users can update any case" ON cases;

-- Update the moderator policy to only allow editing own rapid response cases
DROP POLICY IF EXISTS "Moderators can update any case" ON cases;

CREATE POLICY "Moderators can update any litigation case"
  ON cases FOR UPDATE
  TO authenticated
  USING (
    current_user_is_moderator() 
    AND case_type != 'rapid-response'
  );

CREATE POLICY "Moderators can update own rapid response cases"
  ON cases FOR UPDATE
  TO authenticated
  USING (
    current_user_is_moderator() 
    AND case_type = 'rapid-response'
    AND user_id = (SELECT auth.uid())
  );

-- Note: The existing "Users can update their own cases" policy already covers
-- regular users updating their own cases, regardless of case type