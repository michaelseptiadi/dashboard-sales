import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import apiClient from "@/lib/apiClient";
import { useAuth } from "./useAuth";

export interface SimpleRow {
  id: string;
  name: string;
  created_at: string;
}

export type MasterTableName = "categories" | "units";

// Map MasterTableName to the direct backend route
const TABLE_PATH: Record<MasterTableName, string> = {
  categories: "/categories",
  units: "/units",
};

export interface Driver {
  id: string;
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
      apiClient.get<SimpleRow[]>(TABLE_PATH[table]),
  });
}

export function useCreateRow(table: MasterTableName) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (name: string) =>
      apiClient.post<SimpleRow>(TABLE_PATH[table], { name }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [table] }),
  });
}

export function useUpdateRow(table: MasterTableName) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      apiClient.put<SimpleRow>(`${TABLE_PATH[table]}/${id}`, { name }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [table] }),
  });
}

export function useDeleteRow(table: MasterTableName) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.delete(`${TABLE_PATH[table]}/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [table] }),
  });
}

// ── Driver hooks ──────────────────────────────────────────────────────────────

export function useDrivers() {
  const { selectedStore } = useAuth();
  const storeId = selectedStore?.id;
  return useQuery<Driver[]>({
    queryKey: ["drivers", storeId],
    queryFn: () => {
      const path = storeId ? `/drivers?storeId=${storeId}` : "/drivers";
      return apiClient.get<Driver[]>(path);
    },
  });
}

export function useCreateDriver() {
  const queryClient = useQueryClient();
  const { selectedStore, user } = useAuth();
  return useMutation({
    mutationFn: (input: DriverInput) => {
      if (!selectedStore?.id) {
        throw new Error("Silakan pilih toko terlebih dahulu");
      }
      if (!user) {
        throw new Error("User tidak terautentikasi");
      }
      return apiClient.post<Driver>("/drivers", {
        ...input,
        store_id: selectedStore.id,
        created_by: user.name || user.email || "Unknown User",
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["drivers"] }),
  });
}

export function useUpdateDriver() {
  const queryClient = useQueryClient();
  const { selectedStore } = useAuth();
  return useMutation({
    mutationFn: ({ id, ...input }: DriverInput & { id: string }) => {
      const payload: Partial<DriverInput & { store_id?: string }> = { ...input };
      if (selectedStore?.id) {
        payload.store_id = selectedStore.id;
      }
      return apiClient.put<Driver>(`/drivers/${id}`, payload);
    },
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
