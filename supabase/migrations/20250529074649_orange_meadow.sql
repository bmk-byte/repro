/*
  # Update cases table foreign key relationship

  1. Changes
    - Drop existing foreign key from cases.user_id to users.id
    - Add new foreign key from cases.user_id to profiles.id
    
  2. Security
    - Maintain existing RLS policies
*/

-- Drop existing foreign key constraint
ALTER TABLE cases DROP CONSTRAINT IF EXISTS cases_user_id_fkey;

-- Add new foreign key constraint to profiles table
ALTER TABLE cases 
  ADD CONSTRAINT cases_user_id_fkey 
  FOREIGN KEY (user_id) 
  REFERENCES profiles(id)
  ON DELETE CASCADE;