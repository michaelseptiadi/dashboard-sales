import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import apiClient from "@/lib/apiClient";
import { useAuth } from "@/hooks/useAuth";

// useDashboardStats has been moved to useDashboard.ts — re-exported here for backward compatibility.
export { useDashboardStats } from "@/hooks/useDashboard";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface SalesOrder {
  id: string;
  invoice_number: string;
  sales_date: string;
  due_date?: string | null;
  store_id: string | null;
  customer_id: string | null;
  customer_name: string | null;
  customer_address: string | null;
  customer_phone: string | null;
  payment_method_id: string | null;
  payment_details?: string | null;
  delivery_types: string | null;
  driver_id: string | null;
  delivery_fee: number;
  notes: string | null;
  total_amount: number;
  total_discount: number;
  grand_total: number;
  unpaid_transaction: number;
  transaction_status: string;
  created_at: string;
  updated_at: string;
  payment_method?: { name: string } | null;
  customer?: { name: string; address: string | null } | null;
}

export interface SalesItem {
  id: string;
  sales_order_id: string;
  product_id: string;
  qty: number;
  price: number;
  discount: number;
  capital_price: number;
  subtotal: number;
  delivery_status: string;
  shipping_method?: string | null;
  product?: { name: string; product_code: string } | null;
}

export interface PaymentLog {
  id: string;
  sales_order_id: string;
  store_id: string | null;
  amount: number;
  notes: string | null;
  paid_at: string;
  created_by: string | null;
  payment_method_id?: string | null;
  delivery_id?: string | null;
}

// ── Filters ───────────────────────────────────────────────────────────────────

interface SalesOrderFilters {
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  customerName?: string;
  paymentMethodId?: string;
  deliveryType?: string;
  driverId?: string;
  transactionStatus?: "paid" | "unpaid";
  page?: number;
  pageSize?: number;
}

// ── Hooks ─────────────────────────────────────────────────────────────────────

export function useSalesOrders(filters: SalesOrderFilters = {}) {
  const { selectedStore } = useAuth();
  const storeId = selectedStore?.id;
  const {
    dateFrom, dateTo, search, customerName, paymentMethodId, deliveryType, driverId,
    transactionStatus, page = 1, pageSize = 10,
  } = filters;

  return useQuery({
    queryKey: ["sales-orders", storeId, dateFrom, dateTo, search, customerName, paymentMethodId, deliveryType, driverId, transactionStatus, page, pageSize],
    queryFn: () => {
      const p = new URLSearchParams();
      if (storeId) p.set("store_id", storeId);
      if (dateFrom) p.set("start_date", dateFrom);
      if (dateTo) p.set("end_date", dateTo);
      if (search) p.set("search", search);
      if (customerName) p.set("customer_name", customerName);
      if (paymentMethodId) p.set("payment_method_id", paymentMethodId);
      if (deliveryType) p.set("delivery_type", deliveryType);
      if (driverId) p.set("driver_id", driverId);
      if (transactionStatus) p.set("transaction_status", transactionStatus);
      p.set("page", String(page));
      p.set("page_size", String(pageSize));
      return apiClient.get<{ data: SalesOrder[]; total: number; page: number; pageSize: number }>(
        `/sales?${p.toString()}`,
      );
    },
  });
}

type BaseFilters = Omit<SalesOrderFilters, "transactionStatus" | "page" | "pageSize">;

/** Fetch paid + unpaid counts in parallel — used for tab badges. */
export function useSalesOrderStatusCounts(filters: BaseFilters = {}) {
  const { selectedStore } = useAuth();
  const storeId = selectedStore?.id;
  const { dateFrom, dateTo, search, customerName, paymentMethodId, deliveryType, driverId } = filters;

  return useQuery({
    queryKey: ["sales-order-counts", storeId, dateFrom, dateTo, search, customerName, paymentMethodId, deliveryType, driverId],
    queryFn: async () => {
      const base = new URLSearchParams();
      if (storeId) base.set("store_id", storeId);
      if (dateFrom) base.set("start_date", dateFrom);
      if (dateTo) base.set("end_date", dateTo);
      if (search) base.set("search", search);
      if (customerName) base.set("customer_name", customerName);
      if (paymentMethodId) base.set("payment_method_id", paymentMethodId);
      if (deliveryType) base.set("delivery_type", deliveryType);
      if (driverId) base.set("driver_id", driverId);
      base.set("page_size", "1");

      const paidParams = new URLSearchParams(base);
      paidParams.set("transaction_status", "paid");

      const unpaidParams = new URLSearchParams(base);
      unpaidParams.set("transaction_status", "unpaid");

      const [paidRes, unpaidRes] = await Promise.all([
        apiClient.get<{ total: number }>(`/sales?${paidParams.toString()}`),
        apiClient.get<{ total: number }>(`/sales?${unpaidParams.toString()}`),
      ]);
      return {
        allCount:    (paidRes.total ?? 0) + (unpaidRes.total ?? 0),
        paidCount:   paidRes.total ?? 0,
        unpaidCount: unpaidRes.total ?? 0,
      };
    },
  });
}

