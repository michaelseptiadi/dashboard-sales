import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import apiClient from "@/lib/apiClient";
import { useAuth } from "@/hooks/useAuth";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface Product {
  // Product master id
  id: string;
  // Store-product id used by PATCH /store-products/:id
  store_product_id: string;
  name: string;
  product_code: string;
  store_id: string | null;
  category_id: string | null;
  unit_id: string | null;
  selling_price: number;
  capital_price: number;
  minimum_stock: number;
  current_stock: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Keep both names for compatibility with existing pages.
  categories?: { id?: string; name: string } | null;
  units?: { id?: string; name: string } | null;
  category?: { name: string } | null;
  unit?: { name: string } | null;
}

export interface ProductInsert {
  product_code: string;
  name: string;
  category_id: string | null;
  unit_id: string | null;
  selling_price: number;
  capital_price: number;
  minimum_stock: number;
  current_stock?: number;
}

export type ProductUpdate = Partial<{
  product_id: string;
  store_id: string;
  selling_price: number;
  capital_price: number;
  current_stock: number;
  minimum_stock: number;
}>;

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

export interface PaginatedProducts {
  data: Product[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface BackendMovement {
  id: string;
  product_id: string;
  store_id: string | null;
  movement_type: string;
  qty_in: number;
  qty_out: number;
  reference_id: string | null;
  notes: string | null;
  created_at: string;
}

export interface StoreProductDetailResponse {
  id: string;
  product_id: string;
  store_id: string;
  selling_price: string | number;
  capital_price: string | number;
  minimum_stock: number;
  stock: number;
  created_at: string;
  updated_at: string;
  productDetail: {
    id: string;
    product_code: string;
    name: string;
    is_active: boolean;
    category: { id: string; name: string } | null;
    unit: { id: string; name: string } | null;
    category_id?: string | null;
    unit_id?: string | null;
  };
  InventoryMovement: BackendMovement[];
}

// ── Hooks ─────────────────────────────────────────────────────────────────────

type StoreProductApi = {
  id: string;
  product_id: string;
  store_id: string;
  selling_price: number;
  capital_price: number;
  stock: number;
  minimum_stock: number;
  created_at: string;
  updated_at: string;
  product: {
    id: string;
    product_code: string;
    name: string;
    is_active: boolean;
    category: { id: string; name: string } | null;
    unit: { id: string; name: string } | null;
  };
};

type StoreProductsApiResponse = {
  data: StoreProductApi[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

function mapStoreProduct(item: StoreProductApi): Product {
  return {
    id: item.product.id,
    store_product_id: item.id,
    name: item.product.name,
    product_code: item.product.product_code,
    store_id: item.store_id,
    category_id: item.product.category?.id ?? null,
    unit_id: item.product.unit?.id ?? null,
    selling_price: Number(item.selling_price),
    capital_price: Number(item.capital_price),
    minimum_stock: Number(item.minimum_stock),
    current_stock: Number(item.stock),
    is_active: item.product.is_active,
    created_at: item.created_at,
    updated_at: item.updated_at,
    categories: item.product.category,
    units: item.product.unit,
    category: item.product.category,
    unit: item.product.unit,
  };
}

function responseDetailToProduct(res: StoreProductDetailResponse): Product {
  const pDetail = res.productDetail;
  return {
    id: pDetail.id,
    store_product_id: res.id,
    name: pDetail.name,
    product_code: pDetail.product_code,
    store_id: res.store_id,
    category_id: pDetail.category?.id ?? pDetail.category_id ?? null,
    unit_id: pDetail.unit?.id ?? pDetail.unit_id ?? null,
    selling_price: Number(res.selling_price),
    capital_price: Number(res.capital_price),
    minimum_stock: Number(res.minimum_stock),
    current_stock: Number(res.stock),
    is_active: pDetail.is_active,
    created_at: res.created_at,
    updated_at: res.updated_at,
    categories: pDetail.category,
    units: pDetail.unit,
    category: pDetail.category,
    unit: pDetail.unit,
  };
}

export function useProducts(search?: string, categoryId?: string, page = 1, limit = 10) {
  const { selectedStore } = useAuth();
  const storeId = selectedStore?.id;

  return useQuery<PaginatedProducts>({
    queryKey: ["products", storeId, search, categoryId, page, limit],
    queryFn: () => {
      const p = new URLSearchParams();
      if (storeId) p.set("storeId", storeId);
      if (search) p.set("search", search);
      if (categoryId) p.set("categoryId", categoryId);
      p.set("page", String(page));
      p.set("limit", String(limit));
      return apiClient
        .get<StoreProductsApiResponse>(`/store-products?${p.toString()}`)
        .then((res) => ({
          data: (res.data ?? []).map(mapStoreProduct),
          meta: res.meta,
        }));
    },
    enabled: !!storeId,
  });
}

export function useActiveProducts(search?: string) {
  const { selectedStore } = useAuth();
  const storeId = selectedStore?.id;

  return useQuery<Product[]>({
    queryKey: ["active-products", storeId, search],
    enabled: !!storeId,
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set("storeId", storeId!);
      params.set("page", "1");
      params.set("limit", "100");
      if (search) params.set("search", search);

      // Delegate to the same source and filter by active flag client-side.
      return apiClient
        .get<StoreProductsApiResponse>(`/store-products?${params.toString()}`)
        .then((res) => (res.data ?? []).map(mapStoreProduct).filter((item) => item.is_active));
    },
  });
}

export function useLowStockProducts() {
  const { selectedStore } = useAuth();
  const storeId = selectedStore?.id;

  return useQuery<Product[]>({
    queryKey: ["low-stock-products", storeId],
    queryFn: async () => {
      const response = await apiClient.get<StoreProductApi[]>(`/store-products/low-stock?storeId=${storeId}`);
      return (response ?? []).map(mapStoreProduct);
    },
    enabled: !!storeId,
    staleTime: 1000 * 60 * 5,
  });
}

export function useProductById(storeProductId: string | null) {
  return useQuery<Product>({
    queryKey: ["product", storeProductId],
    enabled: !!storeProductId,
    queryFn: async () => {
      const response = await apiClient.get<StoreProductDetailResponse>(`/store-products/${storeProductId}`);
      return responseDetailToProduct(response);
    },
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();
  const { selectedStore } = useAuth();

  return useMutation({
    mutationFn: (product: ProductInsert) => {
      if (!selectedStore?.id) throw new Error("Pilih toko terlebih dahulu");
      return apiClient.post<{ product: { id: string }; storeProduct: { id: string } }>("/store-products/new", {
        productCode: product.product_code,
        name: product.name,
        categoryId: product.category_id,
        unitId: product.unit_id,
        storeId: selectedStore.id,
        sellingPrice: product.selling_price,
        capitalPrice: product.capital_price,
        stock: product.current_stock ?? 0,
        minStock: product.minimum_stock,
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
      apiClient.patch<Product>(`/store-products/${id}`, {
        ...(updates.product_id ? { productId: updates.product_id } : {}),
        ...(updates.store_id ? { storeId: updates.store_id } : {}),
        ...(updates.selling_price !== undefined ? { sellingPrice: updates.selling_price } : {}),
        ...(updates.capital_price !== undefined ? { capitalPrice: updates.capital_price } : {}),
        ...(updates.current_stock !== undefined ? { stock: updates.current_stock } : {}),
        ...(updates.minimum_stock !== undefined ? { minStock: updates.minimum_stock } : {}),
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["product"] });
      queryClient.invalidateQueries({ queryKey: ["active-products"] });
      queryClient.invalidateQueries({ queryKey: ["low-stock-products"] });
    },
  });
}

export function useCategories() {
  return useQuery({
    queryKey: ["categories"],
    queryFn: () =>
      apiClient.get<{ id: string; name: string }[]>("/categories"),
  });
}

export function useUnits() {
  return useQuery({
    queryKey: ["units"],
    queryFn: () =>
      apiClient.get<{ id: string; name: string }[]>("/units"),
  });
}

// TODO: useAdjustStock and useInventoryMovements require inventory endpoints
// that are not yet implemented in the backend (POST/GET /products/:id/stock).

export function useAdjustStock() {
  const queryClient = useQueryClient();
  const { selectedStore } = useAuth();

  return useMutation({
    mutationFn: async (params: {
      product_id: string;
      qty: number;
      type: "in" | "out";
      notes?: string;
      storeProductId?: string;
    }) => {
      if (!selectedStore?.id) throw new Error("Pilih toko terlebih dahulu");

      return apiClient.post<{ storeProduct: { id: string }; movement: { id: string } }>(
        "/store-products/adjustment",
        {
          storeId: selectedStore.id,
          productId: params.product_id,
          type: params.type === "in" ? "ADD" : "SUBTRACT",
          quantity: params.qty,
          adjustmentReason: params.notes?.trim() || "Manual adjustment",
        },
      );
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["active-products"] });
      queryClient.invalidateQueries({ queryKey: ["low-stock-products"] });
      if (variables.storeProductId) {
        queryClient.invalidateQueries({ queryKey: ["product", variables.storeProductId] });
        queryClient.invalidateQueries({ queryKey: ["inventory-movements", variables.storeProductId] });
      } else {
        queryClient.invalidateQueries({ queryKey: ["product"] });
        queryClient.invalidateQueries({ queryKey: ["inventory-movements"] });
      }
    },
  });
}

export function useInventoryMovements(storeProductId: string | null) {
  return useQuery<InventoryMovement[]>({
    queryKey: ["inventory-movements", storeProductId],
    enabled: !!storeProductId,
    queryFn: async () => {
      const response = await apiClient.get<StoreProductDetailResponse>(`/store-products/${storeProductId}`);
      const currentStock = response.stock ?? 0;
      const movements = response.InventoryMovement ?? [];

      let currentStockAccumulator = currentStock;
      const mapped = movements.map((m: BackendMovement) => {
        const stockAfter = currentStockAccumulator;
        currentStockAccumulator = currentStockAccumulator - (m.qty_in ?? 0) + (m.qty_out ?? 0);

        let movementType = "adjustment";
        const typeUpper = (m.movement_type || "").toUpperCase();
        if (typeUpper === "SALE" || typeUpper === "PURCHASE" || typeUpper === "OUT") {
          movementType = "sale";
        }

        return {
          id: m.id,
          product_id: m.product_id,
          movement_type: movementType,
          reference_id: m.reference_id,
          qty_in: m.qty_in ?? 0,
          qty_out: m.qty_out ?? 0,
          notes: m.notes,
          store_id: m.store_id,
          created_at: m.created_at,
          stockAfter,
          invoiceNumber: m.reference_id && m.reference_id.startsWith("INV") ? m.reference_id : null,
        };
      });

      return mapped;
    },
  });
}

/** No-op — Supabase realtime is removed. Re-queries happen via React Query invalidation. */
export function useRealtimeStock() {
  return;
}
