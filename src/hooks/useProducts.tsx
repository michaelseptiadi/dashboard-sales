import { useInfiniteQuery, useQuery, useMutation, useQueryClient, type InfiniteData } from "@tanstack/react-query";
import apiClient from "@/lib/apiClient";
import { useAuth } from "@/hooks/useAuth";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ProductUnit {
  id: string;
  product_id: string;
  unit_id: string;
  conversion_factor: number;
  is_base_unit: boolean;
  price: number;
  unit?: { id: string; name: string } | null;
}

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
  inventory_mode: string;
  shared_stock: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Keep both names for compatibility with existing pages.
  categories?: { id?: string; name: string } | null;
  units?: { id?: string; name: string } | null;
  category?: { name: string } | null;
  unit?: { name: string } | null;
  product_units?: ProductUnit[] | null;
  variants?: ProductVariant[] | null;
}

export interface ProductInsert {
  product_code: string;
  name: string;
  category_id: string | null;
  unit_id: string | null;
  selling_price: number;
  capital_price: number;
  minimum_stock: number;
  inventory_mode?: "INDEPENDENT" | "SHARED_BASE";
  current_stock?: number;
}

export type ProductUpdate = Partial<{
  product_id: string;
  store_id: string;
  selling_price: number;
  capital_price: number;
  current_stock: number;
  minimum_stock: number;
  name: string;
  product_code: string;
  category_id: string;
  unit_id: string;
  is_active: boolean;
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
  movement_type?: string | null;
  reference_type?: string | null;
  reference_id?: string | null;
  quantity?: number | string | null;
  qty_in?: number | null;
  qty_out?: number | null;
  notes: string | null;
  created_at: string;
}

interface ProductApiPayload {
  id: string;
  product_code: string;
  name: string;
  is_active: boolean;
  category_id: string | null;
  store_id: string;
  inventory_mode: string;
  shared_stock: number | string;
  base_unit_id: string | null;
  minimum_stock: number;
  created_at: string;
  updated_at: string;
  category: { id: string; name: string } | null;
  base_unit?: { id: string; name: string } | null;
  variants?: {
    id: string;
    product_id: string;
    name: string;
    sku_suffix?: string | null;
    unit_id: string;
    conversion_factor: number | string;
    selling_price: number | string;
    capital_price: number | string;
    stock: number | string;
    minimum_stock: number;
    is_active: boolean;
    created_at: string;
    updated_at: string;
    unit?: { id: string; name: string } | null;
  }[];
}

export interface StoreProductDetailResponse extends ProductApiPayload {
  stockMutations?: BackendMovement[];
}

// ── Hooks ─────────────────────────────────────────────────────────────────────

