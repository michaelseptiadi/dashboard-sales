-- Grant SELECT on user_store_roles to authenticated users
-- RLS policies restrict rows; this grants table-level access
GRANT SELECT ON public.user_store_roles TO authenticated;
