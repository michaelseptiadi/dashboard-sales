BEGIN;

-- Change delivery_date from DATE to TIMESTAMPTZ so time can be recorded
ALTER TABLE public.deliveries
  ALTER COLUMN delivery_date TYPE TIMESTAMP WITH TIME ZONE
  USING delivery_date::TIMESTAMP WITH TIME ZONE;

ALTER TABLE public.deliveries
  ALTER COLUMN delivery_date SET DEFAULT now();

-- Recreate create_delivery with TIMESTAMPTZ parameter and sort by time
DROP FUNCTION IF EXISTS public.create_delivery(DATE, UUID, NUMERIC, TEXT, UUID, JSONB);

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
  -- Generate delivery_number based on the date portion only (DLV-YYYYMMDD-NNN)
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
