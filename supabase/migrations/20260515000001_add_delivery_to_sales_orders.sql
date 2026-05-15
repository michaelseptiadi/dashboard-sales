-- Add delivery_type enum and driver_id to sales_orders
ALTER TABLE public.sales_orders
  ADD COLUMN IF NOT EXISTS delivery_type TEXT CHECK (delivery_type IN ('driver', 'self_delivery')),
  ADD COLUMN IF NOT EXISTS driver_id UUID REFERENCES public.drivers(id);
