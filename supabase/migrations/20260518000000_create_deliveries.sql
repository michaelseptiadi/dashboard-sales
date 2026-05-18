BEGIN;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Add per-item delivery tracking to sales_items
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.sales_items
  ADD COLUMN IF NOT EXISTS delivery_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (delivery_status IN ('pending', 'self_pickup', 'in_delivery', 'delivered'));

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Add order-level delivery status to sales_orders (derived from items)
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.sales_orders
  ADD COLUMN IF NOT EXISTS delivery_status TEXT NOT NULL DEFAULT 'none'
    CHECK (delivery_status IN ('none', 'in_progress', 'completed'));

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Create deliveries table (a delivery batch / ritase)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.deliveries (
  id              UUID    NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  delivery_number TEXT    NOT NULL UNIQUE,
  delivery_date   TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  delivery_status TEXT    NOT NULL DEFAULT 'pending'
    CHECK (delivery_status IN ('pending', 'in_progress', 'delivered', 'failed')),
  driver_id       UUID    REFERENCES public.drivers(id),
  ritase_fee      NUMERIC NOT NULL DEFAULT 0,
  notes           TEXT,
  store_id        UUID    REFERENCES public.stores(id),
  user_id         UUID    NOT NULL,
  created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Create delivery_items table (links a delivery to specific sales_items)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.delivery_items (
  id              UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  delivery_id     UUID NOT NULL REFERENCES public.deliveries(id) ON DELETE CASCADE,
  sales_order_id  UUID NOT NULL REFERENCES public.sales_orders(id),
  sales_item_id   UUID NOT NULL REFERENCES public.sales_items(id),
  created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (delivery_id, sales_item_id)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. RLS
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.deliveries     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "deliveries_select" ON public.deliveries
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "deliveries_insert" ON public.deliveries
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "deliveries_update" ON public.deliveries
  FOR UPDATE USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "deliveries_delete" ON public.deliveries
  FOR DELETE USING (auth.uid() IS NOT NULL);

CREATE POLICY "delivery_items_select" ON public.delivery_items
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "delivery_items_insert" ON public.delivery_items
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "delivery_items_update" ON public.delivery_items
  FOR UPDATE USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "delivery_items_delete" ON public.delivery_items
  FOR DELETE USING (auth.uid() IS NOT NULL);

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. Grants (required before RLS policies are evaluated by PostgREST)
-- ─────────────────────────────────────────────────────────────────────────────
GRANT SELECT, INSERT, UPDATE, DELETE ON public.deliveries     TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.delivery_items TO authenticated;
GRANT SELECT ON public.deliveries     TO anon;
GRANT SELECT ON public.delivery_items TO anon;

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. Indexes
-- ─────────────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_deliveries_date         ON public.deliveries(delivery_date);
CREATE INDEX IF NOT EXISTS idx_deliveries_driver       ON public.deliveries(driver_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_store        ON public.deliveries(store_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_status       ON public.deliveries(delivery_status);
CREATE INDEX IF NOT EXISTS idx_delivery_items_delivery ON public.delivery_items(delivery_id);
CREATE INDEX IF NOT EXISTS idx_delivery_items_order    ON public.delivery_items(sales_order_id);
CREATE INDEX IF NOT EXISTS idx_delivery_items_item     ON public.delivery_items(sales_item_id);
CREATE INDEX IF NOT EXISTS idx_sales_items_dlv_status  ON public.sales_items(delivery_status);

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. updated_at trigger for deliveries
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TRIGGER update_deliveries_updated_at
  BEFORE UPDATE ON public.deliveries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ─────────────────────────────────────────────────────────────────────────────
-- 8. Function: recompute sales_orders.delivery_status from its items
--    none        → all items are 'pending'
--    completed   → all items are 'delivered' or 'self_pickup'
--    in_progress → anything else
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.sync_order_delivery_status(p_order_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total      INT;
  v_pending    INT;
  v_done       INT;
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
    UPDATE public.sales_orders SET delivery_status = 'none'      WHERE id = p_order_id;
  ELSE
    UPDATE public.sales_orders SET delivery_status = 'in_progress' WHERE id = p_order_id;
  END IF;
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 9. Trigger: after sales_items.delivery_status changes → sync order status
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.trg_sales_items_delivery_status_fn()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM public.sync_order_delivery_status(NEW.sales_order_id);
  -- If order changed (shouldn't happen normally), sync old order too
  IF TG_OP = 'UPDATE' AND OLD.sales_order_id <> NEW.sales_order_id THEN
    PERFORM public.sync_order_delivery_status(OLD.sales_order_id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sales_items_delivery_status ON public.sales_items;
CREATE TRIGGER trg_sales_items_delivery_status
  AFTER INSERT OR UPDATE OF delivery_status ON public.sales_items
  FOR EACH ROW EXECUTE FUNCTION public.trg_sales_items_delivery_status_fn();

-- ─────────────────────────────────────────────────────────────────────────────
-- 10. Trigger: after delivery_items INSERT → mark sales_item as in_delivery
--     Prevents adding an item that is already in_delivery or delivered
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.trg_delivery_items_insert_fn()
RETURNS TRIGGER
LANGUAGE plpgsql
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

DROP TRIGGER IF EXISTS trg_delivery_items_after_insert ON public.delivery_items;
CREATE TRIGGER trg_delivery_items_after_insert
  AFTER INSERT ON public.delivery_items
  FOR EACH ROW EXECUTE FUNCTION public.trg_delivery_items_insert_fn();

-- ─────────────────────────────────────────────────────────────────────────────
-- 11. Trigger: after delivery_items DELETE → revert item to pending if no
--     other active delivery holds it
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.trg_delivery_items_delete_fn()
RETURNS TRIGGER
LANGUAGE plpgsql
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

DROP TRIGGER IF EXISTS trg_delivery_items_after_delete ON public.delivery_items;
CREATE TRIGGER trg_delivery_items_after_delete
  AFTER DELETE ON public.delivery_items
  FOR EACH ROW EXECUTE FUNCTION public.trg_delivery_items_delete_fn();

-- ─────────────────────────────────────────────────────────────────────────────
-- 12. Trigger: when deliveries.delivery_status changes → cascade to items
--     delivered → mark all linked items as delivered
--     failed    → revert in_delivery items back to pending
--     pending / in_progress → revert delivered items back to in_delivery
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.trg_delivery_status_change_fn()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.delivery_status = OLD.delivery_status THEN
    RETURN NEW;
  END IF;

  IF NEW.delivery_status = 'delivered' THEN
    -- Mark all items in this delivery as delivered
    UPDATE public.sales_items si
    SET delivery_status = 'delivered'
    FROM public.delivery_items di
    WHERE di.delivery_id = NEW.id AND di.sales_item_id = si.id;

  ELSIF NEW.delivery_status = 'failed' THEN
    -- Items that were in_delivery → revert to pending
    UPDATE public.sales_items si
    SET delivery_status = 'pending'
    FROM public.delivery_items di
    WHERE di.delivery_id = NEW.id AND di.sales_item_id = si.id
      AND si.delivery_status = 'in_delivery';

  ELSIF NEW.delivery_status IN ('pending', 'in_progress') THEN
    -- Undo a previously marked 'delivered' (admin correction)
    UPDATE public.sales_items si
    SET delivery_status = 'in_delivery'
    FROM public.delivery_items di
    WHERE di.delivery_id = NEW.id AND di.sales_item_id = si.id
      AND si.delivery_status = 'delivered';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_delivery_status_change ON public.deliveries;
CREATE TRIGGER trg_delivery_status_change
  AFTER UPDATE OF delivery_status ON public.deliveries
  FOR EACH ROW EXECUTE FUNCTION public.trg_delivery_status_change_fn();

-- ─────────────────────────────────────────────────────────────────────────────
-- 13. RPC: create_delivery
--     Auto-generates delivery_number (DLV-YYYYMMDD-NNN),
--     inserts into deliveries + delivery_items atomically.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.create_delivery(
  p_delivery_date  TIMESTAMP WITH TIME ZONE DEFAULT now(),
  p_driver_id      UUID                     DEFAULT NULL,
  p_ritase_fee     NUMERIC                  DEFAULT 0,
  p_notes          TEXT                     DEFAULT NULL,
  p_store_id       UUID                     DEFAULT NULL,
  p_items          JSONB                    DEFAULT '[]'::JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_delivery_id     UUID;
  v_delivery_number TEXT;
  v_seq             INT;
  v_item            JSONB;
BEGIN
  -- Generate a unique delivery number for the given date
  SELECT COALESCE(
    MAX(CAST(SPLIT_PART(delivery_number, '-', 3) AS INTEGER)), 0
  ) + 1
  INTO v_seq
  FROM public.deliveries
  WHERE delivery_number LIKE 'DLV-' || TO_CHAR(p_delivery_date AT TIME ZONE 'Asia/Jakarta', 'YYYYMMDD') || '-%';

  v_delivery_number := 'DLV-'
    || TO_CHAR(p_delivery_date AT TIME ZONE 'Asia/Jakarta', 'YYYYMMDD')
    || '-'
    || LPAD(v_seq::TEXT, 3, '0');

  INSERT INTO public.deliveries (
    delivery_number, delivery_date, driver_id, ritase_fee, notes, store_id, user_id
  ) VALUES (
    v_delivery_number, p_delivery_date, p_driver_id, p_ritase_fee, p_notes, p_store_id, auth.uid()
  ) RETURNING id INTO v_delivery_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    INSERT INTO public.delivery_items (delivery_id, sales_order_id, sales_item_id)
    VALUES (
      v_delivery_id,
      (v_item->>'sales_order_id')::UUID,
      (v_item->>'sales_item_id')::UUID
    );
  END LOOP;

  RETURN v_delivery_id;
END;
$$;

COMMIT;

