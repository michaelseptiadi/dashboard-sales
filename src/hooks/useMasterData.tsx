import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import apiClient from "@/lib/apiClient";

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
  driver_name: string;
  phone_number: string | null;
  address: string | null;
  created_at: string;
}

export interface DriverInput {
  driver_name: string;
  phone_number?: string | null;
  address?: string | null;
}

export function useSimpleTable(table: MasterTableName) {
  return useQuery<SimpleRow[]>({
    queryKey: [table],
    queryFn: () =>
      apiClient.get<SimpleRow[]>(`/master-data/${TABLE_PATH[table]}`),
  });
}

export function useCreateRow(table: MasterTableName) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (name: string) =>
      apiClient.post<SimpleRow>(`/master-data/${TABLE_PATH[table]}`, { name }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [table] }),
  });
}

export function useUpdateRow(table: MasterTableName) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      apiClient.put<SimpleRow>(`/master-data/${TABLE_PATH[table]}/${id}`, { name }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [table] }),
  });
}

export function useDeleteRow(table: MasterTableName) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.delete(`/master-data/${TABLE_PATH[table]}/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [table] }),
  });
}

// ── Driver hooks ──────────────────────────────────────────────────────────────

export function useDrivers() {
  return useQuery<Driver[]>({
    queryKey: ["drivers"],
    queryFn: () => apiClient.get<Driver[]>("/drivers"),
  });
}

export function useCreateDriver() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: DriverInput) =>
      apiClient.post<Driver>("/drivers", input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["drivers"] }),
  });
}

export function useUpdateDriver() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: DriverInput & { id: string }) =>
      apiClient.put<Driver>(`/drivers/${id}`, input),
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
