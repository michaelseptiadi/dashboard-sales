import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { TablesInsert, TablesUpdate } from "@/integrations/supabase/types";
import { useAuth } from "@/hooks/useAuth";

export function useCustomers(search?: string) {
  const { selectedStore } = useAuth();
  const storeId = selectedStore?.id;
  return useQuery({
    queryKey: ["customers", storeId, search],
    queryFn: async () => {
      let query = supabase.from("customers").select("*").order("name");

      if (storeId) {
        query = query.eq("store_id", storeId);
      }
      if (search) {
        query = query.or(`name.ilike.%${search}%,phone.ilike.%${search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (customer: TablesInsert<"customers">) => {
      const { data, error } = await supabase.from("customers").insert(customer).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
    },
  });
}

export function useUpdateCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: TablesUpdate<"customers"> & { id: string }) => {
      const { data, error } = await supabase.from("customers").update(updates).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      queryClient.invalidateQueries({ queryKey: ["customer", variables.id] });
    },
  });
}

export function useCustomerById(customerId: string | null) {
  return useQuery({
    queryKey: ["customer", customerId],
    enabled: !!customerId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customers")
        .select("*")
        .eq("id", customerId!)
        .single();
      if (error) throw error;
      return data;
    },
  });
}

export function useCustomerTransactions(customerId: string | null) {
  return useQuery({
    queryKey: ["customer-transactions", customerId],
    enabled: !!customerId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sales_orders")
        .select("id, invoice_number, sales_date, grand_total, total_amount, total_discount, unpaid_transaction, transaction_status, payment_methods(name)")
        .eq("customer_id", customerId!)
        .order("sales_date", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}
