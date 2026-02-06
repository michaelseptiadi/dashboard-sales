
-- 1. Create categories table
CREATE TABLE public.categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 2. Create units table
CREATE TABLE public.units (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 3. Create payment_methods table
CREATE TABLE public.payment_methods (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 4. Create products table
CREATE TABLE public.products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  category_id UUID REFERENCES public.categories(id),
  unit_id UUID REFERENCES public.units(id),
  selling_price NUMERIC NOT NULL DEFAULT 0,
  capital_price NUMERIC NOT NULL DEFAULT 0,
  minimum_stock INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 5. Create customers table
CREATE TABLE public.customers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  email TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 6. Create sales_orders table
CREATE TABLE public.sales_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_number TEXT NOT NULL UNIQUE,
  sales_date DATE NOT NULL DEFAULT CURRENT_DATE,
  customer_id UUID REFERENCES public.customers(id),
  customer_name TEXT,
  customer_phone TEXT,
  customer_address TEXT,
  payment_method_id UUID REFERENCES public.payment_methods(id),
  shipping_method TEXT,
  sales_channel TEXT,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  total_discount NUMERIC NOT NULL DEFAULT 0,
  grand_total NUMERIC NOT NULL DEFAULT 0,
  notes TEXT,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 7. Create sales_items table
CREATE TABLE public.sales_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sales_order_id UUID NOT NULL REFERENCES public.sales_orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id),
  qty NUMERIC NOT NULL DEFAULT 1,
  price NUMERIC NOT NULL DEFAULT 0,
  discount NUMERIC NOT NULL DEFAULT 0,
  subtotal NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 8. Create inventory_movements table
CREATE TABLE public.inventory_movements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id),
  movement_type TEXT NOT NULL,
  reference_id UUID,
  qty_in NUMERIC NOT NULL DEFAULT 0,
  qty_out NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;

-- RLS Policies: All authenticated users can read reference tables
CREATE POLICY "Authenticated users can read categories" ON public.categories FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can manage categories" ON public.categories FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can read units" ON public.units FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can manage units" ON public.units FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can read payment_methods" ON public.payment_methods FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can manage payment_methods" ON public.payment_methods FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can read products" ON public.products FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can manage products" ON public.products FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can read customers" ON public.customers FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can manage customers" ON public.customers FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can read their own sales_orders" ON public.sales_orders FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Users can create sales_orders" ON public.sales_orders FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own sales_orders" ON public.sales_orders FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Authenticated users can read sales_items" ON public.sales_items FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can manage sales_items" ON public.sales_items FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can read inventory_movements" ON public.inventory_movements FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can manage inventory_movements" ON public.inventory_movements FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Create indexes for performance
CREATE INDEX idx_products_category ON public.products(category_id);
CREATE INDEX idx_products_code ON public.products(product_code);
CREATE INDEX idx_sales_orders_date ON public.sales_orders(sales_date);
CREATE INDEX idx_sales_orders_invoice ON public.sales_orders(invoice_number);
CREATE INDEX idx_sales_items_order ON public.sales_items(sales_order_id);
CREATE INDEX idx_inventory_movements_product ON public.inventory_movements(product_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON public.customers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create RPC function for atomic sales transaction
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
    total_amount, total_discount, grand_total, notes, user_id
  ) VALUES (
    p_invoice_number, p_sales_date, p_customer_id, p_customer_name, p_customer_phone,
    p_customer_address, p_payment_method_id, p_shipping_method, p_sales_channel,
    v_total_amount, v_total_discount, v_grand_total, p_notes, v_user_id
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

-- Seed data for categories
INSERT INTO public.categories (name) VALUES
  ('Semen'),
  ('Besi & Baja'),
  ('Pasir & Batu'),
  ('Cat & Finishing'),
  ('Kayu & Triplek'),
  ('Pipa & Sanitasi'),
  ('Keramik & Granit'),
  ('Atap & Genteng'),
  ('Listrik'),
  ('Alat & Perkakas');

-- Seed data for units
INSERT INTO public.units (name) VALUES
  ('Pcs'),
  ('Kg'),
  ('Sak'),
  ('Meter'),
  ('Lembar'),
  ('Batang'),
  ('Roll'),
  ('Liter'),
  ('Set'),
  ('Dus');

-- Seed data for payment methods
INSERT INTO public.payment_methods (name) VALUES
  ('Tunai'),
  ('Transfer Bank'),
  ('QRIS'),
  ('Kredit'),
  ('Debit');
