import { useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { TableSkeleton } from "@/components/TableSkeleton";
import { DeliveryBadge } from "@/components/DeliveryBadge";
import { formatCurrency } from "@/lib/format";
import { useSalesOrders, useSalesDetail, usePaymentMethods } from "@/hooks/useSales";
import { useDrivers } from "@/hooks/useMasterData";
import { Search, X, Truck, Receipt, Package, CreditCard, CalendarDays, ChevronRight } from "lucide-react";

export default function SalesHistory() {
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [paymentMethodId, setPaymentMethodId] = useState("");
  const [deliveryType, setDeliveryType] = useState("");
  const [driverId, setDriverId] = useState("");
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  const { data: orders, isLoading } = useSalesOrders({ dateFrom, dateTo, search, customerName, paymentMethodId, deliveryType, driverId });
  const { data: detail, isLoading: detailLoading } = useSalesDetail(selectedOrderId);
  const { data: drivers } = useDrivers();
  const { data: paymentMethods } = usePaymentMethods();

  const getDriverName = (id: string | null) =>
    drivers?.find((d) => d.id === id)?.driver_name ?? "-";

  const activeFilterCount = [search, dateFrom, dateTo, customerName, paymentMethodId, deliveryType, driverId].filter(Boolean).length;

  const resetFilters = () => {
    setSearch(""); setDateFrom(""); setDateTo("");
    setCustomerName(""); setPaymentMethodId(""); setDeliveryType(""); setDriverId("");
  };

  return (
    <DashboardLayout title="Riwayat Penjualan">
      <div className="space-y-5">

        {/* Filter Bar */}
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="space-y-3">
              {/* Row 1 */}
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                  <Input placeholder="No. Invoice..." value={search} onChange={(e) => setSearch(e.target.value)} className="h-9 pl-8 text-sm" />
                </div>
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                  <Input placeholder="Nama pelanggan..." value={customerName} onChange={(e) => setCustomerName(e.target.value)} className="h-9 pl-8 text-sm" />
                </div>
                <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="h-9 text-sm" />
                <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="h-9 text-sm" />
              </div>

              {/* Row 2 */}
              <div className="flex flex-wrap items-center gap-2">
                <Select value={paymentMethodId || "__all__"} onValueChange={(v) => setPaymentMethodId(v === "__all__" ? "" : v)}>
                  <SelectTrigger className="h-8 w-auto min-w-[140px] text-xs">
                    <CreditCard className="mr-1.5 h-3 w-3 text-muted-foreground" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">Semua Pembayaran</SelectItem>
                    {paymentMethods?.map((pm) => <SelectItem key={pm.id} value={pm.id}>{pm.name}</SelectItem>)}
                  </SelectContent>
                </Select>

                <Select value={deliveryType || "__all__"} onValueChange={(v) => { const val = v === "__all__" ? "" : v; setDeliveryType(val); if (val !== "driver") setDriverId(""); }}>
                  <SelectTrigger className="h-8 w-auto min-w-[150px] text-xs">
                    <Truck className="mr-1.5 h-3 w-3 text-muted-foreground" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">Semua Pengiriman</SelectItem>
                    <SelectItem value="self_delivery">Ambil Sendiri</SelectItem>
                    <SelectItem value="driver">Kirim Supir</SelectItem>
                  </SelectContent>
                </Select>

                {deliveryType === "driver" && (
                  <Select value={driverId || "__all__"} onValueChange={(v) => setDriverId(v === "__all__" ? "" : v)}>
                    <SelectTrigger className="h-8 w-auto min-w-[140px] text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all__">Semua Supir</SelectItem>
                      {drivers?.map((d) => <SelectItem key={d.id} value={d.id}>{d.driver_name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )}

                {activeFilterCount > 0 && (
                  <>
                    <Separator orientation="vertical" className="h-5" />
                    <button onClick={resetFilters} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
                      <X className="h-3 w-3" /> Reset ({activeFilterCount})
                    </button>
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <Receipt className="h-4 w-4 text-primary" /> Daftar Transaksi
              </CardTitle>
              {orders && (
                <span className="text-sm text-muted-foreground">{orders.length} transaksi</span>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="space-y-px px-6 pb-4">
                <TableSkeleton rows={6} rowClassName="h-14 w-full rounded-lg" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="pl-6">Invoice</TableHead>
                    <TableHead>Tanggal Pesanan</TableHead>
                    <TableHead>Pelanggan</TableHead>
                    <TableHead>Pembayaran</TableHead>
                    <TableHead>Pengiriman</TableHead>
                    <TableHead className="text-right pr-4">Grand Total</TableHead>
                    <TableHead className="w-10 pr-6" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {!orders || orders.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="py-16 text-center">
                        <div className="flex flex-col items-center gap-2 text-muted-foreground">
                          <Receipt className="h-10 w-10 opacity-20" />
                          <p className="text-sm font-medium">Tidak ada transaksi</p>
                          <p className="text-xs">Coba ubah filter pencarian</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    orders.map((order) => (
                      <TableRow
                        key={order.id}
                        className="cursor-pointer group"
                        onClick={() => setSelectedOrderId(order.id)}
                      >
                        <TableCell className="pl-6">
                          <span className="font-mono text-sm font-medium">{order.invoice_number}</span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5 text-sm">
                            <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
                            {new Date(order.sales_date).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">{order.customer_name || "-"}</span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">{(order.payment_methods as any)?.name || "-"}</span>
                        </TableCell>
                        <TableCell>
                          <DeliveryBadge type={order.delivery_types} driverName={getDriverName(order.driver_id)} />
                        </TableCell>
                        <TableCell className="text-right pr-4 font-semibold">
                          {formatCurrency(order.grand_total)}
                        </TableCell>
                        <TableCell className="pr-6">
                          <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Detail Modal */}
      <Dialog open={!!selectedOrderId} onOpenChange={(open) => !open && setSelectedOrderId(null)}>
        <DialogContent className="max-w-2xl gap-0 p-0 overflow-hidden">
          <DialogHeader className="px-6 py-5 border-b">
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="h-4 w-4 text-primary" /> Detail Transaksi
            </DialogTitle>
          </DialogHeader>

          {detailLoading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
            </div>
          ) : detail?.order ? (
            <div className="overflow-y-auto max-h-[75vh]">
              {/* Order meta */}
              <div className="grid grid-cols-2 gap-px bg-border">
                {[
                  { label: "No. Invoice", value: <span className="font-mono font-semibold">{detail.order.invoice_number}</span> },
                  { label: "Tanggal", value: new Date(detail.order.sales_date).toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" }) },
                  { label: "Pelanggan", value: detail.order.customer_name || "-" },
                  { label: "Metode Bayar", value: (detail.order.payment_methods as any)?.name || "-" },
                  {
                    label: "Pengiriman",
                    value: <DeliveryBadge type={detail.order.delivery_types} driverName={getDriverName(detail.order.driver_id)} />
                  },
                  { label: "Telepon", value: detail.order.customer_phone || "-" },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-card px-5 py-3">
                    <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
                    <div className="text-sm font-medium">{value}</div>
                  </div>
                ))}
              </div>

              {detail.order.customer_address && (
                <div className="px-5 py-3 border-b bg-muted/30">
                  <p className="text-xs text-muted-foreground mb-0.5">Alamat</p>
                  <p className="text-sm">{detail.order.customer_address}</p>
                </div>
              )}

              {/* Items */}
              <div className="px-5 py-4">
                <p className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                  <Package className="h-3.5 w-3.5" /> Produk
                </p>
                <div className="rounded-xl border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/40 hover:bg-muted/40">
                        <TableHead className="pl-4 text-xs">Produk</TableHead>
                        <TableHead className="text-right text-xs">Harga</TableHead>
                        <TableHead className="text-right text-xs">Qty</TableHead>
                        <TableHead className="text-right text-xs">Diskon</TableHead>
                        <TableHead className="text-right pr-4 text-xs">Subtotal</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {detail.items?.map((item) => (
                        <TableRow key={item.id} className="hover:bg-muted/20">
                          <TableCell className="pl-4 py-2.5">
                            <p className="text-sm font-medium">{(item.products as any)?.name}</p>
                            <p className="text-xs text-muted-foreground">{(item.products as any)?.product_code}</p>
                          </TableCell>
                          <TableCell className="text-right text-sm py-2.5">{formatCurrency(item.price)}</TableCell>
                          <TableCell className="text-right text-sm py-2.5">{item.qty}</TableCell>
                          <TableCell className="text-right text-sm py-2.5 text-destructive">
                            {item.discount > 0 ? `- ${formatCurrency(item.discount)}` : "-"}
                          </TableCell>
                          <TableCell className="text-right pr-4 text-sm font-medium py-2.5">{formatCurrency(item.subtotal)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Totals */}
              <div className="px-5 pb-5">
                <div className="ml-auto w-64 space-y-1.5 text-sm">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Total Harga</span>
                    <span className="text-foreground">{formatCurrency(detail.order.total_amount)}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Total Diskon</span>
                    <span className="text-destructive">− {formatCurrency(detail.order.total_discount)}</span>
                  </div>
                  <div className="flex justify-between rounded-xl bg-primary/5 px-4 py-2.5 font-bold text-primary">
                    <span>Grand Total</span>
                    <span>{formatCurrency(detail.order.grand_total)}</span>
                  </div>
                </div>
                {detail.order.notes && (
                  <p className="mt-3 text-xs text-muted-foreground">
                    <span className="font-medium">Catatan:</span> {detail.order.notes}
                  </p>
                )}
              </div>
            </div>
          ) : (
            <p className="p-6 text-muted-foreground text-sm">Data tidak ditemukan.</p>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
