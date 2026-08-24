-- Drop the trigger that automatically creates profiles for new users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Drop the function that handles profile creation
DROP FUNCTION IF EXISTS handle_new_user();

-- Add a comment explaining the change
COMMENT ON TABLE profiles IS 'User profiles are now created explicitly by the application instead of automatically by a trigger';