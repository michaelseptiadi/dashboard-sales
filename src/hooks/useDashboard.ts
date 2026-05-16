import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export function useDashboardStats() {
  const { selectedStore } = useAuth();
  const storeId = selectedStore?.id;
  return useQuery({
    queryKey: ["dashboard", storeId],
    queryFn: async () => {
      const today = new Date().toISOString().split("T")[0];

      // Today's sales
      let todaySalesQuery = supabase
        .from("sales_orders")
        .select("grand_total")
        .eq("sales_date", today);
      if (storeId) todaySalesQuery = todaySalesQuery.eq("store_id", storeId);
      const { data: todaySales, error: e1 } = await todaySalesQuery;
      if (e1) throw e1;

      const totalSalesToday = todaySales?.reduce((sum, s) => sum + (s.grand_total || 0), 0) || 0;
      const totalTransactionsToday = todaySales?.length || 0;

      // Top products (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      let salesItemsQuery = supabase
        .from("sales_items")
        .select("product_id, qty, products(name, product_code), sales_orders!inner(store_id, sales_date)");
      if (storeId) {
        salesItemsQuery = salesItemsQuery.eq("sales_orders.store_id", storeId);
      }
      salesItemsQuery = salesItemsQuery.gte(
        "sales_orders.sales_date",
        thirtyDaysAgo.toISOString().split("T")[0],
      );
      const { data: salesItems, error: e2 } = await salesItemsQuery;
      if (e2) throw e2;

      const productSalesMap: Record<string, { name: string; code: string; totalQty: number }> = {};
      salesItems?.forEach((item) => {
        const pid = item.product_id;
        if (!productSalesMap[pid]) {
          productSalesMap[pid] = {
            name: (item.products as any)?.name || "",
            code: (item.products as any)?.product_code || "",
            totalQty: 0,
          };
        }
        productSalesMap[pid].totalQty += item.qty || 0;
      });

      const topProducts = Object.entries(productSalesMap)
        .map(([id, data]) => ({ id, ...data }))
        .sort((a, b) => b.totalQty - a.totalQty)
        .slice(0, 10);

      // Low stock products
      let productsQuery = supabase
        .from("products")
        .select("id, name, product_code, minimum_stock, is_active")
        .eq("is_active", true);
      if (storeId) productsQuery = productsQuery.eq("store_id", storeId);
      const { data: products, error: e3 } = await productsQuery;
      if (e3) throw e3;

      let movementsQuery = supabase
        .from("inventory_movements")
        .select("product_id, qty_in, qty_out");
      if (storeId) movementsQuery = movementsQuery.eq("store_id", storeId);
      const { data: movements, error: e4 } = await movementsQuery;
      if (e4) throw e4;

      const stockMap: Record<string, number> = {};
      movements?.forEach((m) => {
        if (!stockMap[m.product_id]) stockMap[m.product_id] = 0;
        stockMap[m.product_id] += (m.qty_in || 0) - (m.qty_out || 0);
      });

      const lowStockProducts = (products || [])
        .map((p) => ({ ...p, current_stock: stockMap[p.id] || 0 }))
        .filter((p) => p.current_stock <= p.minimum_stock)
        .sort((a, b) => a.current_stock - b.current_stock)
        .slice(0, 10);

      // Sales chart data (last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      let chartQuery = supabase
        .from("sales_orders")
        .select("sales_date, grand_total")
        .gte("sales_date", sevenDaysAgo.toISOString().split("T")[0])
        .order("sales_date");
      if (storeId) chartQuery = chartQuery.eq("store_id", storeId);
      const { data: chartOrders, error: e5 } = await chartQuery;
      if (e5) throw e5;

      const chartDataMap: Record<string, number> = {};
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        chartDataMap[d.toISOString().split("T")[0]] = 0;
      }
      chartOrders?.forEach((o) => {
        if (chartDataMap[o.sales_date] !== undefined) {
          chartDataMap[o.sales_date] += o.grand_total || 0;
        }
      });

      const chartData = Object.entries(chartDataMap).map(([date, total]) => ({ date, total }));

      return { totalSalesToday, totalTransactionsToday, topProducts, lowStockProducts, chartData };
    },
  });
}
