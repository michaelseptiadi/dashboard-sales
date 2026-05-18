BEGIN;

-- Grant table-level permissions to the roles PostgREST uses.
-- Without these, RLS policies are never reached — Postgres rejects
-- the query before even evaluating them.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.deliveries     TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.delivery_items TO authenticated;

-- anon role needs SELECT to resolve foreign-key joins in the API
GRANT SELECT ON public.deliveries     TO anon;
GRANT SELECT ON public.delivery_items TO anon;

COMMIT;