export function useSalesDetail(orderId: string | null) {
  return useQuery({
    queryKey: ["sales-detail", orderId],
    enabled: !!orderId,
    queryFn: () =>
      apiClient.get<SalesOrder & { items: SalesItem[]; payment_logs: PaymentLog[] }>(
        `/sales/${orderId}`,
      ),
  });
}

export function usePaymentMethods() {
  return useQuery({
    queryKey: ["payment-methods"],
    queryFn: () =>
      apiClient.get<{ id: string; name: string }[]>("/payments/methods"),
  });
}

export function useCreateSalesTransaction() {
  const { selectedStore } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: {
      p_invoice_number: string;
      p_sales_date: string;
      p_due_date?: string;
      p_customer_id?: string;
      p_customer_name?: string;
      p_customer_phone?: string;
      p_customer_address?: string;
      p_payment_method_id?: string;
      p_payment_details?: string;
      p_delivery_types?: "driver" | "self_delivery";
      p_driver_id?: string;
      p_notes?: string;
      p_delivery_fee?: number;
      p_items: Array<{ product_id: string; qty: number; price: number; discount: number; shipping_method?: string }>;
    }) =>
      apiClient.post<SalesOrder>("/sales", {
        invoice_number:    params.p_invoice_number,
        sales_date:        params.p_sales_date,
        due_date:          params.p_due_date,
        store_id:          selectedStore?.id,
        customer_id:       params.p_customer_id,
        customer_name:     params.p_customer_name,
        customer_phone:    params.p_customer_phone,
        customer_address:  params.p_customer_address,
        payment_method_id: params.p_payment_method_id,
        payment_details:    params.p_payment_details,
        delivery_types:    params.p_delivery_types,
        driver_id:         params.p_driver_id,
        notes:             params.p_notes,
        delivery_fee:      params.p_delivery_fee ?? 0,
        items:             params.p_items,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales-orders"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function usePaymentLogs(orderId: string | null) {
  return useQuery<PaymentLog[]>({
    queryKey: ["payment-logs", orderId],
    enabled: !!orderId,
    queryFn: () =>
      apiClient.get<PaymentLog[]>(`/payments/logs?sales_order_id=${orderId}`),
  });
}

export function useAddPaymentLog() {
  const queryClient = useQueryClient();
  const { selectedStore } = useAuth();
  return useMutation({
    mutationFn: ({
      orderId,
      amount,
      notes,
      paymentMethodId,
      deliveryId,
    }: {
      orderId: string;
      amount: number;
      notes?: string;
      paymentMethodId?: string;
      deliveryId?: string;
    }) =>
      apiClient.post<PaymentLog>("/payments/logs", {
        sales_order_id:    orderId,
        store_id:          selectedStore?.id ?? null,
        amount,
        notes:             notes ?? null,
        payment_method_id: paymentMethodId ?? null,
        delivery_id:       deliveryId ?? null,
      }),
    onSuccess: (_data, { orderId }) => {
      queryClient.invalidateQueries({ queryKey: ["payment-logs", orderId] });
      queryClient.invalidateQueries({ queryKey: ["sales-orders"] });
      queryClient.invalidateQueries({ queryKey: ["sales-detail", orderId] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

// TODO: useMarkSelfPickupItems and useUpdateItemDeliveryStatus require a
// PATCH /sales/:id/items/:itemId endpoint on the backend (not yet implemented).
export function useMarkSelfPickupItems() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (_params: { orderId: string; productIds: string[] }) => {
      // TODO: implement once backend exposes PATCH /sales/:id/items
      throw new Error("Not yet implemented in the backend API");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales-orders-for-delivery"] });
    },
  });
}

export function useUpdateItemDeliveryStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (_params: { itemId: string; status: "pending" | "self_pickup" }) => {
      // TODO: implement once backend exposes PATCH /sales/items/:id
      throw new Error("Not yet implemented in the backend API");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales-detail"] });
      queryClient.invalidateQueries({ queryKey: ["sales-orders-for-delivery"] });
    },
  });
}

/** @deprecated Use useAddPaymentLog instead. */
export function useUpdatePayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ orderId, unpaidAmount }: { orderId: string; unpaidAmount: number }) =>
      apiClient.put<SalesOrder>(`/sales/${orderId}`, { unpaid_transaction: Math.max(0, unpaidAmount) }),
    onSuccess: (_data, { orderId }) => {
      queryClient.invalidateQueries({ queryKey: ["sales-orders"] });
      queryClient.invalidateQueries({ queryKey: ["sales-detail", orderId] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}
