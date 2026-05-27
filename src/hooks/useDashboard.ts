import { useQuery } from "@tanstack/react-query";
import apiClient from "@/lib/apiClient";
import { useAuth } from "@/hooks/useAuth";

interface DashboardSummary {
  total_orders: number;
  total_revenue: number;
  total_unpaid: number;
  total_deliveries: number;
  pending_deliveries: number;
}

export function useDashboardStats() {
  const { selectedStore } = useAuth();
  const storeId = selectedStore?.id;

  return useQuery({
    queryKey: ["dashboard", storeId],
    queryFn: async () => {
      const today = new Date().toISOString().split("T")[0];
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
      const startDate = sevenDaysAgo.toISOString().split("T")[0];

      const params = new URLSearchParams();
      if (storeId) params.set("store_id", storeId);
      params.set("start_date", startDate);
      params.set("end_date", today);

      const summary = await apiClient.get<DashboardSummary>(
        `/dashboard/summary?${params.toString()}`,
      );

      // Build 7-day chart data placeholder (backend doesn't return daily breakdown)
      const chartData: { date: string; total: number }[] = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        chartData.push({ date: d.toISOString().split("T")[0], total: 0 });
      }

      // Today's stats from a today-only summary call
      const todayParams = new URLSearchParams();
      if (storeId) todayParams.set("store_id", storeId);
      todayParams.set("start_date", today);
      todayParams.set("end_date", today);
      const todaySummary = await apiClient.get<DashboardSummary>(
        `/dashboard/summary?${todayParams.toString()}`,
      );

      return {
        totalSalesToday: todaySummary.total_revenue,
        totalTransactionsToday: todaySummary.total_orders,
        // TODO: topProducts and lowStockProducts require dedicated backend endpoints
        topProducts: [] as { id: string; name: string; code: string; totalQty: number }[],
        lowStockProducts: [] as { id: string; name: string; product_code: string; minimum_stock: number; current_stock: number }[],
        chartData,
        summary,
      };
    },
  });
}
