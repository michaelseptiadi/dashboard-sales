export interface SalesItem {
  product_id: string;
  product_name: string;
  product_code: string;
  qty: number;
  price: number;
  discount: number;
  subtotal: number;
  self_pickup?: boolean;
}
