import { useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useDashboardStats } from "@/hooks/useDashboard";
import { Skeleton } from "@/components/ui/skeleton";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import {
  TrendingUp,
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

function CustomTooltip({ active, payload, label, metric }: any) {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-xl border border-border/80 bg-background/95 px-3 py-2 shadow-xl backdrop-blur-md">
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{label}</p>
        <div className="mt-1 flex items-center gap-2">
          <div className="h-2.5 w-2.5 rounded-full bg-gradient-to-tr from-cyan-400 via-blue-500 to-fuchsia-500 shadow-xs" />
          <span className="text-sm font-extrabold text-foreground">
            {metric === 'revenue' 
              ? formatCurrency(payload[0].value) 
              : `${payload[0].value} transaksi`}
          </span>
        </div>
      </div>
    );
  }
  return null;
}

export default function Index() {
  const [range, setRange] = useState<'7d' | '30d' | '12m'>('7d');
  const [metric, setMetric] = useState<'revenue' | 'orders'>('revenue');
  const [ranking, setRanking] = useState<'products' | 'customers'>('products');
  const [attention, setAttention] = useState<'stock' | 'receivables'>('stock');
  const { data, isLoading } = useDashboardStats(range, metric);
  const { currentRole, isSuperAdmin, selectedStore } = useAuth();

  if (currentRole === "cashier" && !isSuperAdmin) {
    return <Navigate to="/penjualan" replace />;
  }

  // Calculate max quantity for product progress bar
  const maxProductQty = data?.top_products?.length
    ? Math.max(...data.top_products.map((p) => p.qty))
    : 1;

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
      <div className="flex flex-col gap-5 md:gap-6">
        {/* Header Section */}
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="mb-1 text-xs font-bold uppercase tracking-[0.16em] text-primary">Ringkasan hari ini</p>
            <h1 className="text-2xl font-extrabold tracking-tight md:text-2xl">TB. {selectedStore?.store_name || "Makmur Jaya"}</h1>
            <p className="mt-1 text-sm text-muted-foreground">Pantau hal penting tanpa mencari-cari.</p>
          </div>
          <div className="hidden items-center gap-2 sm:flex">
            <div className="flex items-center gap-2 rounded-full border bg-card px-3.5 py-2 text-sm font-semibold shadow-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>{getTodayFormattedDate()}</span>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-2 md:gap-4 lg:grid-cols-4">
          {/* Card 1: Omzet Hari Ini */}
          <Card className="relative col-span-2 overflow-hidden border-0 bg-gradient-to-br from-primary to-blue-700 text-primary-foreground shadow-lg shadow-primary/15 ring-0 lg:col-span-1">
            <CardContent className="pb-5 pt-5 md:pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-primary-foreground/70">Omzet Hari Ini</p>
                  {isLoading ? (
                    <Skeleton className="h-9 w-36" />
                  ) : (
                    <p className="text-2xl font-bold tracking-tight">
                      {formatCurrency(data?.cards.today_revenue || 0)}
                    </p>
                  )}
                </div>
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15 text-white">
                  <TrendingUp className="h-5.5 w-5.5" />
                </div>
              </div>
              <div className="mt-4 flex items-center gap-1.5 text-xs">
                {isLoading ? (
                  <Skeleton className="h-4 w-40" />
                ) : (
                  <>
                    <span className="flex items-center gap-0.5 font-bold text-white">
                      {(data?.cards.revenue_change_percentage || 0) >= 0 ? "↑" : "↓"}{" "}
                      {Math.abs(data?.cards.revenue_change_percentage || 0).toFixed(1)}%
                    </span>
                    <span className="text-primary-foreground/70">
                      dibanding kemarin ({formatCurrency(data?.cards.yesterday_revenue || 0)})
                    </span>
                  </>
                )}
              </div>
              <div className="mt-4 border-t border-white/15 pt-4 md:hidden">
                <div className="mb-2 flex items-center justify-between text-xs">
                  <span className="text-primary-foreground/70">Bulan ini {formatCurrency(data?.cards.month_revenue || 0)}</span>
                  <span className="font-bold">{data?.cards.month_percentage || 0}% target</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-white/20">
                  <div className="h-full rounded-full bg-white transition-all" style={{ width: `${Math.min(data?.cards.month_percentage || 0, 100)}%` }} />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Card 2: Omzet Bulan Berjalan */}
          <Card className="relative hidden overflow-hidden border-0 shadow-sm ring-1 ring-border/60 md:block">
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
          <Card className="relative overflow-hidden border-0 shadow-sm ring-1 ring-border/60">
            <CardContent className="p-4 md:pb-5 md:pt-6">
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
                <div className="hidden h-11 w-11 items-center justify-center rounded-xl bg-violet-50 text-violet-600 dark:bg-violet-950/20 dark:text-violet-400 md:flex">
                  <ShoppingCart className="h-5.5 w-5.5" />
                </div>
              </div>
              <div className="mt-3 flex flex-col gap-1 text-xs font-medium md:mt-4 md:flex-row md:items-center md:justify-between">
                <span className="text-muted-foreground">Rata-rata</span>
                <span className="text-violet-600 dark:text-violet-400 font-bold">
                  {formatCurrency(data?.cards.today_avg_transaction || 0)}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Card 4: Total Piutang */}
          <Card className="relative overflow-hidden border-0 shadow-sm ring-1 ring-border/60">
            <CardContent className="p-4 md:pb-5 md:pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Total Piutang</p>
                  {isLoading ? (
                    <Skeleton className="h-9 w-36" />
                  ) : (
                    <p className="text-lg font-bold tracking-tight text-rose-600 dark:text-rose-400 sm:text-2xl">
                      {formatCurrency(data?.cards.receivables_amount || 0)}
                    </p>
                  )}
                </div>
                <div className="hidden h-11 w-11 items-center justify-center rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-950/20 dark:text-rose-400 md:flex">
                  <Wallet className="h-5.5 w-5.5" />
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between text-xs font-medium md:mt-4">
                <span className="font-bold text-muted-foreground">
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
        <Card className="rounded-2xl border border-border/60 bg-card shadow-sm overflow-hidden min-w-0">
          <CardHeader className="flex flex-col gap-3 pb-2 pt-4 px-4 sm:px-6 sm:flex-row sm:items-center sm:justify-between border-b border-border/40">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary shrink-0">
                <TrendingUp className="h-4 w-4" />
              </div>
              <CardTitle className="text-base font-bold text-foreground">
                Tren Penjualan
              </CardTitle>
            </div>

            <div className="flex flex-wrap items-center justify-between sm:justify-end gap-2">
              {/* Range Tabs */}
              <div className="inline-flex rounded-xl bg-muted/60 p-1 border border-border/40">
                {(['7d', '30d', '12m'] as const).map((r) => (
                  <button
                    key={r}
                    onClick={() => setRange(r)}
                    className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
                      range === r
                        ? "bg-background text-foreground shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {r === '7d' ? '7 Hari' : r === '30d' ? '30 Hari' : '1 Tahun'}
                  </button>
                ))}
              </div>

              {/* Metric Select */}
              <Select value={metric} onValueChange={(val: 'revenue' | 'orders') => setMetric(val)}>
                <SelectTrigger className="w-[125px] h-8 text-xs font-semibold rounded-xl border-border/50">
                  <SelectValue placeholder="Pilih Metrik" />
                </SelectTrigger>
                <SelectContent align="end" className="rounded-xl">
                  <SelectItem value="revenue">Omzet (Rp)</SelectItem>
                  <SelectItem value="orders">Transaksi</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="p-2 sm:p-4 pt-4 sm:pt-6">
            {isLoading ? (
              <Skeleton className="h-[220px] md:h-[300px] w-full rounded-xl" />
            ) : (
              <div className="h-[220px] w-full sm:h-[260px] md:h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={data?.sales_trend || []}
                    margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="vibrantGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.42} />
                        <stop offset="35%" stopColor="#3b82f6" stopOpacity={0.25} />
                        <stop offset="70%" stopColor="#06b6d4" stopOpacity={0.10} />
                        <stop offset="100%" stopColor="#06b6d4" stopOpacity={0.0} />
                      </linearGradient>
                      <linearGradient id="vibrantStroke" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#06b6d4" />
                        <stop offset="30%" stopColor="#3b82f6" />
                        <stop offset="65%" stopColor="#8b5cf6" />
                        <stop offset="100%" stopColor="#ec4899" />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" strokeOpacity={0.5} />
                    <XAxis
                      dataKey="label"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      interval={range === '30d' ? 4 : range === '12m' ? 1 : 0}
                      tickFormatter={(val: string) => {
                        if (range === '30d') return val.split(' ')[0];
                        if (range === '12m') return val.split(' ')[0];
                        return val;
                      }}
                      className="text-[10px] font-medium fill-muted-foreground"
                    />
                    <YAxis
                      tickFormatter={(val: number) => {
                        if (metric === 'revenue') {
                          if (val >= 1000000) return `${(val / 1000000).toFixed(val % 1000000 === 0 ? 0 : 1)}jt`;
                          if (val >= 1000) return `${(val / 1000).toFixed(0)}rb`;
                          return `${val}`;
                        }
                        return val.toString();
                      }}
                      tickLine={false}
                      axisLine={false}
                      tickMargin={4}
                      className="text-[10px] font-medium fill-muted-foreground"
                    />
                    <Tooltip content={<CustomTooltip metric={metric} />} cursor={{ stroke: '#8b5cf6', strokeWidth: 1.5, strokeDasharray: '4 4', opacity: 0.4 }} />
                    <Area
                      type="monotone"
                      dataKey="value"
                      stroke="url(#vibrantStroke)"
                      strokeWidth={3}
                      fillOpacity={1}
                      fill="url(#vibrantGradient)"
                      activeDot={{ r: 6, strokeWidth: 2.5, stroke: "#ffffff", fill: "#ec4899" }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Mobile summaries replace wide tables below md. */}
        <div className="space-y-4 md:hidden">
          <Card className="overflow-hidden border-0 shadow-sm ring-1 ring-border/60">
            <div className="flex border-b p-1.5">
              <button type="button" onClick={() => setRanking('products')} className={`min-h-11 flex-1 rounded-xl text-sm font-bold transition active:scale-[0.98] ${ranking === 'products' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground'}`}>Produk terlaris</button>
              <button type="button" onClick={() => setRanking('customers')} className={`min-h-11 flex-1 rounded-xl text-sm font-bold transition active:scale-[0.98] ${ranking === 'customers' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground'}`}>Pelanggan</button>
            </div>
            <CardContent className="p-0">
              {isLoading ? <MobileListSkeleton /> : ranking === 'products' ? (
                data?.top_products?.length ? data.top_products.slice(0, 5).map((product, index) => (
                  <div key={`${product.name}-${index}`} className="flex min-h-16 items-center gap-3 border-b px-4 py-3 last:border-0">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-extrabold text-primary">{index + 1}</span>
                    <div className="min-w-0 flex-1"><p className="truncate text-sm font-bold">{product.name}</p><div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${(product.qty / maxProductQty) * 100}%` }} /></div></div>
                    <p className="shrink-0 text-sm font-extrabold tabular-nums">{product.qty} <span className="text-xs font-medium text-muted-foreground">{product.unit}</span></p>
                  </div>
                )) : <EmptyMobileList text="Belum ada data penjualan" />
              ) : data?.top_customers?.length ? data.top_customers.slice(0, 5).map((customer, index) => (
                <div key={`${customer.name}-${index}`} className="flex min-h-16 items-center gap-3 border-b px-4 py-3 last:border-0">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-extrabold text-primary">{index + 1}</span>
                  <div className="min-w-0 flex-1"><p className="truncate text-sm font-bold">{customer.name}</p><p className="text-xs text-muted-foreground">Terakhir {formatDate(customer.last_transaction)}</p></div>
                  <p className="shrink-0 text-sm font-extrabold tabular-nums">{formatCurrency(customer.total_spent)}</p>
                </div>
              )) : <EmptyMobileList text="Belum ada data pelanggan" />}
            </CardContent>
            <Link to={ranking === 'products' ? '/produk' : '/pelanggan'} className="flex min-h-12 items-center justify-center gap-1 border-t text-xs font-bold text-primary">Lihat semua <ArrowRight className="h-3.5 w-3.5" /></Link>
          </Card>

          <Card className="overflow-hidden border-0 shadow-sm ring-1 ring-border/60">
            <div className="flex border-b p-1.5">
              <button type="button" onClick={() => setAttention('stock')} className={`min-h-11 flex-1 rounded-xl text-sm font-bold transition active:scale-[0.98] ${attention === 'stock' ? 'bg-amber-100 text-amber-900' : 'text-muted-foreground'}`}>Stok rendah</button>
              <button type="button" onClick={() => setAttention('receivables')} className={`min-h-11 flex-1 rounded-xl text-sm font-bold transition active:scale-[0.98] ${attention === 'receivables' ? 'bg-rose-100 text-rose-900' : 'text-muted-foreground'}`}>Piutang</button>
            </div>
            <CardContent className="p-0">
              {isLoading ? <MobileListSkeleton /> : attention === 'stock' ? (
                data?.low_stock_products?.length ? data.low_stock_products.slice(0, 5).map((product) => (
                  <div key={product.id} className="flex min-h-16 items-center justify-between gap-3 border-b px-4 py-3 last:border-0">
                    <div className="min-w-0"><p className="truncate text-sm font-bold">{product.name}</p><p className="font-mono text-xs text-muted-foreground">{product.product_code}</p></div>
                    <div className="text-right"><p className="text-sm font-extrabold text-amber-700">{product.current_stock}</p><p className="text-[10px] text-muted-foreground">min. {product.minimum_stock}</p></div>
                  </div>
                )) : <EmptyMobileList text="Semua stok varian aman" />
              ) : data?.receivables?.length ? data.receivables.slice(0, 5).map((receivable, index) => (
                <div key={`${receivable.name}-${index}`} className="flex min-h-16 items-center justify-between gap-3 border-b px-4 py-3 last:border-0">
                  <div className="min-w-0"><p className="truncate text-sm font-bold">{receivable.name}</p><p className="text-xs text-muted-foreground">{receivable.days_left < 0 ? `Terlambat ${Math.abs(receivable.days_left)} hari` : receivable.days_left === 0 ? 'Jatuh tempo hari ini' : `${receivable.days_left} hari lagi`}</p></div>
                  <p className="shrink-0 text-sm font-extrabold text-rose-600">{formatCurrency(receivable.total_debt)}</p>
                </div>
              )) : <EmptyMobileList text="Tidak ada piutang aktif" />}
            </CardContent>
            <Link to={attention === 'stock' ? '/produk' : '/pelanggan'} className="flex min-h-12 items-center justify-center gap-1 border-t text-xs font-bold text-primary">Kelola sekarang <ArrowRight className="h-3.5 w-3.5" /></Link>
          </Card>
        </div>

        {/* Lower Tables Section */}
        <div className="hidden gap-6 md:grid lg:grid-cols-2">
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
        <div className="hidden gap-6 md:grid lg:grid-cols-2">
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

function MobileListSkeleton() {
  return <div className="space-y-3 p-4">{Array.from({ length: 4 }, (_, index) => <Skeleton key={index} className="h-12 w-full rounded-xl" />)}</div>;
}

function EmptyMobileList({ text }: { text: string }) {
  return <p className="px-4 py-8 text-center text-sm font-medium text-muted-foreground">{text}</p>;
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
