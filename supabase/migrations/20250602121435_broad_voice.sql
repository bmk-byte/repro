/*
  # Drop handle_new_user trigger and function

  1. Changes
    - Drop the trigger that automatically creates profiles for new users
    - Drop the function that handles profile creation
    - Add a comment explaining the change
    
  2. Reason
    - The automatic profile creation is causing conflicts with the application's own profile creation
    - This leads to "Database error saving new user" when both try to create the same profile
    - Moving to explicit profile creation in the application code for better control
*/

-- Drop the trigger that automatically creates profiles for new users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Drop the function that handles profile creation
DROP FUNCTION IF EXISTS handle_new_user();

-- Add a comment explaining the change
COMMENT ON TABLE profiles IS 'User profiles are now created explicitly by the application instead of automatically by a trigger';