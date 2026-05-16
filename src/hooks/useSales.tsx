import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

// useDashboardStats has been moved to useDashboard.ts — re-exported here for backward compatibility.
export { useDashboardStats } from "@/hooks/useDashboard";

interface SalesOrderFilters {
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  customerName?: string;
  paymentMethodId?: string;
  deliveryType?: string;
  driverId?: string;
}

export function useSalesOrders(filters: SalesOrderFilters = {}) {
  const { selectedStore } = useAuth();
  const storeId = selectedStore?.id;
  const { dateFrom, dateTo, search, customerName, paymentMethodId, deliveryType, driverId } = filters;
  return useQuery({
    queryKey: ["sales-orders", storeId, dateFrom, dateTo, search, customerName, paymentMethodId, deliveryType, driverId],
    queryFn: async () => {
      let query = supabase
        .from("sales_orders")
        .select("*, payment_methods(name), customers(name)")
        .order("created_at", { ascending: false });

      if (storeId) query = query.eq("store_id", storeId);
      if (dateFrom) query = query.gte("sales_date", dateFrom);
      if (dateTo) query = query.lte("sales_date", dateTo);
      if (search) query = query.ilike("invoice_number", `%${search}%`);
      if (customerName) query = query.ilike("customer_name", `%${customerName}%`);
      if (paymentMethodId) query = query.eq("payment_method_id", paymentMethodId);
      if (deliveryType) query = query.eq("delivery_types", deliveryType);
      if (driverId) query = query.eq("driver_id", driverId);

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

export function useSalesDetail(orderId: string | null) {
  return useQuery({
    queryKey: ["sales-detail", orderId],
    enabled: !!orderId,
    queryFn: async () => {
      const { data: order, error: orderError } = await supabase
        .from("sales_orders")
        .select("*, payment_methods(name), customers(name)")
        .eq("id", orderId!)
        .maybeSingle();
      if (orderError) throw orderError;

      const { data: items, error: itemsError } = await supabase
        .from("sales_items")
        .select("*, products(name, product_code)")
        .eq("sales_order_id", orderId!);
      if (itemsError) throw itemsError;

      return { order, items };
    },
  });
}

export function usePaymentMethods() {
  return useQuery({
    queryKey: ["payment-methods"],
    queryFn: async () => {
      const { data, error } = await supabase.from("payment_methods").select("*").order("name");
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateSalesTransaction() {
  const { selectedStore } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      p_invoice_number: string;
      p_sales_date: string;
      p_customer_id?: string;
      p_customer_name?: string;
      p_customer_phone?: string;
      p_customer_address?: string;
      p_payment_method_id?: string;
      p_delivery_types?: "driver" | "self_delivery";
      p_driver_id?: string;
      p_notes?: string;
      p_delivery_fee?: number;
      p_items: Array<{
        product_id: string;
        qty: number;
        price: number;
        discount: number;
      }>;
    }) => {
      const { data, error } = await supabase.rpc("create_sales_transaction", {
        ...params,
        p_store_id: selectedStore?.id,
        p_items: JSON.parse(JSON.stringify(params.p_items)),
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales-orders"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}


