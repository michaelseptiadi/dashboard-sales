-- Allow superadmins to delete user profiles
-- (removes the user from the app; auth account still exists but has no access)
CREATE POLICY "superadmins_delete_profiles"
  ON public.profiles FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'superadmin'
    )
  );

GRANT DELETE ON public.profiles TO authenticated;
