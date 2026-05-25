-- Add notes column to inventory_movements for manual adjustment context
ALTER TABLE public.inventory_movements
  ADD COLUMN notes TEXT;
