import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import apiClient from "@/lib/apiClient";
import { useAuth } from "@/hooks/useAuth";

// ── Types ─────────────────────────────────────────────────────────────────────

export type DeliveryStatus = "pending" | "in_progress" | "delivered" | "failed";

export interface Delivery {
  id: string;
  delivery_number: string;
  delivery_date: string;
  delivery_status: DeliveryStatus;
  driver_id: string | null;
  ritase_fee: number;
  notes: string | null;
  store_id: string | null;
  user_id: string;
  created_at: string;
  updated_at: string;
  driver?: { driver_name: string; phone_number: string | null } | null;
  items?: DeliveryItemDetail[];
}

export interface DeliveryItemDetail {
  id: string;
  delivery_id: string;
  sales_order_id: string;
  sales_item_id: string;
  created_at: string;
  sales_order: {
    invoice_number: string;
    customer_name: string | null;
    customer_address: string | null;
    sales_date: string;
  } | null;
  sales_item: {
    id: string;
    qty: number;
    price: number;
    subtotal: number;
    delivery_status: string;
    product: { name: string; product_code: string } | null;
  } | null;
}

export interface DeliveryDetail extends Omit<Delivery, "items"> {
  driver: { driver_name: string; phone_number: string | null } | null;
  items: DeliveryItemDetail[];
}

export interface SalesOrderForDelivery {
  id: string;
  invoice_number: string;
  customer_name: string | null;
  customer_address: string | null;
  sales_date: string;
  delivery_status: string;
  items: {
    id: string;
    qty: number;
    price: number;
    subtotal: number;
    delivery_status: string;
    product: { name: string; product_code: string } | null;
  }[];
}

// ── Filters ───────────────────────────────────────────────────────────────────

export interface DeliveryFilters {
  dateFrom?: string;
  dateTo?: string;
  driverId?: string;
  status?: string;
  customerSearch?: string;
}

// ── Hooks ─────────────────────────────────────────────────────────────────────

export function useDeliveries(filters: DeliveryFilters = {}) {
  const { selectedStore } = useAuth();
  const { dateFrom, dateTo, driverId, status } = filters;

  return useQuery<Delivery[]>({
    queryKey: ["deliveries", selectedStore?.id, dateFrom, dateTo, driverId, status],
    queryFn: () => {
      const p = new URLSearchParams();
      if (selectedStore?.id) p.set("store_id", selectedStore.id);
      if (dateFrom) p.set("date_from", dateFrom);
      if (dateTo) p.set("date_to", dateTo);
      if (driverId) p.set("driver_id", driverId);
      if (status) p.set("status", status);
      return apiClient.get<Delivery[]>(`/deliveries?${p.toString()}`);
    },
  });
}

export function useDeliveryDetail(id: string | null) {
  return useQuery<DeliveryDetail | null>({
    queryKey: ["delivery-detail", id],
    enabled: !!id,
    queryFn: () => apiClient.get<DeliveryDetail>(`/deliveries/${id}`),
  });
}

export function useSalesOrdersForDelivery(search: string) {
  const { selectedStore } = useAuth();
  return useQuery<SalesOrderForDelivery[]>({
    queryKey: ["sales-orders-for-delivery", selectedStore?.id, search],
    queryFn: () => {
      const p = new URLSearchParams();
      if (selectedStore?.id) p.set("store_id", selectedStore.id);
      if (search) p.set("search", search);
      p.set("page_size", "50");
      return apiClient
        .get<{ data: SalesOrderForDelivery[] }>(`/sales?${p.toString()}`)
        .then((res) => res.data);
    },
    enabled: true,
  });
}

// ── Create ────────────────────────────────────────────────────────────────────

interface CreateDeliveryParams {
  p_delivery_date: string;
  p_driver_id?: string | null;
  p_ritase_fee?: number;
  p_notes?: string | null;
  p_items: { sales_order_id: string; sales_item_id: string }[];
}

export function useCreateDelivery() {
  const { selectedStore } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: CreateDeliveryParams) =>
      apiClient.post<{ id: string }>("/deliveries", {
        delivery_number: `DLV-${Date.now()}`,
        delivery_date:   params.p_delivery_date,
        driver_id:       params.p_driver_id ?? null,
        ritase_fee:      params.p_ritase_fee ?? 0,
        notes:           params.p_notes ?? null,
        store_id:        selectedStore?.id ?? null,
        items:           params.p_items,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deliveries"] });
      queryClient.invalidateQueries({ queryKey: ["sales-orders"] });
      queryClient.invalidateQueries({ queryKey: ["sales-orders-for-delivery"] });
    },
  });
}

// ── Update ────────────────────────────────────────────────────────────────────

interface UpdateDeliveryParams {
  id: string;
  delivery_date: string;
  driver_id?: string | null;
  ritase_fee?: number;
  notes?: string | null;
  newItems: { sales_order_id: string; sales_item_id: string }[];
}

export function useUpdateDelivery() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, delivery_date: _dd, driver_id, ritase_fee, notes, newItems }: UpdateDeliveryParams) => {
      // 1. Update basic fields
      await apiClient.put(`/deliveries/${id}`, {
        driver_id: driver_id ?? null,
        ritase_fee: ritase_fee ?? 0,
        notes: notes ?? null,
      });
      // 2. Replace items via diff
      return apiClient.put(`/deliveries/${id}/items`, { items: newItems });
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ["deliveries"] });
      queryClient.invalidateQueries({ queryKey: ["delivery-detail", vars.id] });
      queryClient.invalidateQueries({ queryKey: ["sales-orders"] });
      queryClient.invalidateQueries({ queryKey: ["sales-orders-for-delivery"] });
    },
  });
}

export function useUpdateDeliveryStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: DeliveryStatus }) =>
      apiClient.put(`/deliveries/${id}`, { delivery_status: status }),
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ["deliveries"] });
      queryClient.invalidateQueries({ queryKey: ["delivery-detail", vars.id] });
      queryClient.invalidateQueries({ queryKey: ["sales-orders"] });
      queryClient.invalidateQueries({ queryKey: ["sales-orders-for-delivery"] });
      queryClient.invalidateQueries({ queryKey: ["sales-detail"] });
    },
  });
}

export function useDeleteDelivery() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/deliveries/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deliveries"] });
      queryClient.invalidateQueries({ queryKey: ["sales-orders"] });
      queryClient.invalidateQueries({ queryKey: ["sales-orders-for-delivery"] });
      queryClient.invalidateQueries({ queryKey: ["sales-detail"] });
    },
  });
}

