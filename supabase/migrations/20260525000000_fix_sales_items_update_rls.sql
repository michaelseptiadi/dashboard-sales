-- Allow authenticated users to update sales_items rows (needed for delivery_status changes)
CREATE POLICY "Authenticated users can update sales_items"
  ON public.sales_items
  FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');
