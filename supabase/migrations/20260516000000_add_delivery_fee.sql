-- Add delivery_fee column to sales_orders
ALTER TABLE public.sales_orders
  ADD COLUMN IF NOT EXISTS delivery_fee NUMERIC NOT NULL DEFAULT 0;

-- Drop old version of the function to replace it
DROP FUNCTION IF EXISTS public.create_sales_transaction(
  TEXT, DATE, UUID, TEXT, TEXT, TEXT, UUID, delivery_types, UUID, UUID, TEXT, JSONB
);

-- Recreate with p_delivery_fee parameter; grand_total now includes delivery_fee
CREATE OR REPLACE FUNCTION public.create_sales_transaction(
  p_invoice_number     TEXT,
  p_sales_date         DATE,
  p_customer_id        UUID    DEFAULT NULL,
  p_customer_name      TEXT    DEFAULT NULL,
  p_customer_phone     TEXT    DEFAULT NULL,
  p_customer_address   TEXT    DEFAULT NULL,
  p_payment_method_id  UUID    DEFAULT NULL,
  p_delivery_types     delivery_types DEFAULT NULL,
  p_driver_id          UUID    DEFAULT NULL,
  p_store_id           UUID    DEFAULT NULL,
  p_notes              TEXT    DEFAULT NULL,
  p_delivery_fee       NUMERIC DEFAULT 0,
  p_items              JSONB   DEFAULT '[]'::JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order_id       UUID;
  v_total_amount   NUMERIC := 0;
  v_total_discount NUMERIC := 0;
  v_grand_total    NUMERIC := 0;
  v_item           JSONB;
  v_subtotal       NUMERIC;
  v_user_id        UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_subtotal       := (v_item->>'qty')::NUMERIC * (v_item->>'price')::NUMERIC
                        - COALESCE((v_item->>'discount')::NUMERIC, 0);
    v_total_amount   := v_total_amount   + ((v_item->>'qty')::NUMERIC * (v_item->>'price')::NUMERIC);
    v_total_discount := v_total_discount + COALESCE((v_item->>'discount')::NUMERIC, 0);
    v_grand_total    := v_grand_total    + v_subtotal;
  END LOOP;

  -- grand_total includes delivery fee
  v_grand_total := v_grand_total + COALESCE(p_delivery_fee, 0);

  INSERT INTO public.sales_orders (
    invoice_number, sales_date, customer_id, customer_name, customer_phone,
    customer_address, payment_method_id, delivery_types, driver_id, store_id,
    total_amount, total_discount, grand_total, delivery_fee, notes, user_id
  ) VALUES (
    p_invoice_number, p_sales_date, p_customer_id, p_customer_name, p_customer_phone,
    p_customer_address, p_payment_method_id, p_delivery_types, p_driver_id, p_store_id,
    v_total_amount, v_total_discount, v_grand_total, COALESCE(p_delivery_fee, 0), p_notes, v_user_id
  ) RETURNING id INTO v_order_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_subtotal := (v_item->>'qty')::NUMERIC * (v_item->>'price')::NUMERIC
                  - COALESCE((v_item->>'discount')::NUMERIC, 0);

    INSERT INTO public.sales_items (sales_order_id, product_id, qty, price, discount, subtotal)
    VALUES (
      v_order_id,
      (v_item->>'product_id')::UUID,
      (v_item->>'qty')::NUMERIC,
      (v_item->>'price')::NUMERIC,
      COALESCE((v_item->>'discount')::NUMERIC, 0),
      v_subtotal
    );

    INSERT INTO public.inventory_movements (product_id, movement_type, reference_id, qty_in, qty_out)
    VALUES (
      (v_item->>'product_id')::UUID,
      'sale',
      v_order_id,
      0,
      (v_item->>'qty')::NUMERIC
    );
  END LOOP;

  RETURN v_order_id;
END;
$$;
