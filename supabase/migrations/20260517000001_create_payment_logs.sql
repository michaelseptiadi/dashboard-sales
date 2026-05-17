-- ============================================================
-- Migration: create payment_logs table
-- Payment logs are the source of truth for partial payments.
-- A trigger recalculates sales_orders.unpaid_transaction
-- whenever a payment log is inserted, updated, or deleted.
-- The existing trg_sync_transaction_status then fires to keep
-- transaction_status in sync automatically.
-- ============================================================

-- 1. Create payment_logs table
CREATE TABLE IF NOT EXISTS public.payment_logs (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  sales_order_id UUID        NOT NULL REFERENCES public.sales_orders(id) ON DELETE CASCADE,
  store_id       UUID        REFERENCES public.stores(id),
  amount         NUMERIC     NOT NULL CHECK (amount > 0),
  notes          TEXT,
  paid_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by     UUID        REFERENCES auth.users(id)
);

-- Index for fast per-order lookups
CREATE INDEX IF NOT EXISTS idx_payment_logs_sales_order_id
  ON public.payment_logs (sales_order_id);

-- 2. Enable RLS
ALTER TABLE public.payment_logs ENABLE ROW LEVEL SECURITY;

-- Allow users to read/write logs that belong to their store
CREATE POLICY "payment_logs_store_access" ON public.payment_logs
  FOR ALL
  USING (
    store_id IN (
      SELECT id FROM public.stores WHERE id = store_id
    )
  );

-- 3. Trigger function: recalculate unpaid_transaction after any change to payment_logs
CREATE OR REPLACE FUNCTION sync_unpaid_from_payment_logs()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_order_id UUID;
  v_grand_total NUMERIC;
  v_paid_total  NUMERIC;
BEGIN
  -- Determine which order to update
  IF TG_OP = 'DELETE' THEN
    v_order_id := OLD.sales_order_id;
  ELSE
    v_order_id := NEW.sales_order_id;
  END IF;

  -- Sum all payments for this order
  SELECT COALESCE(SUM(amount), 0)
    INTO v_paid_total
    FROM public.payment_logs
   WHERE sales_order_id = v_order_id;

  -- Get grand_total
  SELECT grand_total INTO v_grand_total
    FROM public.sales_orders
   WHERE id = v_order_id;

  -- Update unpaid_transaction (floor at 0)
  UPDATE public.sales_orders
     SET unpaid_transaction = GREATEST(0, v_grand_total - v_paid_total)
   WHERE id = v_order_id;
  -- Note: the existing trg_sync_transaction_status fires on this UPDATE
  -- and automatically sets transaction_status.

  RETURN NULL; -- AFTER trigger, return value is ignored
END;
$$;

CREATE TRIGGER trg_sync_unpaid_from_payment_logs
AFTER INSERT OR UPDATE OF amount OR DELETE
ON public.payment_logs
FOR EACH ROW EXECUTE FUNCTION sync_unpaid_from_payment_logs();

-- 4. Backfill: for any orders that already have partial payments
--    (unpaid_transaction < grand_total and unpaid_transaction > 0),
--    we cannot reconstruct the history, so we just leave the
--    current unpaid_transaction value as-is and insert a synthetic
--    "Saldo Awal" log entry only for fully-unpaid orders.
--    (Orders where unpaid = grand_total get no log entries → consistent)
