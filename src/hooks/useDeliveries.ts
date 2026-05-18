import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
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
  drivers?: { driver_name: string; phone_number: string | null } | null;
  delivery_items?: { id: string; sales_order_id: string; sales_item_id: string }[];
}

export interface DeliveryItemDetail {
  id: string;
  delivery_id: string;
  sales_order_id: string;
  sales_item_id: string;
  created_at: string;
  sales_orders: {
    invoice_number: string;
    customer_name: string | null;
    customer_address: string | null;
    sales_date: string;
  } | null;
  sales_items: {
    id: string;
    qty: number;
    price: number;
    subtotal: number;
    delivery_status: string;
    products: { name: string; product_code: string } | null;
  } | null;
}

export interface DeliveryDetail extends Omit<Delivery, "delivery_items"> {
  drivers: { driver_name: string; phone_number: string | null } | null;
  delivery_items: DeliveryItemDetail[];
}

export interface SalesOrderForDelivery {
  id: string;
  invoice_number: string;
  customer_name: string | null;
  customer_address: string | null;
  sales_date: string;
  delivery_status: string;
  sales_items: {
    id: string;
    qty: number;
    price: number;
    subtotal: number;
    delivery_status: string;
    products: { name: string; product_code: string } | null;
  }[];
}

// ── Filters ───────────────────────────────────────────────────────────────────

export interface DeliveryFilters {
  dateFrom?: string;
  dateTo?: string;
  driverId?: string;
  status?: string;
}

// ── Hooks ─────────────────────────────────────────────────────────────────────

export function useDeliveries(filters: DeliveryFilters = {}) {
  const { selectedStore } = useAuth();
  const { dateFrom, dateTo, driverId, status } = filters;

  return useQuery<Delivery[]>({
    queryKey: ["deliveries", selectedStore?.id, dateFrom, dateTo, driverId, status],
    queryFn: async () => {
      let query = supabase
        .from("deliveries")
        .select("*, drivers(driver_name, phone_number), delivery_items(id, sales_order_id, sales_item_id)")
        .order("delivery_date", { ascending: false })
        .order("created_at", { ascending: false });

      if (selectedStore?.id) query = query.eq("store_id", selectedStore.id);
      if (dateFrom) query = query.gte("delivery_date", dateFrom);
      if (dateTo) query = query.lte("delivery_date", dateTo);
      if (driverId) query = query.eq("driver_id", driverId);
      if (status) query = query.eq("delivery_status", status);

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as Delivery[];
    },
  });
}

export function useDeliveryDetail(id: string | null) {
  return useQuery<DeliveryDetail | null>({
    queryKey: ["delivery-detail", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deliveries")
        .select(`
          *,
          drivers(driver_name, phone_number),
          delivery_items(
            id,
            delivery_id,
            sales_order_id,
            sales_item_id,
            created_at,
            sales_orders(invoice_number, customer_name, customer_address, sales_date),
            sales_items(id, qty, price, subtotal, delivery_status, products(name, product_code))
          )
        `)
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data as unknown as DeliveryDetail;
    },
  });
}

export function useSalesOrdersForDelivery(search: string) {
  const { selectedStore } = useAuth();
  return useQuery<SalesOrderForDelivery[]>({
    queryKey: ["sales-orders-for-delivery", selectedStore?.id, search],
    queryFn: async () => {
      let query = supabase
        .from("sales_orders")
        .select(`
          id, invoice_number, customer_name, customer_address, sales_date, delivery_status,
          sales_items(id, qty, price, subtotal, delivery_status, products(name, product_code))
        `)
        .order("sales_date", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(50);

      if (selectedStore?.id) query = query.eq("store_id", selectedStore.id);
      if (search) {
        query = query.or(
          `invoice_number.ilike.%${search}%,customer_name.ilike.%${search}%`
        );
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as unknown as SalesOrderForDelivery[];
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
    mutationFn: async (params: CreateDeliveryParams) => {
      const { data, error } = await supabase.rpc("create_delivery", {
        p_delivery_date: params.p_delivery_date,
        p_driver_id:     params.p_driver_id ?? null,
        p_ritase_fee:    params.p_ritase_fee ?? 0,
        p_notes:         params.p_notes ?? null,
        p_store_id:      selectedStore?.id ?? null,
        p_items:         JSON.parse(JSON.stringify(params.p_items)),
      });
      if (error) throw error;
      return data as string;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deliveries"] });
      queryClient.invalidateQueries({ queryKey: ["sales-orders"] });
      queryClient.invalidateQueries({ queryKey: ["sales-orders-for-delivery"] });
    },
  });
}

// ── Update basic fields + items ───────────────────────────────────────────────

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
    mutationFn: async (params: UpdateDeliveryParams) => {
      const { id, delivery_date, driver_id, ritase_fee, notes, newItems } = params;

      // 1. Update basic fields
      const { error: updateErr } = await supabase
        .from("deliveries")
        .update({ delivery_date, driver_id: driver_id ?? null, ritase_fee: ritase_fee ?? 0, notes: notes ?? null })
        .eq("id", id);
      if (updateErr) throw updateErr;

      // 2. Fetch current delivery_items
      const { data: current, error: fetchErr } = await supabase
        .from("delivery_items")
        .select("id, sales_item_id")
        .eq("delivery_id", id);
      if (fetchErr) throw fetchErr;

      const currentMap = new Map((current ?? []).map((r) => [r.sales_item_id, r.id]));
      const newSet     = new Set(newItems.map((i) => i.sales_item_id));

      // 3. Delete removed items
      const toDelete = (current ?? [])
        .filter((r) => !newSet.has(r.sales_item_id))
        .map((r) => r.id);
      if (toDelete.length > 0) {
        const { error: delErr } = await supabase
          .from("delivery_items")
          .delete()
          .in("id", toDelete);
        if (delErr) throw delErr;
      }

      // 4. Insert new items
      const toInsert = newItems.filter((i) => !currentMap.has(i.sales_item_id));
      if (toInsert.length > 0) {
        const { error: insErr } = await supabase
          .from("delivery_items")
          .insert(toInsert.map((i) => ({ delivery_id: id, ...i })));
        if (insErr) throw insErr;
      }
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ["deliveries"] });
      queryClient.invalidateQueries({ queryKey: ["delivery-detail", vars.id] });
      queryClient.invalidateQueries({ queryKey: ["sales-orders"] });
      queryClient.invalidateQueries({ queryKey: ["sales-orders-for-delivery"] });
    },
  });
}

// ── Update status ─────────────────────────────────────────────────────────────

export function useUpdateDeliveryStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: DeliveryStatus }) => {
      const { error } = await supabase
        .from("deliveries")
        .update({ delivery_status: status })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ["deliveries"] });
      queryClient.invalidateQueries({ queryKey: ["delivery-detail", vars.id] });
      queryClient.invalidateQueries({ queryKey: ["sales-orders"] });
      queryClient.invalidateQueries({ queryKey: ["sales-orders-for-delivery"] });
      queryClient.invalidateQueries({ queryKey: ["sales-detail"] });
    },
  });
}

// ── Delete ────────────────────────────────────────────────────────────────────

export function useDeleteDelivery() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("deliveries").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deliveries"] });
      queryClient.invalidateQueries({ queryKey: ["sales-orders"] });
      queryClient.invalidateQueries({ queryKey: ["sales-orders-for-delivery"] });
      queryClient.invalidateQueries({ queryKey: ["sales-detail"] });
    },
  });
}
