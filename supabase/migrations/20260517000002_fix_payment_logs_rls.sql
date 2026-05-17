-- Fix: replace broken payment_logs RLS policy with the same pattern
-- used by all other tables in this project (auth.role() = 'authenticated').

DROP POLICY IF EXISTS "payment_logs_store_access" ON public.payment_logs;

CREATE POLICY "Authenticated users can read payment_logs"
  ON public.payment_logs FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage payment_logs"
  ON public.payment_logs FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');
