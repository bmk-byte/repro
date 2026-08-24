/*
  # Fix Judgment Insert Policy

  1. Changes
    - Safely drop the existing restrictive INSERT policy if it exists
    - Create a new INSERT policy that allows both regular users and moderators to insert judgments
    - Use DO block to check if policy exists before creating it
    
  2. Security
    - Maintain existing security model
    - Allow users to insert their own judgments
    - Allow moderators to insert any judgment (for approval process)
*/

-- Safely drop the existing restrictive INSERT policy
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'judgments' 
    AND policyname = 'Authenticated users can upload judgments'
  ) THEN
    DROP POLICY "Authenticated users can upload judgments" ON public.judgments;
  END IF;
  
  -- Check if the new policy already exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'judgments' 
    AND policyname = 'Users and moderators can insert judgments'
  ) THEN
    -- Create a new INSERT policy that allows both regular users and moderators
    CREATE POLICY "Users and moderators can insert judgments"
      ON public.judgments
      FOR INSERT
      TO authenticated
      WITH CHECK (
        -- Allow users to insert their own judgments
        (auth.uid() = uploaded_by) OR
        -- Allow moderators to insert any judgment (for approval process)
        (EXISTS (
          SELECT 1
          FROM public.profiles
          WHERE profiles.id = auth.uid() 
          AND (profiles.is_moderator = true OR profiles.email LIKE '%@afyanahaki.org')
        ))
      );
  END IF;
END $$;