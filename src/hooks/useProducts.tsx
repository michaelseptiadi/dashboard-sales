import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import apiClient from "@/lib/apiClient";
import { useAuth } from "@/hooks/useAuth";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface Product {
  id: string;
  name: string;
  product_code: string;
  store_id: string | null;
  category_id: string | null;
  unit_id: string | null;
  price: number;
  minimum_stock: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  category?: { name: string } | null;
  unit?: { name: string } | null;
  current_stock?: number;
}

export type ProductInsert = Omit<Product, "id" | "created_at" | "updated_at" | "category" | "unit" | "current_stock">;
export type ProductUpdate = Partial<ProductInsert>;

export interface InventoryMovement {
  id: string;
  product_id: string;
  movement_type: string;
  reference_id: string | null;
  qty_in: number;
  qty_out: number;
  notes: string | null;
  store_id: string | null;
  created_at: string;
  invoiceNumber?: string | null;
  stockAfter: number;
}

// ── Hooks ─────────────────────────────────────────────────────────────────────

export function useProducts(search?: string, categoryId?: string) {
  const { selectedStore } = useAuth();
  const storeId = selectedStore?.id;
  return useQuery<Product[]>({
    queryKey: ["products", storeId, search, categoryId],
    queryFn: () => {
      const p = new URLSearchParams();
      if (storeId) p.set("store_id", storeId);
      if (search) p.set("search", search);
      if (categoryId) p.set("category_id", categoryId);
      return apiClient.get<Product[]>(`/products?${p.toString()}`);
    },
  });
}

export function useActiveProducts(search?: string) {
  const { selectedStore } = useAuth();
  const storeId = selectedStore?.id;
  return useQuery<Product[]>({
    queryKey: ["active-products", storeId, search],
    queryFn: () => {
      const p = new URLSearchParams();
      if (storeId) p.set("store_id", storeId);
      p.set("is_active", "true");
      if (search) p.set("search", search);
      return apiClient.get<Product[]>(`/products?${p.toString()}`);
    },
  });
}

export function useLowStockProducts() {
  const { selectedStore } = useAuth();
  const storeId = selectedStore?.id;
  return useQuery<Product[]>({
    queryKey: ["low-stock-products", storeId],
    queryFn: () => {
      const p = new URLSearchParams();
      if (storeId) p.set("store_id", storeId);
      p.set("low_stock", "true");
      return apiClient.get<Product[]>(`/products?${p.toString()}`);
    },
    staleTime: 1000 * 60 * 5,
  });
}

export function useProductById(productId: string | null) {
  return useQuery<Product>({
    queryKey: ["product", productId],
    enabled: !!productId,
    queryFn: () => apiClient.get<Product>(`/products/${productId}`),
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();
  const { selectedStore } = useAuth();
  return useMutation({
    mutationFn: (product: ProductInsert) => {
      if (!selectedStore?.id) throw new Error("Pilih toko terlebih dahulu");
      return apiClient.post<Product>("/products", {
        ...product,
        store_id: selectedStore.id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...updates }: ProductUpdate & { id: string }) =>
      apiClient.put<Product>(`/products/${id}`, updates),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["product", variables.id] });
    },
  });
}

export function useCategories() {
  return useQuery({
    queryKey: ["categories"],
    queryFn: () =>
      apiClient.get<{ id: string; name: string }[]>("/master-data/categories"),
  });
}

export function useUnits() {
  return useQuery({
    queryKey: ["units"],
    queryFn: () =>
      apiClient.get<{ id: string; name: string }[]>("/master-data/units"),
  });
}

// TODO: useAdjustStock and useInventoryMovements require inventory endpoints
// that are not yet implemented in the backend (POST/GET /products/:id/stock).

export function useAdjustStock() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (_params: {
      product_id: string;
      qty: number;
      type: "in" | "out";
      notes?: string;
    }) => {
      throw new Error(
        "Stock adjustment endpoint not yet implemented in the backend API",
      );
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["product", variables.product_id] });
      queryClient.invalidateQueries({ queryKey: ["inventory-movements", variables.product_id] });
    },
  });
}

export function useInventoryMovements(_productId: string | null) {
  return useQuery<InventoryMovement[]>({
    queryKey: ["inventory-movements", _productId],
    enabled: false, // TODO: implement once backend exposes GET /products/:id/inventory
    queryFn: () => Promise.resolve([]),
  });
}

/** No-op — Supabase realtime is removed. Re-queries happen via React Query invalidation. */
export function useRealtimeStock() {
  return;
}
