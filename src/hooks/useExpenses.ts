import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import apiClient from "@/lib/apiClient";
import { useAuth } from "@/hooks/useAuth";

export interface ExpenseCategory { id: string; name: string; is_active: boolean; }
export interface Expense { id: string; expense_date: string; amount: number | string; payment_method: string; description?: string | null; reference_no?: string | null; status: "POSTED" | "VOID"; category: ExpenseCategory; }
export interface ExpenseInput { category_id: string; expense_date: string; amount: number; payment_method: string; description?: string; reference_no?: string; }

export function useExpenseCategories() {
  return useQuery<ExpenseCategory[]>({ queryKey: ["expense-categories"], queryFn: () => apiClient.get("/expenses/categories") });
}
export function useExpenses(filters?: { start_date?: string; end_date?: string; status?: string }) {
  const { selectedStore } = useAuth();
  const params = new URLSearchParams();
  if (filters?.start_date) params.set("start_date", filters.start_date);
  if (filters?.end_date) params.set("end_date", filters.end_date);
  if (filters?.status) params.set("status", filters.status);
  return useQuery<Expense[]>({ queryKey: ["expenses", selectedStore?.id, filters], queryFn: () => apiClient.get(`/expenses?${params}`), enabled: !!selectedStore?.id });
}
export function useCreateExpense() {
  const qc = useQueryClient();
  const { selectedStore } = useAuth();
  return useMutation({ mutationFn: (input: ExpenseInput) => {
    if (!selectedStore?.id) throw new Error("Silakan pilih toko terlebih dahulu");
    return apiClient.post<Expense>("/expenses", { ...input, store_id: selectedStore.id });
  }, onSuccess: () => { qc.invalidateQueries({ queryKey: ["expenses"] }); qc.invalidateQueries({ queryKey: ["dashboard-data"] }); } });
}
export function useVoidExpense() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: ({ id, reason }: { id: string; reason: string }) => apiClient.post<Expense>(`/expenses/${id}/void`, { reason }), onSuccess: () => { qc.invalidateQueries({ queryKey: ["expenses"] }); qc.invalidateQueries({ queryKey: ["dashboard-data"] }); } });
}
