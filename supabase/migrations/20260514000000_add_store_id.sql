-- Add store_id to relevant tables
ALTER TABLE public.sales_orders
  ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES public.stores(id);

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES public.stores(id);

ALTER TABLE public.inventory_movements
  ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES public.stores(id);

ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES public.stores(id);

-- Indexes for store_id lookups
CREATE INDEX IF NOT EXISTS idx_sales_orders_store ON public.sales_orders(store_id);
CREATE INDEX IF NOT EXISTS idx_products_store ON public.products(store_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_store ON public.inventory_movements(store_id);
CREATE INDEX IF NOT EXISTS idx_customers_store ON public.customers(store_id);

-- Replace function to accept and persist p_store_id
CREATE OR REPLACE FUNCTION public.create_sales_transaction(
  p_invoice_number TEXT,
  p_sales_date DATE,
  p_customer_id UUID DEFAULT NULL,
  p_customer_name TEXT DEFAULT NULL,
  p_customer_phone TEXT DEFAULT NULL,
  p_customer_address TEXT DEFAULT NULL,
  p_payment_method_id UUID DEFAULT NULL,
  p_shipping_method TEXT DEFAULT NULL,
  p_sales_channel TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_items JSONB DEFAULT '[]'::JSONB,
  p_store_id UUID DEFAULT NULL
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
  -- Get the authenticated user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;

  -- Calculate totals from items
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_subtotal := (v_item->>'qty')::NUMERIC * (v_item->>'price')::NUMERIC - COALESCE((v_item->>'discount')::NUMERIC, 0);
    v_total_amount := v_total_amount + ((v_item->>'qty')::NUMERIC * (v_item->>'price')::NUMERIC);
    v_total_discount := v_total_discount + COALESCE((v_item->>'discount')::NUMERIC, 0);
    v_grand_total := v_grand_total + v_subtotal;
  END LOOP;

  -- Create sales order
  INSERT INTO public.sales_orders (
    invoice_number, sales_date, customer_id, customer_name, customer_phone,
    customer_address, payment_method_id, shipping_method, sales_channel,
    total_amount, total_discount, grand_total, notes, user_id, store_id
  ) VALUES (
    p_invoice_number, p_sales_date, p_customer_id, p_customer_name, p_customer_phone,
    p_customer_address, p_payment_method_id, p_shipping_method, p_sales_channel,
    v_total_amount, v_total_discount, v_grand_total, p_notes, v_user_id, p_store_id
  ) RETURNING id INTO v_order_id;

  -- Create sales items and inventory movements
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

    -- Create inventory movement (stock out)
    INSERT INTO public.inventory_movements (product_id, movement_type, reference_id, qty_in, qty_out, store_id)
    VALUES (
      (v_item->>'product_id')::UUID,
      'sale',
      v_order_id,
      0,
      (v_item->>'qty')::NUMERIC,
      p_store_id
    );
  END LOOP;

  RETURN v_order_id;
END;
$$;