type StoreProductsApiResponse = {
  data: ProductApiPayload[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

function mapStoreProduct(item: ProductApiPayload): Product {
  const variants = item.variants ?? [];
  const defaultVariant = variants.find((v) => v.name.toLowerCase() === "default") || variants[0];

  const sellingPrice = defaultVariant ? Number(defaultVariant.selling_price) : 0;
  const capitalPrice = defaultVariant ? Number(defaultVariant.capital_price) : 0;
  const minimumStock = defaultVariant ? Number(defaultVariant.minimum_stock) : Number(item.minimum_stock ?? 0);
  const currentStock = item.inventory_mode === "SHARED_BASE"
    ? Number(item.shared_stock)
    : variants.reduce((sum, variant) => sum + Number(variant.stock), 0);

  const unitName = defaultVariant?.unit?.name || item.base_unit?.name || "";
  const unitId = defaultVariant?.unit_id || item.base_unit_id || "";

  return {
    id: item.id,
    store_product_id: item.id,
    name: item.name,
    product_code: item.product_code,
    store_id: item.store_id,
    category_id: item.category_id,
    unit_id: unitId,
    selling_price: sellingPrice,
    capital_price: capitalPrice,
    inventory_mode: item.inventory_mode,
    shared_stock: Number(item.shared_stock),
    minimum_stock: minimumStock,
    current_stock: item.inventory_mode === "SHARED_BASE" ? Number(item.shared_stock) : currentStock,
    is_active: item.is_active,
    created_at: item.created_at,
    updated_at: item.updated_at,
    categories: item.category,
    units: item.base_unit,
    category: item.category,
    unit: item.base_unit,
    product_units: null,
    variants: variants.map((v) => ({
      id: v.id,
      product_id: v.product_id,
      name: v.name,
      sku_suffix: v.sku_suffix ?? null,
      unit_id: v.unit_id,
      conversion_factor: Number(v.conversion_factor),
      selling_price: Number(v.selling_price),
      capital_price: Number(v.capital_price),
      stock: Number(v.stock),
      minimum_stock: Number(v.minimum_stock),
      is_active: v.is_active,
      created_at: v.created_at,
      updated_at: v.updated_at,
      unit: v.unit ? { id: v.unit.id, name: v.unit.name } : null,
    })),
  };
}

function responseDetailToProduct(res: StoreProductDetailResponse): Product {
  return mapStoreProduct(res);
}

export function useInfiniteProducts(search?: string, categoryId?: string, limit = 10, isActive?: string) {
  const { selectedStore } = useAuth();
  const storeId = selectedStore?.id;

  return useInfiniteQuery({
    queryKey: ["products", storeId, search, categoryId, limit, isActive],
    initialPageParam: 1,
    queryFn: ({ pageParam }): Promise<PaginatedProducts> => {
      const p = new URLSearchParams();
      if (storeId) p.set("storeId", storeId);
      if (search) p.set("search", search);
      if (categoryId) p.set("categoryId", categoryId);
      if (isActive && isActive !== "all") p.set("isActive", isActive);
      p.set("page", String(pageParam));
      p.set("limit", String(limit));
      return apiClient
        .get<StoreProductsApiResponse>(`/store-products?${p.toString()}`)
        .then((res) => ({
          data: (res.data ?? []).map(mapStoreProduct),
          meta: res.meta,
        }));
    },
    getNextPageParam: (lastPage) =>
      lastPage.meta.page < lastPage.meta.totalPages ? lastPage.meta.page + 1 : undefined,
    enabled: !!storeId,
  });
}

export function useInfiniteActiveProducts(search?: string) {
  const { selectedStore } = useAuth();
  const storeId = selectedStore?.id;

  return useInfiniteQuery({
    queryKey: ["active-products-infinite", storeId, search],
    initialPageParam: 1,
    queryFn: async ({ pageParam = 1 }) => {
      const params = new URLSearchParams();
      params.set("storeId", storeId!);
      params.set("page", pageParam.toString());
      params.set("limit", "20");
      if (search) params.set("search", search);

      const res = await apiClient.get<StoreProductsApiResponse>(`/store-products?${params.toString()}`);
      
      const items = (res.data ?? []).map(mapStoreProduct).filter((item) => item.is_active);
      const currentPage = Number(res.meta?.page ?? pageParam);
      const totalPages = Number(res.meta?.totalPages ?? 1);
      return {
        data: items,
        nextPage: currentPage < totalPages ? currentPage + 1 : undefined,
      };
    },
    getNextPageParam: (lastPage) => lastPage.nextPage,
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

      return apiClient
        .get<StoreProductsApiResponse>(`/store-products?${params.toString()}`)
        .then((res) => (res.data ?? []).map(mapStoreProduct).filter((item) => item.is_active));
    },
  });
}

interface LowStockApiPayload {
  id: string;
  product_id: string;
  name: string;
  sku_suffix?: string | null;
  unit_id: string;
  conversion_factor: number | string;
  selling_price: number | string;
  capital_price: number | string;
  stock: number | string;
  minimum_stock: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  unit?: { id: string; name: string } | null;
  product?: {
    id: string;
    product_code: string;
    name: string;
    inventory_mode?: string;
    shared_stock?: number | string;
    category?: { id: string; name: string } | null;
    base_unit?: { id: string; name: string } | null;
    variants?: { stock: number | string }[];
  } | null;
}

export function useLowStockProducts() {
  const { selectedStore } = useAuth();
  const storeId = selectedStore?.id;

  return useQuery<Product[]>({
    queryKey: ["low-stock-products", storeId],
    queryFn: async () => {
      const response = await apiClient.get<LowStockApiPayload[]>(`/store-products/low-stock?storeId=${storeId}`);
      return (response ?? []).map((v) => {
        const p = v.product;
        return {
          id: p?.id || v.product_id,
          store_product_id: p?.id || v.product_id,
          name: `${p?.name || ""} (${v.name})`,
          product_code: p?.product_code || "",
          store_id: storeId || null,
          category_id: p?.category?.id || null,
          unit_id: v.unit_id,
          selling_price: Number(v.selling_price),
          capital_price: Number(v.capital_price),
          minimum_stock: Number(v.minimum_stock),
          current_stock: p?.inventory_mode === "SHARED_BASE" ? Number(p.shared_stock ?? 0) : (p?.variants ?? []).reduce((sum, variant) => sum + Number(variant.stock), 0),
          inventory_mode: p?.inventory_mode ?? "INDEPENDENT",
          shared_stock: Number(p?.shared_stock ?? 0),
          is_active: v.is_active,
          created_at: v.created_at,
          updated_at: v.updated_at,
          categories: p?.category,
          units: v.unit || p?.base_unit,
          category: p?.category,
          unit: v.unit || p?.base_unit,
          variant_id: v.id,
          variants: [{
            id: v.id,
            product_id: v.product_id,
            name: v.name,
            sku_suffix: v.sku_suffix ?? null,
            unit_id: v.unit_id,
            conversion_factor: Number(v.conversion_factor),
            selling_price: Number(v.selling_price),
            capital_price: Number(v.capital_price),
            stock: Number(v.stock),
            minimum_stock: Number(v.minimum_stock),
            is_active: v.is_active,
            created_at: v.created_at,
            updated_at: v.updated_at,
            unit: v.unit ? { id: v.unit.id, name: v.unit.name } : null,
          }]
        };
      });
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
      return apiClient.post<Product>("/store-products", {
        productCode: product.product_code,
        name: product.name,
        categoryId: product.category_id,
        baseUnitId: product.unit_id,
        storeId: selectedStore.id,
        sellingPrice: product.selling_price,
        capitalPrice: product.capital_price,
        stock: product.current_stock ?? 0,
        minStock: product.minimum_stock,
        inventoryMode: product.inventory_mode ?? 'INDEPENDENT',
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
        ...(updates.name !== undefined ? { name: updates.name } : {}),
        ...(updates.product_code !== undefined ? { productCode: updates.product_code } : {}),
        ...(updates.category_id !== undefined ? { categoryId: updates.category_id } : {}),
        ...(updates.unit_id !== undefined ? { baseUnitId: updates.unit_id } : {}),
        ...(updates.is_active !== undefined ? { isActive: updates.is_active } : {}),
      }),
    onSuccess: (updatedProduct, vars) => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["active-products-infinite"] });
      queryClient.invalidateQueries({ queryKey: ["product", vars.id] });
      queryClient.invalidateQueries({ queryKey: ["active-products"] });
      queryClient.invalidateQueries({ queryKey: ["low-stock-products"] });
      queryClient.invalidateQueries({ queryKey: ["product-variants"] });
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

export function useAdjustStock() {
  const queryClient = useQueryClient();
  const { selectedStore } = useAuth();

  return useMutation({
    mutationFn: async (params: {
      product_id: string;
      productVariantId: string;
      qty: number;
      type: "in" | "out";
      notes?: string;
      storeProductId?: string;
    }) => {
      if (!selectedStore?.id) throw new Error("Pilih toko terlebih dahulu");

      return apiClient.post<{ variant: ProductVariant; mutation: unknown }>(
        "/store-products/adjustment",
        {
          productVariantId: params.productVariantId,
          type: params.type === "in" ? "ADD" : "SUBTRACT",
          quantity: params.qty,
          adjustmentReason: params.notes?.trim() || "Manual adjustment",
        },
      );
    },
    onSuccess: (data, variables) => {
      const updatedProduct = data?.product;
      const updatedVariant = data?.variant;

      queryClient.setQueriesData<InfiniteData<PaginatedProducts>>(
        { queryKey: ["products"], exact: false },
        (old) => old && ({
          ...old,
          pages: old.pages.map((page) => ({
            ...page,
            data: page.data.map((product) => {
              if (product.id !== variables.product_id) return product;
              const updatedVariants = updatedVariant
                ? (product.variants ?? []).map((v) => v.id === updatedVariant.id ? { ...v, stock: Number(updatedVariant.stock) } : v)
                : product.variants;
              const currentStock = product.inventory_mode === "SHARED_BASE" && updatedProduct
                ? Number(updatedProduct.shared_stock)
                : updatedVariants?.reduce((sum, v) => sum + Number(v.stock), 0) ?? product.current_stock;
              return { ...product, variants: updatedVariants, current_stock: currentStock, shared_stock: updatedProduct ? Number(updatedProduct.shared_stock) : product.shared_stock };
            }),
          })),
        }),
      );

      if (variables.storeProductId) {
        queryClient.setQueryData<Product>(["product", variables.storeProductId], (old) => {
          if (!old) return old;
          const variants = updatedVariant ? (old.variants ?? []).map((v) => v.id === updatedVariant.id ? { ...v, stock: Number(updatedVariant.stock) } : v) : old.variants;
          return { ...old, variants, current_stock: updatedProduct ? Number(updatedProduct.shared_stock) : variants?.reduce((sum, v) => sum + Number(v.stock), 0) ?? old.current_stock, shared_stock: updatedProduct ? Number(updatedProduct.shared_stock) : old.shared_stock };
        });
      }

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
      const product = responseDetailToProduct(response);
      const currentStock = product.current_stock ?? 0;
      const movements = response.stockMutations ?? [];

      let currentStockAccumulator = currentStock;
      const mapped = movements.map((m: BackendMovement) => {
        const qty_in = m.qty_in !== undefined && m.qty_in !== null ? Number(m.qty_in) : (Number(m.quantity ?? 0) > 0 ? Number(m.quantity) : 0);
        const qty_out = m.qty_out !== undefined && m.qty_out !== null ? Number(m.qty_out) : (Number(m.quantity ?? 0) < 0 ? -Number(m.quantity ?? 0) : 0);

        const stockAfter = currentStockAccumulator;
        currentStockAccumulator = currentStockAccumulator - qty_in + qty_out;

        let movementType = "adjustment";
        const typeUpper = (m.movement_type || m.reference_type || "").toUpperCase();
        if (typeUpper === "SALE" || typeUpper === "PENJUALAN" || typeUpper === "OUT") {
          movementType = "sale";
        }

        return {
          id: m.id,
          product_id: m.product_id,
          movement_type: movementType,
          reference_id: m.reference_id ?? null,
          qty_in,
          qty_out,
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

export function useRealtimeStock() {
  return;
}

// ── Product Variants ──────────────────────────────────────────────────────────

export interface ProductVariant {
  id: string;
  product_id: string;
  name: string;
  sku_suffix?: string | null;
  unit_id: string;
  conversion_factor: number;
  selling_price: number;
  capital_price: number;
  stock: number;
  minimum_stock: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  unit?: { id: string; name: string } | null;
  product?: { id: string; product_code: string; name: string; store_id: string } | null;
}

export function useProductVariants(productId: string | null, storeId?: string | null) {
  return useQuery<ProductVariant[]>({
    queryKey: ["product-variants", productId, storeId],
    enabled: !!productId,
    queryFn: async () => {
      const p = new URLSearchParams();
      if (productId) p.set("productId", productId);
      return apiClient.get<ProductVariant[]>(`/product-variants?${p.toString()}`);
    },
  });
}

export function useCreateVariant() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: {
      productId: string;
      name: string;
      skuSuffix?: string;
      unitId: string;
      conversionFactor: number;
      sellingPrice: number;
      capitalPrice: number;
      stock: number;
      minimumStock?: number;
    }) => apiClient.post<ProductVariant>("/product-variants", payload),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["product-variants", vars.productId] });
      queryClient.invalidateQueries({ queryKey: ["product"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["active-products"] });
      queryClient.invalidateQueries({ queryKey: ["active-products-infinite"] });
    },
  });
}

export function useUpdateVariant() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, productId, ...rest }: {
      id: string;
      productId: string;
      name?: string;
      skuSuffix?: string;
      unitId?: string;
      conversionFactor?: number;
      isActive?: boolean;
      sellingPrice?: number;
      capitalPrice?: number;
      stock?: number;
      minimumStock?: number;
    }) => apiClient.patch<ProductVariant>(`/product-variants/${id}`, rest),
    onSuccess: (updatedVariant, vars) => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["active-products-infinite"] });
      queryClient.invalidateQueries({ queryKey: ["active-products"] });
      queryClient.invalidateQueries({ queryKey: ["product-variants", vars.productId] });
      queryClient.invalidateQueries({ queryKey: ["product", vars.productId] });
      queryClient.invalidateQueries({ queryKey: ["low-stock-products"] });
    },
  });
}

export function useDeleteVariant() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string; productId: string }) =>
      apiClient.delete<{ id: string; is_active: boolean }>(`/product-variants/${id}`),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["product-variants", vars.productId] });
      queryClient.invalidateQueries({ queryKey: ["product"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["active-products"] });
      queryClient.invalidateQueries({ queryKey: ["active-products-infinite"] });
    },
  });
}
