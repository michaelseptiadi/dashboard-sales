-- Fix: the sync_unpaid_from_payment_logs trigger function needs SECURITY DEFINER
-- so its internal UPDATE on sales_orders bypasses RLS (which would otherwise
-- block it because triggers run in the authenticated role's security context).

CREATE OR REPLACE FUNCTION sync_unpaid_from_payment_logs()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order_id    UUID;
  v_grand_total NUMERIC;
  v_paid_total  NUMERIC;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_order_id := OLD.sales_order_id;
  ELSE
    v_order_id := NEW.sales_order_id;
  END IF;

  SELECT COALESCE(SUM(amount), 0)
    INTO v_paid_total
    FROM public.payment_logs
   WHERE sales_order_id = v_order_id;

  SELECT grand_total INTO v_grand_total
    FROM public.sales_orders
   WHERE id = v_order_id;

  UPDATE public.sales_orders
     SET unpaid_transaction = GREATEST(0, v_grand_total - v_paid_total)
   WHERE id = v_order_id;
  -- trg_sync_transaction_status fires on this UPDATE and recalculates status.

  RETURN NULL;
END;
$$;
