import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useDashboardStats } from "@/hooks/useDashboard";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { DollarSign, ShoppingCart, TrendingUp, AlertTriangle } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/format";
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";

export default function Dashboard() {
  const { data, isLoading } = useDashboardStats();
  const { currentRole, isSuperAdmin } = useAuth();

  if (currentRole === "cashier" && !isSuperAdmin) {
    return <Navigate to="/penjualan" replace />;
  }

  return (
    <DashboardLayout title="Dashboard">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
        <Card className="shadow-sm border-0 ring-1 ring-border/60">
          <CardContent className="pt-5 pb-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Penjualan Hari Ini</p>
                {isLoading ? <Skeleton className="h-8 w-32" /> : (
                  <p className="text-2xl font-bold tracking-tight">{formatCurrency(data?.totalSalesToday || 0)}</p>
                )}
              </div>
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50">
                <DollarSign className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-0 ring-1 ring-border/60">
          <CardContent className="pt-5 pb-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Transaksi Hari Ini</p>
                {isLoading ? <Skeleton className="h-8 w-16" /> : (
                  <p className="text-2xl font-bold tracking-tight">{data?.totalTransactionsToday || 0}</p>
                )}
              </div>
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-50">
                <ShoppingCart className="h-5 w-5 text-violet-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-0 ring-1 ring-border/60">
          <CardContent className="pt-5 pb-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Produk Terlaris</p>
                {isLoading ? <Skeleton className="h-8 w-24" /> : (
                  <p className="text-2xl font-bold tracking-tight">{data?.topProducts?.length || 0} <span className="text-base font-medium text-muted-foreground">produk</span></p>
                )}
              </div>
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50">
                <TrendingUp className="h-5 w-5 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-0 ring-1 ring-border/60">
          <CardContent className="pt-5 pb-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Stok Rendah</p>
                {isLoading ? <Skeleton className="h-8 w-16" /> : (
                  <p className="text-2xl font-bold tracking-tight text-destructive">{data?.lowStockProducts?.length || 0} <span className="text-base font-medium text-muted-foreground">produk</span></p>
                )}
              </div>
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-50">
                <AlertTriangle className="h-5 w-5 text-orange-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Chart */}
      <Card className="mb-6 shadow-sm border-0 ring-1 ring-border/60">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Grafik Penjualan 7 Hari Terakhir</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-[300px] w-full" />
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data?.chartData || []}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="date" tickFormatter={formatDate} className="text-xs" />
                <YAxis tickFormatter={(v) => `${(v / 1000000).toFixed(1)}jt`} className="text-xs" />
                <Tooltip
                  formatter={(value: number) => [formatCurrency(value), "Total"]}
                  labelFormatter={(label) => formatDate(label)}
                />
                <Bar dataKey="total" fill="hsl(221, 83%, 53%)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Tables */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Top Products */}
        <Card className="shadow-sm border-0 ring-1 ring-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Produk Terlaris</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produk</TableHead>
                    <TableHead className="text-right">Terjual</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.topProducts?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={2} className="text-center text-muted-foreground">Belum ada data</TableCell>
                    </TableRow>
                  ) : (
                    data?.topProducts?.map((p, idx) => (
                      <TableRow key={p.id}>
                        <TableCell>
                          <div className="font-medium">{p.name}</div>
                          <div className="text-xs text-muted-foreground">{p.code}</div>
                        </TableCell>
                        <TableCell className="text-right font-medium">{p.totalQty}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Low Stock */}
        <Card className="shadow-sm border-0 ring-1 ring-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Produk Stok Rendah</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produk</TableHead>
                    <TableHead className="text-right">Stok</TableHead>
                    <TableHead className="text-right">Min</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.lowStockProducts?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-muted-foreground">Semua stok aman</TableCell>
                    </TableRow>
                  ) : (
                    data?.lowStockProducts?.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell>
                          <div className="font-medium">{p.name}</div>
                          <div className="text-xs text-muted-foreground">{p.product_code}</div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant={p.current_stock <= 0 ? "destructive" : "outline"} className={p.current_stock > 0 ? "border-warning text-warning" : ""}>
                            {p.current_stock}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">{p.minimum_stock}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
