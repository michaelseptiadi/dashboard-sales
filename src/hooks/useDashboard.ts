import { useQuery } from "@tanstack/react-query";
import apiClient from "@/lib/apiClient";
import { useAuth } from "@/hooks/useAuth";

export interface DashboardData {
  cards: {
    today_revenue: number;
    yesterday_revenue: number;
    revenue_change_percentage: number;
    month_revenue: number;
    month_target: number;
    month_percentage: number;
    today_transactions: number;
    today_avg_transaction: number;
    receivables_amount: number;
    debtor_count: number;
    total_capital: number;
    total_profit: number;
    today_capital: number;
    today_profit: number;
    profit_transactions: { id: string; invoice_number: string; sales_date: string; revenue: number; capital: number; profit: number }[];
  };
  sales_trend: { label: string; value: number }[];
  top_products: { name: string; qty: number; unit: string }[];
  top_customers: { name: string; total_spent: number; last_transaction: string; badge: 'Repeat' | 'Baru' }[];
  receivables: { name: string; total_debt: number; days_left: number; due_date: string | null; status: 'Terlambat' | 'Hampir Jatuh Tempo' | 'Aman' }[];
  low_stock_products: { id: string; name: string; product_code: string; current_stock: number; minimum_stock: number }[];
}

export function useDashboardStats(
  range: '7d' | '30d' | '12m' = '7d',
  metric: 'revenue' | 'orders' | 'profit' = 'revenue',
) {
  const { selectedStore } = useAuth();
  const storeId = selectedStore?.id;

  return useQuery<DashboardData>({
    queryKey: ["dashboard-data", storeId, range, metric],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (storeId) params.set("store_id", storeId);
      params.set("range", range);
      params.set("metric", metric);

      const response = await apiClient.get<DashboardData>(
        `/dashboard/store-data?${params.toString()}`,
      );
      return response;
    },
    enabled: true,
  });
}
