-- Fix column name: rename delivery_type -> delivery_types to match types.ts
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'sales_orders' AND column_name = 'delivery_type'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'sales_orders' AND column_name = 'delivery_types'
  ) THEN
    ALTER TABLE public.sales_orders RENAME COLUMN delivery_type TO delivery_types;
  END IF;

  -- Add delivery_types if neither column exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'sales_orders' AND column_name = 'delivery_types'
  ) THEN
    ALTER TABLE public.sales_orders
      ADD COLUMN delivery_types delivery_types;
  END IF;

  -- Add driver_id if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'sales_orders' AND column_name = 'driver_id'
  ) THEN
    ALTER TABLE public.sales_orders
      ADD COLUMN driver_id UUID REFERENCES public.drivers(id);
  END IF;
END $$;

-- Drop old overloaded version with TEXT parameter to avoid ambiguity
DROP FUNCTION IF EXISTS public.create_sales_transaction(
  TEXT, DATE, UUID, TEXT, TEXT, TEXT, UUID, TEXT, UUID, UUID, TEXT, JSONB
);

-- Replace the function with updated signature
CREATE OR REPLACE FUNCTION public.create_sales_transaction(
  p_invoice_number TEXT,
  p_sales_date DATE,
  p_customer_id UUID DEFAULT NULL,
  p_customer_name TEXT DEFAULT NULL,
  p_customer_phone TEXT DEFAULT NULL,
  p_customer_address TEXT DEFAULT NULL,
  p_payment_method_id UUID DEFAULT NULL,
  p_delivery_types delivery_types DEFAULT NULL,
  p_driver_id UUID DEFAULT NULL,
  p_store_id UUID DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_items JSONB DEFAULT '[]'::JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order_id UUID;
  v_total_amount NUMERIC := 0;
  v_total_discount NUMERIC := 0;
  v_grand_total NUMERIC := 0;
  v_item JSONB;
  v_subtotal NUMERIC;
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_subtotal := (v_item->>'qty')::NUMERIC * (v_item->>'price')::NUMERIC - COALESCE((v_item->>'discount')::NUMERIC, 0);
    v_total_amount := v_total_amount + ((v_item->>'qty')::NUMERIC * (v_item->>'price')::NUMERIC);
    v_total_discount := v_total_discount + COALESCE((v_item->>'discount')::NUMERIC, 0);
    v_grand_total := v_grand_total + v_subtotal;
  END LOOP;

  INSERT INTO public.sales_orders (
    invoice_number, sales_date, customer_id, customer_name, customer_phone,
    customer_address, payment_method_id, delivery_types, driver_id, store_id,
    total_amount, total_discount, grand_total, notes, user_id
  ) VALUES (
    p_invoice_number, p_sales_date, p_customer_id, p_customer_name, p_customer_phone,
    p_customer_address, p_payment_method_id, p_delivery_types, p_driver_id, p_store_id,
    v_total_amount, v_total_discount, v_grand_total, p_notes, v_user_id
  ) RETURNING id INTO v_order_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_subtotal := (v_item->>'qty')::NUMERIC * (v_item->>'price')::NUMERIC - COALESCE((v_item->>'discount')::NUMERIC, 0);

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
