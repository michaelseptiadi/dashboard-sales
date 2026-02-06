import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useSalesOrders(dateFrom?: string, dateTo?: string, search?: string) {
  return useQuery({
    queryKey: ["sales-orders", dateFrom, dateTo, search],
    queryFn: async () => {
      let query = supabase
        .from("sales_orders")
        .select("*, payment_methods(name)")
        .order("created_at", { ascending: false });

      if (dateFrom) {
        query = query.gte("sales_date", dateFrom);
      }
      if (dateTo) {
        query = query.lte("sales_date", dateTo);
      }
      if (search) {
        query = query.ilike("invoice_number", `%${search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

export function useSalesDetail(orderId: string | null) {
  return useQuery({
    queryKey: ["sales-detail", orderId],
    enabled: !!orderId,
    queryFn: async () => {
      const { data: order, error: orderError } = await supabase
        .from("sales_orders")
        .select("*, payment_methods(name)")
        .eq("id", orderId!)
        .maybeSingle();
      if (orderError) throw orderError;

      const { data: items, error: itemsError } = await supabase
        .from("sales_items")
        .select("*, products(name, product_code)")
        .eq("sales_order_id", orderId!);
      if (itemsError) throw itemsError;

      return { order, items };
    },
  });
}

export function usePaymentMethods() {
  return useQuery({
    queryKey: ["payment-methods"],
    queryFn: async () => {
      const { data, error } = await supabase.from("payment_methods").select("*").order("name");
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateSalesTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      p_invoice_number: string;
      p_sales_date: string;
      p_customer_id?: string;
      p_customer_name?: string;
      p_customer_phone?: string;
      p_customer_address?: string;
      p_payment_method_id?: string;
      p_shipping_method?: string;
      p_sales_channel?: string;
      p_notes?: string;
      p_items: Array<{
        product_id: string;
        qty: number;
        price: number;
        discount: number;
      }>;
    }) => {
      const { data, error } = await supabase.rpc("create_sales_transaction", {
        ...params,
        p_items: JSON.parse(JSON.stringify(params.p_items)),
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales-orders"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useDashboardStats() {
  return useQuery({
    queryKey: ["dashboard"],
    queryFn: async () => {
      const today = new Date().toISOString().split("T")[0];

      // Today's sales
      const { data: todaySales, error: e1 } = await supabase
        .from("sales_orders")
        .select("grand_total")
        .eq("sales_date", today);
      if (e1) throw e1;

      const totalSalesToday = todaySales?.reduce((sum, s) => sum + (s.grand_total || 0), 0) || 0;
      const totalTransactionsToday = todaySales?.length || 0;

      // Top products (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const { data: salesItems, error: e2 } = await supabase
        .from("sales_items")
        .select("product_id, qty, products(name, product_code)");
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
      const { data: products, error: e3 } = await supabase
        .from("products")
        .select("id, name, product_code, minimum_stock, is_active")
        .eq("is_active", true);
      if (e3) throw e3;

      const { data: movements, error: e4 } = await supabase
        .from("inventory_movements")
        .select("product_id, qty_in, qty_out");
      if (e4) throw e4;

      const stockMap: Record<string, number> = {};
      movements?.forEach((m) => {
        if (!stockMap[m.product_id]) stockMap[m.product_id] = 0;
        stockMap[m.product_id] += (m.qty_in || 0) - (m.qty_out || 0);
      });

      const lowStockProducts = (products || [])
        .map((p) => ({
          ...p,
          current_stock: stockMap[p.id] || 0,
        }))
        .filter((p) => p.current_stock <= p.minimum_stock)
        .sort((a, b) => a.current_stock - b.current_stock)
        .slice(0, 10);

      // Sales chart data (last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const { data: chartOrders, error: e5 } = await supabase
        .from("sales_orders")
        .select("sales_date, grand_total")
        .gte("sales_date", sevenDaysAgo.toISOString().split("T")[0])
        .order("sales_date");
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

      const chartData = Object.entries(chartDataMap).map(([date, total]) => ({
        date,
        total,
      }));

      return {
        totalSalesToday,
        totalTransactionsToday,
        topProducts,
        lowStockProducts,
        chartData,
      };
    },
  });
}
