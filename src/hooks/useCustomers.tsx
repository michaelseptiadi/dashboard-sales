import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import apiClient from "@/lib/apiClient";
import { useAuth } from "@/hooks/useAuth";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface Customer {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  is_active: boolean;
  store_id: string | null;
  created_at: string;
  updated_at: string;
}

export type CustomerInsert = Omit<Customer, "id" | "created_at" | "updated_at">;
export type CustomerUpdate = Partial<CustomerInsert>;

// ── Hooks ─────────────────────────────────────────────────────────────────────

export function useCustomers(search?: string) {
  const { selectedStore } = useAuth();
  const storeId = selectedStore?.id;
  return useQuery<Customer[]>({
    queryKey: ["customers", storeId, search],
    queryFn: () => {
      const params = new URLSearchParams();
      if (storeId) params.set("store_id", storeId);
      if (search) params.set("search", search);
      return apiClient.get<Customer[]>(`/customers?${params.toString()}`);
    },
  });
}

export function useCreateCustomer() {
  const queryClient = useQueryClient();
  const { selectedStore } = useAuth();
  return useMutation({
    mutationFn: (customer: Omit<CustomerInsert, "store_id" | "is_active"> & { store_id?: string | null; is_active?: boolean }) =>
      apiClient.post<Customer>("/customers", {
        ...customer,
        store_id: customer.store_id !== undefined ? customer.store_id : (selectedStore?.id || null),
        is_active: customer.is_active !== undefined ? customer.is_active : true,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
    },
  });
}

export function useUpdateCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...updates }: CustomerUpdate & { id: string }) =>
      apiClient.put<Customer>(`/customers/${id}`, updates),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      queryClient.invalidateQueries({ queryKey: ["customer", variables.id] });
    },
  });
}

export function useCustomerById(customerId: string | null) {
  return useQuery<Customer>({
    queryKey: ["customer", customerId],
    enabled: !!customerId,
    queryFn: () => apiClient.get<Customer>(`/customers/${customerId}`),
  });
}

export function useCustomerTransactions(customerId: string | null) {
  return useQuery({
    queryKey: ["customer-transactions", customerId],
    enabled: !!customerId,
    queryFn: () =>
      apiClient.get<{ data: any[] }>(`/sales?customer_id=${customerId}&pageSize=1000`)
        .then((res) => res.data),
  });
}
