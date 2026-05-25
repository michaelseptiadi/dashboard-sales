-- After delivery_items_type enum was introduced, trigger functions that assign
-- text literals to delivery_status need explicit casts. Recreate them here.

BEGIN;

-- ── 1. delivery_items INSERT → mark sales_item as in_delivery ────────────────
CREATE OR REPLACE FUNCTION public.trg_delivery_items_insert_fn()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status public.delivery_items_type;
BEGIN
  SELECT delivery_status INTO v_status FROM public.sales_items WHERE id = NEW.sales_item_id;

  IF v_status = 'delivered'::public.delivery_items_type THEN
    RAISE EXCEPTION 'Item sudah terkirim dan tidak dapat ditambahkan ke pengiriman baru';
  END IF;

  IF v_status = 'in_delivery'::public.delivery_items_type THEN
    RAISE EXCEPTION 'Item sudah ada di pengiriman lain yang sedang berjalan';
  END IF;

  UPDATE public.sales_items
  SET delivery_status = 'in_delivery'::public.delivery_items_type
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
    SET delivery_status = 'pending'::public.delivery_items_type
    WHERE id = OLD.sales_item_id
      AND delivery_status = 'in_delivery'::public.delivery_items_type;
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
    SET delivery_status = 'delivered'::public.delivery_items_type
    FROM public.delivery_items di
    WHERE di.delivery_id = NEW.id AND di.sales_item_id = si.id;

  ELSIF NEW.delivery_status = 'failed' THEN
    UPDATE public.sales_items si
    SET delivery_status = 'pending'::public.delivery_items_type
    FROM public.delivery_items di
    WHERE di.delivery_id = NEW.id AND di.sales_item_id = si.id
      AND si.delivery_status = 'in_delivery'::public.delivery_items_type;

  ELSIF NEW.delivery_status IN ('pending', 'in_progress') THEN
    UPDATE public.sales_items si
    SET delivery_status = 'in_delivery'::public.delivery_items_type
    FROM public.delivery_items di
    WHERE di.delivery_id = NEW.id AND di.sales_item_id = si.id
      AND si.delivery_status = 'delivered'::public.delivery_items_type;
  END IF;

  RETURN NEW;
END;
$$;

-- ── 4. sync_order_delivery_status ─────────────────────────────────────────────
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
    COUNT(*) FILTER (WHERE delivery_status = 'pending'::public.delivery_items_type),
    COUNT(*) FILTER (WHERE delivery_status IN (
      'delivered'::public.delivery_items_type,
      'self_pickup'::public.delivery_items_type
    ))
  INTO v_total, v_pending, v_done
  FROM public.sales_items
  WHERE sales_order_id = p_order_id;

  IF v_total = 0 THEN RETURN; END IF;

  IF v_done = v_total THEN
    UPDATE public.sales_orders SET delivery_status = 'completed'   WHERE id = p_order_id;
  ELSIF v_pending = v_total THEN
    UPDATE public.sales_orders SET delivery_status = 'none'        WHERE id = p_order_id;
  ELSE
    UPDATE public.sales_orders SET delivery_status = 'in_progress' WHERE id = p_order_id;
  END IF;
END;
$$;

-- ── 5. trg_sales_items_delivery_status_fn (no cast needed, but refresh plan) ──
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

COMMIT;
