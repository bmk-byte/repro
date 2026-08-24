-- Add profession and organization fields to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS profession text,
ADD COLUMN IF NOT EXISTS organization text;

-- Update handle_new_user function to include profession and organization
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (
    id, 
    full_name, 
    role, 
    email, 
    is_moderator,
    profession,
    organization
  )
  VALUES (
    new.id,
    new.raw_user_meta_data->>'full_name',
    'user',
    new.email,
    COALESCE(new.raw_user_meta_data->>'is_moderator', 'false')::boolean,
    new.raw_user_meta_data->>'profession',
    new.raw_user_meta_data->>'organization'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;