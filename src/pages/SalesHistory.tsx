import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";

import { TableSkeleton } from "@/components/TableSkeleton";
import { DeliveryBadge } from "@/components/DeliveryBadge";
import { TransactionStatusBadge } from "@/components/TransactionStatusBadge";
import { ItemDeliveryStatusBadge } from "@/components/ItemDeliveryStatusBadge";
import { formatCurrency } from "@/lib/format";
import { useSalesOrders, useSalesDetail, usePaymentMethods, useAddPaymentLog, usePaymentLogs, useSalesOrderStatusCounts, useUpdateItemDeliveryStatus } from "@/hooks/useSales";
import { useDrivers } from "@/hooks/useMasterData";
import { CurrencyInput } from "@/components/ui/currency-input";
import { FilterBar } from "@/components/FilterBar";
import { DateRangePicker } from "@/components/DateRangePicker";
import { Search, Truck, Receipt, Package, CalendarDays, ChevronRight, Wallet, CheckCircle2, History } from "lucide-react";
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function SalesHistory() {
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [paymentMethodId, setPaymentMethodId] = useState("");
  const [deliveryType, setDeliveryType] = useState("");
  const [driverId, setDriverId] = useState("");
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [paymentNotes, setPaymentNotes] = useState("");
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [statusTab, setStatusTab] = useState<"all" | "paid" | "unpaid">("all");

  const { data: ordersData, isLoading } = useSalesOrders({
    dateFrom, dateTo, search, customerName, paymentMethodId, deliveryType, driverId,
    transactionStatus: statusTab === "all" ? undefined : statusTab,
    page: currentPage,
    pageSize,
  });
  const { data: statusCounts } = useSalesOrderStatusCounts({ dateFrom, dateTo, search, customerName, paymentMethodId, deliveryType, driverId });
  const { data: detail, isLoading: detailLoading } = useSalesDetail(selectedOrderId);
  const { data: paymentLogs, isLoading: logsLoading } = usePaymentLogs(selectedOrderId);
  const { data: drivers } = useDrivers();
  const { data: paymentMethods } = usePaymentMethods();
  const { mutate: addPaymentLog, isPending: paymentPending } = useAddPaymentLog();
  const { mutate: updateItemStatus, isPending: itemStatusPending } = useUpdateItemDeliveryStatus();

  // Reset to first page when filters, pageSize, or tab change
  useEffect(() => { setCurrentPage(1); }, [search, dateFrom, dateTo, customerName, paymentMethodId, deliveryType, driverId, pageSize, statusTab]);

  // Reset payment input whenever a different order is opened
  useEffect(() => { setPaymentAmount(0); setPaymentNotes(""); }, [selectedOrderId]);

  const getDriverName = (id: string | null) =>
    drivers?.find((d) => d.id === id)?.driver_name ?? "-";

  const activeFilterCount = [search, dateFrom, dateTo, customerName, paymentMethodId, deliveryType, driverId].filter(Boolean).length;

  const resetFilters = () => {
    setSearch(""); setDateFrom(""); setDateTo("");
    setCustomerName(""); setPaymentMethodId(""); setDeliveryType(""); setDriverId("");
    setCurrentPage(1);
  };

  const orders       = ordersData ?? [];
  const paidCount    = statusCounts?.paidCount ?? 0;
  const unpaidCount  = statusCounts?.unpaidCount ?? 0;
  const totalCount   =
    statusTab === "paid"   ? paidCount :
    statusTab === "unpaid" ? unpaidCount :
    statusCounts?.allCount ?? 0;

  const totalPages       = Math.max(1, Math.ceil(totalCount / pageSize));
  const startIndex       = totalCount === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endIndex         = Math.min(currentPage * pageSize, totalCount);

  const getPageButtons = (): (number | "...")[] => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const pages: (number | "...")[] = [1];
    if (currentPage > 3) pages.push("...");
    for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) pages.push(i);
    if (currentPage < totalPages - 2) pages.push("...");
    pages.push(totalPages);
    return pages;
  };

  return (
    <DashboardLayout title="Riwayat Penjualan">
      <div className="space-y-5">

        {/* Filter Bar */}
        <FilterBar activeFilterCount={activeFilterCount} onReset={resetFilters}>
          <FilterBar.Row>
            <FilterBar.Field label="No. Invoice">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input placeholder="No. Invoice..." value={search} onChange={(e) => setSearch(e.target.value)} className="h-9 pl-8 text-sm w-40" />
              </div>
            </FilterBar.Field>
            <FilterBar.Field label="Nama / Alamat Pelanggan">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input placeholder="Nama / Alamat..." value={customerName} onChange={(e) => setCustomerName(e.target.value)} className="h-9 pl-8 text-sm w-52" />
              </div>
            </FilterBar.Field>
            <FilterBar.Field label="Rentang Tanggal">
              <DateRangePicker
                from={dateFrom}
                to={dateTo}
                onFromChange={setDateFrom}
                onToChange={setDateTo}
                className="w-64"
              />
            </FilterBar.Field>
            <FilterBar.Field label="Pembayaran">
              <Select value={paymentMethodId || "__all__"} onValueChange={(v) => setPaymentMethodId(v === "__all__" ? "" : v)}>
                <SelectTrigger className="h-9 text-sm w-44">
                  <SelectValue placeholder="Semua Pembayaran" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Semua Pembayaran</SelectItem>
                  {paymentMethods?.map((pm) => <SelectItem key={pm.id} value={pm.id}>{pm.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </FilterBar.Field>
            <FilterBar.Field label="Pengiriman">
              <Select value={deliveryType || "__all__"} onValueChange={(v) => { const val = v === "__all__" ? "" : v; setDeliveryType(val); if (val !== "driver") setDriverId(""); }}>
                <SelectTrigger className="h-9 text-sm w-44">
                  <SelectValue placeholder="Semua Pengiriman" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Semua Pengiriman</SelectItem>
                  <SelectItem value="self_delivery">Ambil Sendiri</SelectItem>
                  <SelectItem value="driver">Kirim Supir</SelectItem>
                </SelectContent>
              </Select>
            </FilterBar.Field>
            {deliveryType === "driver" && (
              <FilterBar.Field label="Driver">
                <Select value={driverId || "__all__"} onValueChange={(v) => setDriverId(v === "__all__" ? "" : v)}>
                  <SelectTrigger className="h-9 text-sm w-40">
                    <SelectValue placeholder="Semua Supir" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">Semua Supir</SelectItem>
                    {drivers?.map((d) => <SelectItem key={d.id} value={d.id}>{d.driver_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </FilterBar.Field>
            )}
          </FilterBar.Row>
        </FilterBar>

        {/* Table */}
        <Tabs value={statusTab} onValueChange={(v) => { setStatusTab(v as typeof statusTab); setCurrentPage(1); }}>
        <Card>
          <CardHeader className="pb-0">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3">
              <TabsList className="h-9">
                <TabsTrigger value="all" className="text-xs gap-1.5">
                  Semua
                  {orders && <span className="rounded-full bg-muted-foreground/20 px-1.5 py-0.5 text-[10px] font-medium">{orders.length}</span>}
                </TabsTrigger>
                <TabsTrigger value="paid" className="text-xs gap-1.5">
                  Lunas
                  {orders && paidCount > 0 && <span className="rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 px-1.5 py-0.5 text-[10px] font-medium">{paidCount}</span>}
                </TabsTrigger>
                <TabsTrigger value="unpaid" className="text-xs gap-1.5">
                  Belum Lunas
                  {orders && unpaidCount > 0 && <span className="rounded-full bg-red-500/20 text-red-700 dark:text-red-400 px-1.5 py-0.5 text-[10px] font-medium">{unpaidCount}</span>}
                </TabsTrigger>
              </TabsList>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <span>Tampilkan</span>
                  <Select value={String(pageSize)} onValueChange={(v) => setPageSize(Number(v))}>
                    <SelectTrigger className="h-7 w-[70px] text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[10, 30, 50, 100].map((n) => (
                        <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <span>data</span>
                </div>
                {orders && (
                  <span className="text-sm text-muted-foreground">
                    {totalCount === 0 ? "0 transaksi" : `${startIndex}–${endIndex} dari ${totalCount} transaksi`}
                  </span>
                )}
              </div>
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
                    <TableHead>Status</TableHead>
                    <TableHead className="w-10 pr-6" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {!isLoading && (!orders || orders.length === 0) ? (
                    <TableRow>
                      <TableCell colSpan={8} className="py-16 text-center">
                        <div className="flex flex-col items-center gap-2 text-muted-foreground">
                          <Receipt className="h-10 w-10 opacity-20" />
                          <p className="text-sm font-medium">Tidak ada transaksi</p>
                          <p className="text-xs">Coba ubah filter pencarian</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    (orders ?? []).map((order) => {
                        const statusCls =
                          (order as any).transaction_status === "paid"
                            ? "bg-emerald-50 hover:bg-emerald-100/60 dark:bg-emerald-950/20 dark:hover:bg-emerald-950/30"
                            : (order as any).transaction_status === "unpaid"
                            ? "bg-red-50 hover:bg-red-100/60 dark:bg-red-950/20 dark:hover:bg-red-950/30"
                            : (order as any).transaction_status === "half_payment"
                            ? "bg-amber-50 hover:bg-amber-100/60 dark:bg-amber-950/20 dark:hover:bg-amber-950/30"
                            : "";
                        return (
                      <TableRow
                        key={order.id}
                        className={`cursor-pointer group ${statusCls}`}
                        onClick={() => setSelectedOrderId(order.id)}
                      >
                        <TableCell className="pl-6">
                          <span className="font-mono text-sm font-medium">{order.invoice_number}</span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-start gap-1.5">
                            <CalendarDays className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
                            <div>
                              <p className="text-sm">
                                {new Date(order.sales_date).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(order.sales_date).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <p className="text-sm">{(order as any).customers?.name || order.customer_name || "-"}</p>
                          {((order as any).customers?.address || order.customer_address) && (
                            <p className="text-xs text-muted-foreground leading-snug">
                              {(order as any).customers?.address || order.customer_address}
                            </p>
                          )}
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
                        <TableCell>
                          <TransactionStatusBadge status={(order as any).transaction_status} />
                        </TableCell>
                        <TableCell className="pr-6">
                          <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                        </TableCell>
                      </TableRow>
                        );
                      })
                  )}
                </TableBody>
              </Table>
            )}
            {/* Pagination */}
            {!isLoading && totalCount > 0 && (
              <div className="flex items-center justify-between border-t px-6 py-3">
                <p className="text-xs text-muted-foreground">
                  Halaman {currentPage} dari {totalPages}
                </p>
                <Pagination className="w-auto mx-0 justify-end">
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        className={currentPage === 1 ? "pointer-events-none opacity-40" : "cursor-pointer"}
                      />
                    </PaginationItem>
                    {getPageButtons().map((page, idx) =>
                      page === "..." ? (
                        <PaginationItem key={`ellipsis-${idx}`}>
                          <PaginationEllipsis />
                        </PaginationItem>
                      ) : (
                        <PaginationItem key={page}>
                          <PaginationLink
                            isActive={page === currentPage}
                            onClick={() => setCurrentPage(page as number)}
                            className="cursor-pointer"
                          >
                            {page}
                          </PaginationLink>
                        </PaginationItem>
                      )
                    )}
                    <PaginationItem>
                      <PaginationNext
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        className={currentPage === totalPages ? "pointer-events-none opacity-40" : "cursor-pointer"}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            )}
          </CardContent>
        </Card>
        </Tabs>
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
                  { label: "Pelanggan", value: (detail.order as any).customers?.name || detail.order.customer_name || "-" },
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

              {((detail.order as any).customers?.address || detail.order.customer_address) && (
                <div className="px-5 py-3 border-b bg-muted/30">
                  <p className="text-xs text-muted-foreground mb-0.5">Alamat</p>
                  <p className="text-sm">{(detail.order as any).customers?.address || detail.order.customer_address}</p>
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
                        <TableHead className="text-xs">Status Kirim</TableHead>
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
                          <TableCell className="py-2.5">
                            {(() => {
                              const st: string = (item as any).delivery_status ?? "pending";
                              if (st === "in_delivery" || st === "delivered") {
                                return <ItemDeliveryStatusBadge status={st} />;
                              }
                              return (
                                <Select
                                  value={st}
                                  onValueChange={(v) =>
                                    updateItemStatus({ itemId: item.id, status: v as "pending" | "self_pickup" })
                                  }
                                  disabled={itemStatusPending}
                                >
                                  <SelectTrigger className="h-7 w-fit border-0 p-0 shadow-none focus:ring-0 [&>svg]:ml-1 gap-0">
                                    <ItemDeliveryStatusBadge status={st} />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="pending">Pending</SelectItem>
                                    <SelectItem value="self_pickup">Ambil Sendiri</SelectItem>
                                  </SelectContent>
                                </Select>
                              );
                            })()}
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
                  {(detail.order as any).delivery_fee > 0 && (
                    <div className="flex justify-between text-muted-foreground">
                      <span className="flex items-center gap-1"><Truck className="h-3.5 w-3.5" /> Biaya Kirim</span>
                      <span className="text-foreground">+ {formatCurrency((detail.order as any).delivery_fee)}</span>
                    </div>
                  )}
                  <div className="flex justify-between rounded-xl bg-primary/5 px-4 py-2.5 font-bold text-primary">
                    <span>Grand Total</span>
                    <span>{formatCurrency(detail.order.grand_total)}</span>
                  </div>
                </div>
                {detail.order.notes && (
                  <div className="mt-3 flex gap-2.5 rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-2.5 dark:border-amber-800 dark:bg-amber-950/40">
                    <span className="mt-0.5 text-amber-500 shrink-0">📝</span>
                    <div>
                      <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 mb-0.5">Catatan</p>
                      <p className="text-xs text-amber-800 dark:text-amber-300">{detail.order.notes}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Payment Section */}
              <div className="border-t bg-muted/30 px-5 py-4">
                <p className="mb-3 flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  <Wallet className="h-3.5 w-3.5" /> Status Pembayaran
                </p>
                <div className="flex flex-wrap items-start gap-4">
                  {/* Current status info */}
                  <div className="flex-1 min-w-[180px] space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Status</span>
                      <TransactionStatusBadge status={detail.order.transaction_status} />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Sisa Tagihan</span>
                      <span className={`text-sm font-semibold ${
                        detail.order.unpaid_transaction <= 0
                          ? "text-emerald-600"
                          : "text-destructive"
                      }`}>
                        {formatCurrency(Math.max(0, detail.order.unpaid_transaction))}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Sudah Dibayar</span>
                      <span className="text-sm font-medium">
                        {formatCurrency(Math.max(0, detail.order.grand_total - detail.order.unpaid_transaction))}
                      </span>
                    </div>
                  </div>

                  {/* Payment input — only shown when there's still something owed */}
                  {detail.order.unpaid_transaction > 0 ? (() => {
                    const maxPayable = detail.order.unpaid_transaction;
                    const isOverMax = paymentAmount > 0 && paymentAmount > maxPayable;
                    const isInvalid = paymentAmount <= 0 || isOverMax;
                    return (
                    <div className="flex-1 min-w-[180px] space-y-2">
                      <Label className="text-xs">Catat Pembayaran</Label>
                      <div className="flex gap-2">
                        <CurrencyInput
                          placeholder={`Maks. ${formatCurrency(maxPayable)}`}
                          value={paymentAmount}
                          onChange={setPaymentAmount}
                          className={`h-9 text-sm ${isOverMax ? "border-destructive focus-visible:ring-destructive" : ""}`}
                        />
                        <Button
                          size="sm"
                          disabled={isInvalid || paymentPending}
                          onClick={() => {
                            if (isInvalid || !selectedOrderId) return;
                            addPaymentLog(
                              { orderId: selectedOrderId, amount: paymentAmount, notes: paymentNotes || undefined },
                              { onSuccess: () => { setPaymentAmount(0); setPaymentNotes(""); } }
                            );
                          }}
                        >
                          {paymentPending ? "Menyimpan..." : "Bayar"}
                        </Button>
                      </div>
                      <Input
                        placeholder="Catatan (opsional)"
                        value={paymentNotes}
                        onChange={(e) => setPaymentNotes(e.target.value)}
                        className="h-8 text-xs"
                      />
                      {isOverMax ? (
                        <p className="text-xs text-destructive">
                          Jumlah melebihi sisa tagihan ({formatCurrency(maxPayable)}).
                        </p>
                      ) : (
                        <p className="text-xs text-muted-foreground">
                          Masukkan jumlah yang diterima dari pelanggan.
                        </p>
                      )}

                    </div>
                    );
                  })() : (
                    <div className="flex flex-1 min-w-[180px] items-center gap-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 px-4 py-3">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                      <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">Transaksi sudah lunas</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Payment History */}
              <div className="border-t px-5 py-4">
                <p className="mb-3 flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  <History className="h-3.5 w-3.5" /> Riwayat Pembayaran
                </p>
                {logsLoading ? (
                  <div className="space-y-2">
                    {[1, 2].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
                  </div>
                ) : !paymentLogs || paymentLogs.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Belum ada pembayaran yang dicatat.</p>
                ) : (
                  <div className="rounded-xl border overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/40 hover:bg-muted/40">
                          <TableHead className="pl-4 text-xs">Waktu</TableHead>
                          <TableHead className="text-xs">Catatan</TableHead>
                          <TableHead className="text-right pr-4 text-xs">Jumlah</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paymentLogs.map((log) => (
                          <TableRow key={log.id} className="hover:bg-muted/20">
                            <TableCell className="pl-4 py-2 text-xs text-muted-foreground whitespace-nowrap">
                              {new Date(log.paid_at).toLocaleString("id-ID", {
                                day: "2-digit", month: "short", year: "numeric",
                                hour: "2-digit", minute: "2-digit",
                              })}
                            </TableCell>
                            <TableCell className="py-2 text-xs text-muted-foreground">
                              {log.notes || <span className="italic opacity-50">—</span>}
                            </TableCell>
                            <TableCell className="text-right pr-4 py-2 text-sm font-semibold text-emerald-600">
                              + {formatCurrency(log.amount)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
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
