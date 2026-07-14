export interface SalesItem {
  product_id: string;
  product_name: string;
  product_code: string;
  qty: number;
  price: number;
  discount: number;
  subtotal: number;
  self_pickup?: boolean;
  product_unit_id?: string | null;
  product_unit_name?: string | null;
  product_units?: import("@/hooks/useProducts").ProductUnit[] | null;
  product_variant_id?: string | null;
  product_variant_name?: string | null;
  product_variants?: import("@/hooks/useProducts").ProductVariant[] | null;
}
