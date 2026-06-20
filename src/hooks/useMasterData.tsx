import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import apiClient from "@/lib/apiClient";
import { useAuth } from "@/hooks/useAuth";

export interface SimpleRow {
  id: string;
  name: string;
  created_at: string;
}

export type MasterTableName = "categories" | "units";

// Map MasterTableName to the backend route segment
const TABLE_PATH: Record<MasterTableName, string> = {
  categories: "categories",
  units: "units",
};

export interface Driver {
  id: string;
  store_id: string;
  driver_name: string;
  phone_number: string | null;
  created_by: string;
  created_at: string;
}

export interface DriverInput {
  driver_name: string;
  phone_number?: string | null;
}

export function useSimpleTable(table: MasterTableName) {
  return useQuery<SimpleRow[]>({
    queryKey: [table],
    queryFn: () =>
      apiClient.get<SimpleRow[]>(`/${TABLE_PATH[table]}`),
  });
}

export function useCreateRow(table: MasterTableName) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (name: string) =>
      apiClient.post<SimpleRow>(`/${TABLE_PATH[table]}`, { name }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [table] }),
  });
}

export function useUpdateRow(table: MasterTableName) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      apiClient.put<SimpleRow>(`/${TABLE_PATH[table]}/${id}`, { name }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [table] }),
  });
}

export function useDeleteRow(table: MasterTableName) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.delete(`/${TABLE_PATH[table]}/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [table] }),
  });
}

// ── Driver hooks ──────────────────────────────────────────────────────────────

export function useDrivers() {
  const { selectedStore } = useAuth();
  const storeId = selectedStore?.id;
  return useQuery<Driver[]>({
    queryKey: ["drivers", storeId],
    queryFn: () => apiClient.get<Driver[]>(`/drivers${storeId ? `?storeId=${storeId}` : ""}`),
    enabled: !!storeId,
  });
}

export function useCreateDriver() {
  const queryClient = useQueryClient();
  const { selectedStore, user } = useAuth();
  return useMutation({
    mutationFn: (input: DriverInput) => {
      if (!selectedStore?.id) throw new Error("Pilih toko terlebih dahulu");
      return apiClient.post<Driver>("/drivers", {
        driver_name: input.driver_name,
        phone_number: input.phone_number || null,
        store_id: selectedStore.id,
        created_by: user?.name || "System",
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["drivers"] }),
  });
}

export function useUpdateDriver() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: DriverInput & { id: string }) =>
      apiClient.put<Driver>(`/drivers/${id}`, {
        driver_name: input.driver_name,
        phone_number: input.phone_number || null,
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["drivers"] }),
  });
}

export function useDeleteDriver() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/drivers/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["drivers"] }),
  });
}
