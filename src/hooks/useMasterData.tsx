import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface SimpleRow {
  id: string;
  name: string;
  created_at: string;
}

export type MasterTableName = "categories" | "units";

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
    queryFn: async () => {
      const { data, error } = await supabase.from(table).select("*").order("name");
      if (error) throw error;
      return data as SimpleRow[];
    },
  });
}

export function useCreateRow(table: MasterTableName) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (name: string) => {
      const { data, error } = await supabase.from(table).insert({ name }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [table] }),
  });
}

export function useUpdateRow(table: MasterTableName) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const { data, error } = await supabase.from(table).update({ name }).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [table] }),
  });
}

export function useDeleteRow(table: MasterTableName) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from(table).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [table] }),
  });
}

// ── Driver hooks ──────────────────────────────────────────────────────────────

export function useDrivers() {
  return useQuery<Driver[]>({
    queryKey: ["drivers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("drivers")
        .select("*")
        .order("driver_name");
      if (error) throw error;
      return data as Driver[];
    },
  });
}

export function useCreateDriver() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: DriverInput) => {
      const { data, error } = await supabase.from("drivers").insert(input).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["drivers"] }),
  });
}

export function useUpdateDriver() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: DriverInput & { id: string }) => {
      const { data, error } = await supabase.from("drivers").update(input).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["drivers"] }),
  });
}

export function useDeleteDriver() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("drivers").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["drivers"] }),
  });
}
