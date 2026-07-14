import { useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useDashboardStats } from "@/hooks/useDashboard";
import { Skeleton } from "@/components/ui/skeleton";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import {
  TrendingUp,
  TrendingDown,
  Calendar,
  ShoppingCart,
  Wallet,
  ArrowRight,
  AlertTriangle,
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/format";
import { useAuth } from "@/hooks/useAuth";
import { Navigate, Link } from "react-router-dom";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function Dashboard() {
  const [range, setRange] = useState<'7d' | '30d' | '12m'>('7d');
  const [metric, setMetric] = useState<'revenue' | 'orders'>('revenue');
  const { data, isLoading } = useDashboardStats(range, metric);
  const { currentRole, isSuperAdmin, selectedStore } = useAuth();

  if (currentRole === "cashier" && !isSuperAdmin) {
    return <Navigate to="/penjualan" replace />;
  }

  // Calculate max quantity for product progress bar
  const maxProductQty = data?.top_products?.length
    ? Math.max(...data.top_products.map((p) => p.qty))
    : 1;

  // Custom formatting for chart dot labels
  const formatChartVal = (val: number) => {
    if (metric === "orders") return val.toString();
    if (val >= 1000000) {
      return `${(val / 1000000).toFixed(1).replace(".", ",")} jt`;
    }
    if (val >= 1000) {
      return `${(val / 1000).toFixed(0)} rb`;
    }
    return val.toString();
  };

  // Date formatter for header
  const getTodayFormattedDate = () => {
    return new Date().toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  return (
    <DashboardLayout title="Dashboard">
      <div className="flex flex-col gap-6">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">TB. {selectedStore?.store_name || "Makmur Jaya"}</h1>
            <p className="text-sm text-muted-foreground">Ringkasan kondisi toko hari ini</p>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-center">
            <button className="flex items-center gap-2 rounded-lg border bg-card px-3.5 py-2 text-sm font-semibold shadow-sm hover:bg-accent hover:text-accent-foreground transition-all">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>{getTodayFormattedDate()}</span>
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {/* Card 1: Omzet Hari Ini */}
          <Card className="shadow-sm border-0 ring-1 ring-border/60 overflow-hidden relative">
            <CardContent className="pt-6 pb-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Omzet Hari Ini</p>
                  {isLoading ? (
                    <Skeleton className="h-9 w-36" />
                  ) : (
                    <p className="text-2xl font-bold tracking-tight">
                      {formatCurrency(data?.cards.today_revenue || 0)}
                    </p>
                  )}
                </div>
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400">
                  <TrendingUp className="h-5.5 w-5.5" />
                </div>
              </div>
              <div className="mt-4 flex items-center gap-1.5 text-xs">
                {isLoading ? (
                  <Skeleton className="h-4 w-40" />
                ) : (
                  <>
                    <span className={`flex items-center gap-0.5 font-bold ${
                      (data?.cards.revenue_change_percentage || 0) >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"
                    }`}>
                      {(data?.cards.revenue_change_percentage || 0) >= 0 ? "↑" : "↓"}{" "}
                      {Math.abs(data?.cards.revenue_change_percentage || 0).toFixed(1)}%
                    </span>
                    <span className="text-muted-foreground">
                      dibanding kemarin ({formatCurrency(data?.cards.yesterday_revenue || 0)})
                    </span>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Card 2: Omzet Bulan Berjalan */}
          <Card className="shadow-sm border-0 ring-1 ring-border/60 overflow-hidden relative">
            <CardContent className="pt-6 pb-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Omzet Bulan Berjalan</p>
                  {isLoading ? (
                    <Skeleton className="h-9 w-36" />
                  ) : (
                    <p className="text-2xl font-bold tracking-tight">
                      {formatCurrency(data?.cards.month_revenue || 0)}
                    </p>
                  )}
                </div>
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/20 dark:text-blue-400">
                  <Calendar className="h-5.5 w-5.5" />
                </div>
              </div>
              <div className="mt-4 space-y-1.5">
                <div className="flex items-center justify-between text-xs font-medium">
                  <span className="text-muted-foreground">Target {formatCurrency(data?.cards.month_target || 600000000)}</span>
                  <span className="text-blue-600 dark:text-blue-400 font-bold">{data?.cards.month_percentage || 0}%</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-blue-600 dark:bg-blue-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${data?.cards.month_percentage || 0}%` }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Card 3: Transaksi Hari Ini */}
          <Card className="shadow-sm border-0 ring-1 ring-border/60 overflow-hidden relative">
            <CardContent className="pt-6 pb-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Transaksi Hari Ini</p>
                  {isLoading ? (
                    <Skeleton className="h-9 w-16" />
                  ) : (
                    <p className="text-3xl font-black tracking-tight">
                      {data?.cards.today_transactions || 0}
                    </p>
                  )}
                </div>
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-50 text-violet-600 dark:bg-violet-950/20 dark:text-violet-400">
                  <ShoppingCart className="h-5.5 w-5.5" />
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between text-xs font-medium">
                <span className="text-muted-foreground">Rata-rata transaksi:</span>
                <span className="text-violet-600 dark:text-violet-400 font-bold">
                  {formatCurrency(data?.cards.today_avg_transaction || 0)}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Card 4: Total Piutang */}
          <Card className="shadow-sm border-0 ring-1 ring-border/60 overflow-hidden relative">
            <CardContent className="pt-6 pb-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Total Piutang</p>
                  {isLoading ? (
                    <Skeleton className="h-9 w-36" />
                  ) : (
                    <p className="text-2xl font-bold tracking-tight text-rose-600 dark:text-rose-400">
                      {formatCurrency(data?.cards.receivables_amount || 0)}
                    </p>
                  )}
                </div>
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-950/20 dark:text-rose-400">
                  <Wallet className="h-5.5 w-5.5" />
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between text-xs font-medium">
                <span className="text-muted-foreground font-bold">
                  {data?.cards.debtor_count || 0} Customer
                </span>
                <Link to="/pelanggan" className="text-rose-600 hover:text-rose-700 dark:text-rose-400 font-bold flex items-center gap-0.5 transition-all">
                  Lihat Detail <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sales Trend Chart */}
        <Card className="shadow-sm border-0 ring-1 ring-border/60">
          <CardHeader className="pb-3 pt-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/50">
            <div>
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                Grafik Tren Penjualan
              </CardTitle>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {/* Range Tabs */}
              <div className="inline-flex rounded-lg bg-slate-100 p-0.5 dark:bg-slate-800">
                {(['7d', '30d', '12m'] as const).map((r) => (
                  <button
                    key={r}
                    onClick={() => setRange(r)}
                    className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${
                      range === r
                        ? "bg-white text-slate-900 shadow-sm dark:bg-slate-950 dark:text-slate-50"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {r === '7d' ? '7 Hari' : r === '30d' ? '30 Hari' : '12 Bulan'}
                  </button>
                ))}
              </div>

              {/* Metric Select */}
              <Select value={metric} onValueChange={(val: 'revenue' | 'orders') => setMetric(val)}>
                <SelectTrigger className="w-[140px] h-9 text-xs font-semibold">
                  <SelectValue placeholder="Pilih Metrik" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="revenue">Omzet (Rp)</SelectItem>
                  <SelectItem value="orders">Transaksi</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            {isLoading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : (
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={data?.sales_trend || []}
                    margin={{ top: 20, right: 20, left: 0, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-slate-100 dark:stroke-slate-800" />
                    <XAxis
                      dataKey="label"
                      tickLine={false}
                      axisLine={false}
                      className="text-[11px] font-medium text-muted-foreground"
                    />
                    <YAxis
                      tickFormatter={formatYAxis}
                      tickLine={false}
                      axisLine={false}
                      className="text-[11px] font-medium text-muted-foreground"
                    />
                    <Tooltip
                      formatter={(val: number) => [
                        metric === 'revenue' ? formatCurrency(val) : `${val} transaksi`,
                        metric === 'revenue' ? "Omzet" : "Total Transaksi"
                      ]}
                      contentStyle={{
                        borderRadius: "8px",
                        border: "0",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke="hsl(221, 83%, 53%)"
                      strokeWidth={3}
                      dot={{ r: 4, strokeWidth: 2, fill: "#fff" }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Lower Tables Section */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Card: Top 10 Best Selling Products */}
          <Card className="shadow-sm border-0 ring-1 ring-border/60 flex flex-col justify-between">
            <div>
              <CardHeader className="pb-3 pt-5 border-b border-border/50">
                <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                  Top 10 Produk Terlaris
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-2">
                {isLoading ? (
                  <div className="space-y-3 pt-4">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Skeleton key={i} className="h-10 w-full" />
                    ))}
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="w-12 text-xs font-bold uppercase text-muted-foreground">No.</TableHead>
                        <TableHead className="text-xs font-bold uppercase text-muted-foreground">Produk</TableHead>
                        <TableHead className="w-[180px] text-xs font-bold uppercase text-muted-foreground"></TableHead>
                        <TableHead className="text-right text-xs font-bold uppercase text-muted-foreground">Terjual (Qty)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data?.top_products?.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                            Belum ada data penjualan
                          </TableCell>
                        </TableRow>
                      ) : (
                        data?.top_products?.map((p, idx) => (
                          <TableRow key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                            <TableCell className="font-semibold text-sm text-muted-foreground">{idx + 1}</TableCell>
                            <TableCell className="font-semibold text-sm">{p.name}</TableCell>
                            <TableCell className="py-2">
                              <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 max-w-[150px] overflow-hidden">
                                <div
                                  className="bg-blue-600 h-full rounded-full transition-all"
                                  style={{ width: `${(p.qty / maxProductQty) * 100}%` }}
                                />
                              </div>
                            </TableCell>
                            <TableCell className="text-right font-bold text-sm tabular-nums">
                              {p.qty} <span className="text-xs font-normal text-muted-foreground">{p.unit}</span>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </div>
            <div className="p-4 border-t border-border/50 text-center">
              <Link to="/produk" className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400 transition-all">
                Lihat semua produk <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </Card>

          {/* Card: Top Customers */}
          <Card className="shadow-sm border-0 ring-1 ring-border/60 flex flex-col justify-between">
            <div>
              <CardHeader className="pb-3 pt-5 border-b border-border/50">
                <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                  Top Customer
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-2">
                {isLoading ? (
                  <div className="space-y-3 pt-4">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Skeleton key={i} className="h-10 w-full" />
                    ))}
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="w-12 text-xs font-bold uppercase text-muted-foreground">No.</TableHead>
                        <TableHead className="text-xs font-bold uppercase text-muted-foreground">Customer</TableHead>
                        <TableHead className="text-right text-xs font-bold uppercase text-muted-foreground">Total Belanja</TableHead>
                        <TableHead className="text-right text-xs font-bold uppercase text-muted-foreground">Terakhir Transaksi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data?.top_customers?.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                            Belum ada data pelanggan
                          </TableCell>
                        </TableRow>
                      ) : (
                        data?.top_customers?.map((c, idx) => (
                          <TableRow key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                            <TableCell className="font-semibold text-sm text-muted-foreground">{idx + 1}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-sm">{c.name}</span>
                                <Badge
                                  variant="outline"
                                  className={
                                    c.badge === "Repeat"
                                      ? "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-400"
                                      : "border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-950/30 dark:text-green-400"
                                  }
                                >
                                  {c.badge}
                                </Badge>
                              </div>
                            </TableCell>
                            <TableCell className="text-right font-bold text-sm tabular-nums">
                              {formatCurrency(c.total_spent)}
                            </TableCell>
                            <TableCell className="text-right text-xs text-muted-foreground tabular-nums">
                              {formatDate(c.last_transaction)}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </div>
            <div className="p-4 border-t border-border/50 text-center">
              <Link to="/pelanggan" className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400 transition-all">
                Lihat semua customer <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </Card>
        </div>

        {/* Lower Double Grid - Low Stock & Hutang Customer */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Card: Low Stock Products */}
          <Card className="shadow-sm border-0 ring-1 ring-border/60 flex flex-col justify-between">
            <div>
              <CardHeader className="pb-3 pt-5 border-b border-border/50 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                  Produk Stok Rendah
                </CardTitle>
                {!isLoading && data && data.low_stock_products.length > 0 && (
                  <Badge variant="destructive" className="flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    {data.low_stock_products.length} Varian
                  </Badge>
                )}
              </CardHeader>
              <CardContent className="pt-2">
                {isLoading ? (
                  <div className="space-y-3 pt-4">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Skeleton key={i} className="h-10 w-full" />
                    ))}
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="text-xs font-bold uppercase text-muted-foreground">Produk</TableHead>
                        <TableHead className="text-right text-xs font-bold uppercase text-muted-foreground">Stok</TableHead>
                        <TableHead className="text-right text-xs font-bold uppercase text-muted-foreground">Min. Stok</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data?.low_stock_products?.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={3} className="text-center py-8 text-emerald-600 dark:text-emerald-400 font-medium">
                            Semua stok varian aman!
                          </TableCell>
                        </TableRow>
                      ) : (
                        data?.low_stock_products?.map((p) => (
                          <TableRow key={p.id} className="hover:bg-red-50/20 dark:hover:bg-red-950/5">
                            <TableCell>
                              <div className="font-semibold text-sm text-red-900 dark:text-red-300">{p.name}</div>
                              <div className="text-xs text-muted-foreground font-mono">{p.product_code}</div>
                            </TableCell>
                            <TableCell className="text-right">
                              <Badge
                                variant={p.current_stock <= 0 ? "destructive" : "outline"}
                                className={p.current_stock > 0 ? "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/20 dark:text-amber-400 font-bold" : "font-bold"}
                              >
                                {p.current_stock}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right text-sm font-semibold text-muted-foreground tabular-nums">
                              {p.minimum_stock}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </div>
            <div className="p-4 border-t border-border/50 text-center">
              <Link to="/produk" className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400 transition-all">
                Kelola Stok Produk <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </Card>

          {/* Card: Customer Receivables / Outstanding Debt */}
          <Card className="shadow-sm border-0 ring-1 ring-border/60 flex flex-col justify-between">
            <div>
              <CardHeader className="pb-3 pt-5 border-b border-border/50">
                <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                  Hutang Customer (Piutang)
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-2">
                {isLoading ? (
                  <div className="space-y-3 pt-4">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Skeleton key={i} className="h-10 w-full" />
                    ))}
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="text-xs font-bold uppercase text-muted-foreground">Customer</TableHead>
                        <TableHead className="text-right text-xs font-bold uppercase text-muted-foreground">Total Hutang</TableHead>
                        <TableHead className="text-right text-xs font-bold uppercase text-muted-foreground">Jatuh Tempo</TableHead>
                        <TableHead className="text-center text-xs font-bold uppercase text-muted-foreground">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data?.receivables?.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-8 text-emerald-600 dark:text-emerald-400 font-medium">
                            Tidak ada piutang customer aktif
                          </TableCell>
                        </TableRow>
                      ) : (
                        data?.receivables?.map((r, idx) => (
                          <TableRow key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                            <TableCell className="font-semibold text-sm">{r.name}</TableCell>
                            <TableCell className="text-right font-bold text-sm text-rose-600 dark:text-rose-400 tabular-nums">
                              {formatCurrency(r.total_debt)}
                            </TableCell>
                            <TableCell className="text-right text-xs font-medium tabular-nums text-muted-foreground">
                              {r.days_left < 0
                                ? `Terlewat ${Math.abs(r.days_left)} hari`
                                : r.days_left === 0
                                ? "Hari ini"
                                : `${r.days_left} hari lagi`}
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge
                                variant={r.status === "Terlambat" ? "destructive" : "outline"}
                                className={
                                  r.status === "Hampir Jatuh Tempo"
                                    ? "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/20 dark:text-amber-400"
                                    : r.status === "Aman"
                                    ? "border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-950/20 dark:text-green-400"
                                    : ""
                                }
                              >
                                {r.status}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </div>
            <div className="p-4 border-t border-border/50 text-center">
              <Link to="/piutang-pembayaran" className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400 transition-all">
                Kelola Piutang Toko <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}

// Chart Y-Axis tick label formatter helper
function formatYAxis(value: number) {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(0)} jt`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(0)} rb`;
  }
  return value.toString();
}
