BEGIN;

-- Recreate all delivery trigger functions with SECURITY DEFINER so they run
-- with the function owner's (postgres) privileges instead of the calling
-- authenticated role. This lets them bypass RLS when writing back to
-- sales_items / sales_orders, which the authenticated role cannot do freely
-- inside a trigger context.

-- ── 1. delivery_items INSERT → mark sales_item as in_delivery ────────────────
CREATE OR REPLACE FUNCTION public.trg_delivery_items_insert_fn()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status TEXT;
BEGIN
  SELECT delivery_status INTO v_status FROM public.sales_items WHERE id = NEW.sales_item_id;

  IF v_status = 'delivered' THEN
    RAISE EXCEPTION 'Item sudah terkirim dan tidak dapat ditambahkan ke pengiriman baru';
  END IF;

  IF v_status = 'in_delivery' THEN
    RAISE EXCEPTION 'Item sudah ada di pengiriman lain yang sedang berjalan';
  END IF;

  UPDATE public.sales_items
  SET delivery_status = 'in_delivery'
  WHERE id = NEW.sales_item_id;

  RETURN NEW;
END;
$$;

-- ── 2. delivery_items DELETE → revert item to pending if no other delivery ────
CREATE OR REPLACE FUNCTION public.trg_delivery_items_delete_fn()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_other INT;
BEGIN
  SELECT COUNT(*) INTO v_other
  FROM public.delivery_items
  WHERE sales_item_id = OLD.sales_item_id
    AND delivery_id  <> OLD.delivery_id;

  IF v_other = 0 THEN
    UPDATE public.sales_items
    SET delivery_status = 'pending'
    WHERE id = OLD.sales_item_id AND delivery_status = 'in_delivery';
  END IF;

  RETURN OLD;
END;
$$;

-- ── 3. deliveries status change → cascade to sales_items ─────────────────────
CREATE OR REPLACE FUNCTION public.trg_delivery_status_change_fn()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.delivery_status = OLD.delivery_status THEN
    RETURN NEW;
  END IF;

  IF NEW.delivery_status = 'delivered' THEN
    UPDATE public.sales_items si
    SET delivery_status = 'delivered'
    FROM public.delivery_items di
    WHERE di.delivery_id = NEW.id AND di.sales_item_id = si.id;

  ELSIF NEW.delivery_status = 'failed' THEN
    UPDATE public.sales_items si
    SET delivery_status = 'pending'
    FROM public.delivery_items di
    WHERE di.delivery_id = NEW.id AND di.sales_item_id = si.id
      AND si.delivery_status = 'in_delivery';

  ELSIF NEW.delivery_status IN ('pending', 'in_progress') THEN
    -- Admin correction: undo a previously delivered status
    UPDATE public.sales_items si
    SET delivery_status = 'in_delivery'
    FROM public.delivery_items di
    WHERE di.delivery_id = NEW.id AND di.sales_item_id = si.id
      AND si.delivery_status = 'delivered';
  END IF;

  RETURN NEW;
END;
$$;

-- ── 4. sales_items delivery_status change → recompute sales_orders status ─────
CREATE OR REPLACE FUNCTION public.trg_sales_items_delivery_status_fn()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.sync_order_delivery_status(NEW.sales_order_id);
  IF TG_OP = 'UPDATE' AND OLD.sales_order_id <> NEW.sales_order_id THEN
    PERFORM public.sync_order_delivery_status(OLD.sales_order_id);
  END IF;
  RETURN NEW;
END;
$$;

-- ── 5. sync_order_delivery_status also needs SECURITY DEFINER ────────────────
CREATE OR REPLACE FUNCTION public.sync_order_delivery_status(p_order_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total   INT;
  v_pending INT;
  v_done    INT;
BEGIN
  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE delivery_status = 'pending'),
    COUNT(*) FILTER (WHERE delivery_status IN ('delivered', 'self_pickup'))
  INTO v_total, v_pending, v_done
  FROM public.sales_items
  WHERE sales_order_id = p_order_id;

  IF v_total = 0 THEN RETURN; END IF;

  IF v_done = v_total THEN
    UPDATE public.sales_orders SET delivery_status = 'completed' WHERE id = p_order_id;
  ELSIF v_pending = v_total THEN
    UPDATE public.sales_orders SET delivery_status = 'none'        WHERE id = p_order_id;
  ELSE
    UPDATE public.sales_orders SET delivery_status = 'in_progress' WHERE id = p_order_id;
  END IF;
END;
$$;

COMMIT;
