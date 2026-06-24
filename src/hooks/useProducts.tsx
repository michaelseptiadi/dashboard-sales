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
    selling_price: item.selling_price,
    capital_price: item.capital_price,
    minimum_stock: item.minimum_stock,
    current_stock: item.stock,
    is_active: item.product.is_active,
    created_at: item.created_at,
    updated_at: item.updated_at,
    categories: item.product.category,
    units: item.product.unit,
    category: item.product.category,
    unit: item.product.unit,
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

export function useActiveProducts(search?: string, categoryId?: string) {
  const { selectedStore } = useAuth();
  const storeId = selectedStore?.id;

  return useQuery<Product[]>({
    queryKey: ["active-products", storeId, search, categoryId],
    enabled: !!storeId,
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set("storeId", storeId!);
      params.set("page", "1");
      params.set("limit", "100");
      if (search) params.set("search", search);
      if (categoryId && categoryId !== "all") params.set("categoryId", categoryId);

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

// ── Store Product Detail (GET /store-products/:id) ───────────────────────────

export interface StoreProductDetail {
  // StoreProduct fields
  id: string;               // store_product id
  product_id: string;       // master product id
  store_id: string;
  selling_price: number;
  capital_price: number;
  minimum_stock: number;
  stock: number;
  created_at: string;
  updated_at: string;
  // Nested master product
  productDetail: {
    id: string;
    product_code: string;
    name: string;
    is_active: boolean;
    category: { id: string; name: string } | null;
    unit: { id: string; name: string } | null;
  };
  // Inventory movements (most recent first)
  InventoryMovement: Array<{
    id: string;
    product_id: string;
    store_id: string | null;
    movement_type: string;
    reference_id: string | null;
    qty_in: number;
    qty_out: number;
    notes: string | null;
    created_at: string;
  }>;
}

/** Fetch a single StoreProduct by its ID (store_product.id) */
export function useStoreProductDetail(storeProductId: string | null) {
  return useQuery<StoreProductDetail>({
    queryKey: ["store-product-detail", storeProductId],
    enabled: !!storeProductId,
    queryFn: () =>
      apiClient.get<StoreProductDetail>(`/store-products/${storeProductId}`),
  });
}

/** @deprecated Use useStoreProductDetail instead. */
export function useProductById(productId: string | null) {
  const { selectedStore } = useAuth();
  const storeId = selectedStore?.id;

  return useQuery<Product>({
    queryKey: ["product", storeId, productId],
    enabled: !!productId && !!storeId,
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set("storeId", storeId!);
      params.set("page", "1");
      params.set("limit", "100");

      const response = await apiClient.get<StoreProductsApiResponse>(`/store-products?${params.toString()}`);
      const mapped = (response.data ?? []).map(mapStoreProduct);
      const found = mapped.find((item) => item.id === productId);
      if (!found) throw new Error("Produk tidak ditemukan");
      return found;
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
      queryClient.invalidateQueries({ queryKey: ["store-product-detail", variables.id] });
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
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["product", variables.product_id] });
      queryClient.invalidateQueries({ queryKey: ["inventory-movements", variables.product_id] });
      // Invalidate the detail page cache — the storeProduct id is returned in the response
      if (data?.storeProduct?.id) {
        queryClient.invalidateQueries({ queryKey: ["store-product-detail", data.storeProduct.id] });
      } else {
        queryClient.invalidateQueries({ queryKey: ["store-product-detail"] });
      }
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

export interface GlobalProduct {
  id: string;
  product_code: string;
  name: string;
  category_id: string;
  unit_id: string;
  is_active: boolean;
  category?: { id: string; name: string } | null;
  unit?: { id: string; name: string } | null;
  store_products?: { id: string; store_id: string }[];
}

export interface PaginatedGlobalProducts {
  data: GlobalProduct[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export function useGlobalProducts(search?: string, page = 1, limit = 10) {
  return useQuery<PaginatedGlobalProducts>({
    queryKey: ["global-products", search, page, limit],
    queryFn: () => {
      const p = new URLSearchParams();
      if (search) p.set("search", search);
      p.set("page", String(page));
      p.set("limit", String(limit));
      return apiClient.get<PaginatedGlobalProducts>(`/products?${p.toString()}`);
    },
  });
}

export interface StoreProductAddInput {
  productId: string;
  sellingPrice: number;
  capitalPrice: number;
  stock: number;
  minStock: number;
}

export function useAddStoreProduct() {
  const queryClient = useQueryClient();
  const { selectedStore } = useAuth();

  return useMutation({
    mutationFn: (input: StoreProductAddInput) => {
      if (!selectedStore?.id) throw new Error("Pilih toko terlebih dahulu");
      return apiClient.post<{ id: string }>("/store-products", {
        productId: input.productId,
        storeId: selectedStore.id,
        sellingPrice: input.sellingPrice,
        capitalPrice: input.capitalPrice,
        stock: input.stock,
        minStock: input.minStock,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["global-products"] });
      queryClient.invalidateQueries({ queryKey: ["low-stock-products"] });
    },
  });
}

export function useCreateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (name: string) =>
      apiClient.post<{ id: string; name: string }>("/categories", { name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
    },
  });
}

export function useCreateUnit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (name: string) =>
      apiClient.post<{ id: string; name: string }>("/units", { name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["units"] });
    },
  });
}
