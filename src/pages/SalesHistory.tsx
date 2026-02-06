import { useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useSalesOrders, useSalesDetail } from "@/hooks/useSales";
import { Search, Eye } from "lucide-react";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(value);
}

export default function SalesHistory() {
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  const { data: orders, isLoading } = useSalesOrders(dateFrom, dateTo, search);
  const { data: detail, isLoading: detailLoading } = useSalesDetail(selectedOrderId);

  return (
    <DashboardLayout title="Riwayat Penjualan">
      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari nomor invoice..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex items-center gap-2">
              <Label className="shrink-0 text-sm">Dari:</Label>
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-auto" />
            </div>
            <div className="flex items-center gap-2">
              <Label className="shrink-0 text-sm">Sampai:</Label>
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-auto" />
            </div>
            {(dateFrom || dateTo || search) && (
              <Button variant="outline" onClick={() => { setSearch(""); setDateFrom(""); setDateTo(""); }}>
                Reset
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Orders Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Daftar Transaksi</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Pelanggan</TableHead>
                  <TableHead>Pembayaran</TableHead>
                  <TableHead className="text-right">Grand Total</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                      Tidak ada transaksi ditemukan
                    </TableCell>
                  </TableRow>
                ) : (
                  orders?.map((order) => (
                    <TableRow key={order.id} className="cursor-pointer" onClick={() => setSelectedOrderId(order.id)}>
                      <TableCell className="font-mono text-sm">{order.invoice_number}</TableCell>
                      <TableCell>{new Date(order.sales_date).toLocaleDateString("id-ID")}</TableCell>
                      <TableCell>{order.customer_name || "-"}</TableCell>
                      <TableCell>{(order.payment_methods as any)?.name || "-"}</TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(order.grand_total)}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); setSelectedOrderId(order.id); }}>
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Detail Modal */}
      <Dialog open={!!selectedOrderId} onOpenChange={(open) => !open && setSelectedOrderId(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detail Transaksi</DialogTitle>
          </DialogHeader>
          {detailLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-6 w-full" />)}
            </div>
          ) : detail?.order ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Invoice:</span>
                  <span className="ml-2 font-mono font-medium">{detail.order.invoice_number}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Tanggal:</span>
                  <span className="ml-2">{new Date(detail.order.sales_date).toLocaleDateString("id-ID")}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Pelanggan:</span>
                  <span className="ml-2">{detail.order.customer_name || "-"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Pembayaran:</span>
                  <span className="ml-2">{(detail.order.payment_methods as any)?.name || "-"}</span>
                </div>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produk</TableHead>
                    <TableHead className="text-right">Harga</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Diskon</TableHead>
                    <TableHead className="text-right">Subtotal</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {detail.items?.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div className="font-medium">{(item.products as any)?.name}</div>
                        <div className="text-xs text-muted-foreground">{(item.products as any)?.product_code}</div>
                      </TableCell>
                      <TableCell className="text-right">{formatCurrency(item.price)}</TableCell>
                      <TableCell className="text-right">{item.qty}</TableCell>
                      <TableCell className="text-right">{formatCurrency(item.discount)}</TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(item.subtotal)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <div className="flex justify-end">
                <div className="w-64 space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total</span>
                    <span>{formatCurrency(detail.order.total_amount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Diskon</span>
                    <span>-{formatCurrency(detail.order.total_discount)}</span>
                  </div>
                  <div className="flex justify-between border-t pt-2 font-bold">
                    <span>Grand Total</span>
                    <span>{formatCurrency(detail.order.grand_total)}</span>
                  </div>
                </div>
              </div>

              {detail.order.notes && (
                <div className="text-sm">
                  <span className="text-muted-foreground">Catatan:</span>
                  <span className="ml-2">{detail.order.notes}</span>
                </div>
              )}
            </div>
          ) : (
            <p className="text-muted-foreground">Data tidak ditemukan</p>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
