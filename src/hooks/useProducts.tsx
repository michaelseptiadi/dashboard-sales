import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

export type Product = Tables<"products"> & {
  categories?: { name: string } | null;
  units?: { name: string } | null;
  current_stock?: number;
};

export function useProducts(search?: string, categoryId?: string) {
  return useQuery({
    queryKey: ["products", search, categoryId],
    queryFn: async () => {
      let query = supabase
        .from("products")
        .select("*, categories(name), units(name)")
        .order("name");

      if (search) {
        query = query.or(`name.ilike.%${search}%,product_code.ilike.%${search}%`);
      }
      if (categoryId) {
        query = query.eq("category_id", categoryId);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Fetch stock for all products
      const { data: stockData, error: stockError } = await supabase
        .from("inventory_movements")
        .select("product_id, qty_in, qty_out");
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
  return useQuery({
    queryKey: ["active-products", search],
    queryFn: async () => {
      let query = supabase
        .from("products")
        .select("*, categories(name), units(name)")
        .eq("is_active", true)
        .order("name");

      if (search) {
        query = query.or(`name.ilike.%${search}%,product_code.ilike.%${search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Product[];
    },
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (product: TablesInsert<"products">) => {
      const { data, error } = await supabase.from("products").insert(product).select().single();
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
