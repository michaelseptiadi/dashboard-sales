-- Create user_store_roles table
-- Maps users to stores with a role (admin | cashier)
-- A user can have at most one role per store

CREATE TABLE public.user_store_roles (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  store_id   UUID        NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  role       TEXT        NOT NULL CHECK (role IN ('admin', 'cashier')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, store_id)
);

ALTER TABLE public.user_store_roles ENABLE ROW LEVEL SECURITY;

-- Users can read their own role assignments
CREATE POLICY "users_view_own_roles"
  ON public.user_store_roles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Only service role can manage role assignments (no direct client writes)
-- Role management should be done via Supabase dashboard or a trusted backend
