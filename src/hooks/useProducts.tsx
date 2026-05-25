import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";
import { useAuth } from "@/hooks/useAuth";

export type Product = Tables<"products"> & {
  categories?: { name: string } | null;
  units?: { name: string } | null;
  current_stock?: number;
};

export function useProducts(search?: string, categoryId?: string) {
  const { selectedStore } = useAuth();
  const storeId = selectedStore?.id;
  return useQuery({
    queryKey: ["products", storeId, search, categoryId],
    queryFn: async () => {
      let query = supabase
        .from("products")
        .select("*, categories(name), units(name)")
        .order("name");

      if (storeId) {
        query = query.eq("store_id", storeId);
      }
      if (search) {
        query = query.or(`name.ilike.%${search}%,product_code.ilike.%${search}%`);
      }
      if (categoryId) {
        query = query.eq("category_id", categoryId);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Fetch stock for all products
      let stockQuery = supabase
        .from("inventory_movements")
        .select("product_id, qty_in, qty_out");
      if (storeId) {
        stockQuery = stockQuery.eq("store_id", storeId);
      }
      const { data: stockData, error: stockError } = await stockQuery;
      if (stockError) throw stockError;

      const stockMap: Record<string, number> = {};
      stockData?.forEach((m) => {
        if (!stockMap[m.product_id]) stockMap[m.product_id] = 0;
        stockMap[m.product_id] += (m.qty_in || 0) - (m.qty_out || 0);
      });

      return (data || []).map((p) => ({
        ...p,
        current_stock: stockMap[p.id] || 0,
      })) as Product[];
    },
  });
}

export function useActiveProducts(search?: string) {
  const { selectedStore } = useAuth();
  const storeId = selectedStore?.id;
  return useQuery({
    queryKey: ["active-products", storeId, search],
    queryFn: async () => {
      let query = supabase
        .from("products")
        .select("*, categories(name), units(name)")
        .eq("is_active", true)
        .order("name");

      if (storeId) {
        query = query.eq("store_id", storeId);
      }
      if (search) {
        query = query.or(`name.ilike.%${search}%,product_code.ilike.%${search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Product[];
    },
  });
}

export function useLowStockProducts() {
  const { selectedStore } = useAuth();
  const storeId = selectedStore?.id;
  return useQuery({
    queryKey: ["low-stock-products", storeId],
    queryFn: async () => {
      let query = supabase
        .from("products")
        .select("id, name, product_code, minimum_stock")
        .eq("is_active", true)
        .gt("minimum_stock", 0);
      if (storeId) query = query.eq("store_id", storeId);
      const { data, error } = await query;
      if (error) throw error;

      let stockQuery = supabase
        .from("inventory_movements")
        .select("product_id, qty_in, qty_out");
      if (storeId) stockQuery = stockQuery.eq("store_id", storeId);
      const { data: stockData, error: stockError } = await stockQuery;
      if (stockError) throw stockError;

      const stockMap: Record<string, number> = {};
      stockData?.forEach((m) => {
        if (!stockMap[m.product_id]) stockMap[m.product_id] = 0;
        stockMap[m.product_id] += (m.qty_in || 0) - (m.qty_out || 0);
      });

      return (data || [])
        .map((p) => ({ ...p, current_stock: stockMap[p.id] ?? 0 }))
        .filter((p) => p.current_stock < p.minimum_stock);
    },
    staleTime: 1000 * 60 * 5,
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();
  const { selectedStore } = useAuth();
  return useMutation({
    mutationFn: async (product: TablesInsert<"products">) => {
      if (!selectedStore?.id) throw new Error("Pilih toko terlebih dahulu");
      const { data, error } = await supabase
        .from("products")
        .insert({ ...product, store_id: selectedStore.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: TablesUpdate<"products"> & { id: string }) => {
      const { data, error } = await supabase.from("products").update(updates).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });
}

export function useCategories() {
  return useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await supabase.from("categories").select("*").order("name");
      if (error) throw error;
      return data;
    },
  });
}

export function useUnits() {
  return useQuery({
    queryKey: ["units"],
    queryFn: async () => {
      const { data, error } = await supabase.from("units").select("*").order("name");
      if (error) throw error;
      return data;
    },
  });
}

export function useAdjustStock() {
  const queryClient = useQueryClient();
  const { selectedStore } = useAuth();
  return useMutation({
    mutationFn: async ({
      product_id,
      qty,
      type,
      notes,
    }: {
      product_id: string;
      qty: number;
      type: "in" | "out";
      notes?: string;
    }) => {
      const { data, error } = await supabase
        .from("inventory_movements")
        .insert({
          product_id,
          movement_type: "adjustment",
          qty_in: type === "in" ? qty : 0,
          qty_out: type === "out" ? qty : 0,
          notes: notes || null,
          store_id: selectedStore?.id || null,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });
}

export function useProductById(productId: string | null) {
  return useQuery({
    queryKey: ["product", productId],
    enabled: !!productId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*, categories(name), units(name)")
        .eq("id", productId!)
        .single();
      if (error) throw error;
      return data as Product;
    },
  });
}

export type InventoryMovement = Tables<"inventory_movements"> & {
  invoiceNumber?: string | null;
  stockAfter: number;
};

export function useInventoryMovements(productId: string | null) {
  const { selectedStore } = useAuth();
  const storeId = selectedStore?.id;
  return useQuery({
    queryKey: ["inventory-movements", productId, storeId],
    enabled: !!productId,
    queryFn: async () => {
      let query = supabase
        .from("inventory_movements")
        .select("id, product_id, movement_type, reference_id, qty_in, qty_out, notes, store_id, created_at")
        .eq("product_id", productId!)
        .order("created_at", { ascending: true });
      if (storeId) query = query.eq("store_id", storeId);

      const { data, error } = await query;
      if (error) throw error;
      const movements = data || [];

      // Resolve invoice numbers for sale movements
      const saleRefIds = movements
        .filter((m) => m.movement_type === "sale" && m.reference_id)
        .map((m) => m.reference_id as string);
      let invoiceMap: Record<string, string> = {};
      if (saleRefIds.length > 0) {
        const { data: orders } = await supabase
          .from("sales_orders")
          .select("id, invoice_number")
          .in("id", saleRefIds);
        orders?.forEach((o) => { invoiceMap[o.id] = o.invoice_number; });
      }

      // Compute running stock balance (ascending), then reverse for display
      let running = 0;
      const withBalance = movements.map((m) => {
        running += (m.qty_in || 0) - (m.qty_out || 0);
        return {
          ...m,
          invoiceNumber: m.reference_id ? (invoiceMap[m.reference_id] ?? null) : null,
          stockAfter: running,
        } as InventoryMovement;
      });
      return withBalance.reverse(); // newest first
    },
  });
}

export function useRealtimeStock() {
  const queryClient = useQueryClient();
  useEffect(() => {
    const channel = supabase
      .channel("inventory-movements-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "inventory_movements" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["products"] });
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
}
