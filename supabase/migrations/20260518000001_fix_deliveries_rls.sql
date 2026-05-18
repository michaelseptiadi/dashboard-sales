BEGIN;

-- Re-enable RLS (idempotent)
ALTER TABLE public.deliveries     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_items ENABLE ROW LEVEL SECURITY;

-- Drop existing policies so we can recreate them cleanly
DROP POLICY IF EXISTS "Authenticated users can manage deliveries"     ON public.deliveries;
DROP POLICY IF EXISTS "Authenticated users can manage delivery_items" ON public.delivery_items;

-- deliveries: explicit per-operation policies
CREATE POLICY "deliveries_select" ON public.deliveries
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "deliveries_insert" ON public.deliveries
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "deliveries_update" ON public.deliveries
  FOR UPDATE USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "deliveries_delete" ON public.deliveries
  FOR DELETE USING (auth.uid() IS NOT NULL);

-- delivery_items: explicit per-operation policies
CREATE POLICY "delivery_items_select" ON public.delivery_items
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "delivery_items_insert" ON public.delivery_items
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "delivery_items_update" ON public.delivery_items
  FOR UPDATE USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "delivery_items_delete" ON public.delivery_items
  FOR DELETE USING (auth.uid() IS NOT NULL);

COMMIT;
