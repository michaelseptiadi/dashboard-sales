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
  /** "paid" | "unpaid" (unpaid covers both unpaid + half_payment) | undefined = all */
  transactionStatus?: "paid" | "unpaid";
  page?: number;
  pageSize?: number;
}

export function useSalesOrders(filters: SalesOrderFilters = {}) {
  const { selectedStore } = useAuth();
  const storeId = selectedStore?.id;
  const {
    dateFrom, dateTo, search, customerName, paymentMethodId, deliveryType, driverId,
    transactionStatus, page = 1, pageSize = 10,
  } = filters;
  return useQuery({
    queryKey: ["sales-orders", storeId, dateFrom, dateTo, search, customerName, paymentMethodId, deliveryType, driverId, transactionStatus, page, pageSize],
    queryFn: async () => {
      const from = (page - 1) * pageSize;
      const to   = from + pageSize - 1;

      let query = supabase
        .from("sales_orders")
        .select("*, payment_methods(name), customers(name)")
        .order("created_at", { ascending: false })
        .range(from, to);

      if (storeId) query = query.eq("store_id", storeId);
      if (dateFrom) query = query.gte("sales_date", dateFrom);
      if (dateTo) query = query.lte("sales_date", dateTo);
      if (search) query = query.ilike("invoice_number", `%${search}%`);
      if (customerName) query = query.ilike("customer_name", `%${customerName}%`);
      if (paymentMethodId) query = query.eq("payment_method_id", paymentMethodId);
      if (deliveryType) query = query.eq("delivery_types", deliveryType);
      if (driverId) query = query.eq("driver_id", driverId);
      if (transactionStatus === "paid") query = query.eq("transaction_status", "paid");
      if (transactionStatus === "unpaid") query = query.neq("transaction_status", "paid");

      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
  });
}

type BaseFilters = Omit<SalesOrderFilters, "transactionStatus" | "page" | "pageSize">;

/** Two HEAD-only count queries (no data transferred) — used for tab badges. */
export function useSalesOrderStatusCounts(filters: BaseFilters = {}) {
  const { selectedStore } = useAuth();
  const storeId = selectedStore?.id;
  const { dateFrom, dateTo, search, customerName, paymentMethodId, deliveryType, driverId } = filters;

  return useQuery({
    queryKey: ["sales-order-counts", storeId, dateFrom, dateTo, search, customerName, paymentMethodId, deliveryType, driverId],
    queryFn: async () => {
      const applyBase = (q: ReturnType<typeof supabase.from>) => {
        if (storeId) q = (q as any).eq("store_id", storeId);
        if (dateFrom) q = (q as any).gte("sales_date", dateFrom);
        if (dateTo) q = (q as any).lte("sales_date", dateTo);
        if (search) q = (q as any).ilike("invoice_number", `%${search}%`);
        if (customerName) q = (q as any).ilike("customer_name", `%${customerName}%`);
        if (paymentMethodId) q = (q as any).eq("payment_method_id", paymentMethodId);
        if (deliveryType) q = (q as any).eq("delivery_types", deliveryType);
        if (driverId) q = (q as any).eq("driver_id", driverId);
        return q;
      };
      const [paidRes, unpaidRes] = await Promise.all([
        applyBase(supabase.from("sales_orders").select("*", { count: "exact", head: true })).eq("transaction_status", "paid"),
        applyBase(supabase.from("sales_orders").select("*", { count: "exact", head: true })).neq("transaction_status", "paid"),
      ]);
      return {
        allCount:    (paidRes.count ?? 0) + (unpaidRes.count ?? 0),
        paidCount:   paidRes.count ?? 0,
        unpaidCount: unpaidRes.count ?? 0,
      };
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
        .select("*, products(name, product_code), delivery_status")
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

/**
/**
 * Fetch all payment log entries for a given sales order.
 */
export function usePaymentLogs(orderId: string | null) {
  return useQuery({
    queryKey: ["payment-logs", orderId],
    enabled: !!orderId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payment_logs")
        .select("*")
        .eq("sales_order_id", orderId!)
        .order("paid_at", { ascending: true });
      if (error) throw error;
      return data;
    },
  });
}

/**
 * Record a payment for a sales order.
 * Inserts a row into payment_logs; the DB trigger automatically
 * recalculates unpaid_transaction and transaction_status on sales_orders.
 */
export function useAddPaymentLog() {
  const queryClient = useQueryClient();
  const { selectedStore } = useAuth();
  return useMutation({
    mutationFn: async ({
      orderId,
      amount,
      notes,
    }: {
      orderId: string;
      amount: number;
      notes?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("payment_logs")
        .insert({
          sales_order_id: orderId,
          store_id: selectedStore?.id ?? null,
          amount,
          notes: notes || null,
          created_by: user?.id ?? null,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_data, { orderId }) => {
      queryClient.invalidateQueries({ queryKey: ["payment-logs", orderId] });
      queryClient.invalidateQueries({ queryKey: ["sales-orders"] });
      queryClient.invalidateQueries({ queryKey: ["sales-detail", orderId] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

/**
 * @deprecated Use useAddPaymentLog instead.
 * Kept for backward compatibility — delegates to a direct update.
 */
export function useUpdatePayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ orderId, unpaidAmount }: { orderId: string; unpaidAmount: number }) => {
      const { data, error } = await supabase
        .from("sales_orders")
        .update({ unpaid_transaction: Math.max(0, unpaidAmount) })
        .eq("id", orderId)
        .select("id, unpaid_transaction, transaction_status")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_data, { orderId }) => {
      queryClient.invalidateQueries({ queryKey: ["sales-orders"] });
      queryClient.invalidateQueries({ queryKey: ["sales-detail", orderId] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}
