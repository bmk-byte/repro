-- Drop the existing restrictive INSERT policy
DROP POLICY IF EXISTS "Authenticated users can upload judgments" ON public.judgments;

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