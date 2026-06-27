import { useState, useEffect, useRef, useMemo } from "react";
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
import { useSalesOrders, useSalesDetail, useAddPaymentLog, usePaymentLogs, useSalesOrderStatusCounts, useUpdateItemDeliveryStatus } from "@/hooks/useSales";
import { useDrivers } from "@/hooks/useMasterData";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Search, Truck, Receipt, Package, CalendarDays, ChevronRight, Wallet, CheckCircle2, History, Coins } from "lucide-react";
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

const generateDateOptions = () => {
  const options = [];
  const today = new Date();
  for (let i = 30; i >= -3; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const dateVal = String(d.getDate()).padStart(2, "0");
    const id = `${year}-${month}-${dateVal}`;
    const dayName = d.toLocaleDateString("id-ID", { weekday: "short" });
    const monthName = d.toLocaleDateString("id-ID", { month: "short" });
    const dayNum = d.getDate();
    const isToday = i === 0;
    options.push({ id, dayName, dayNum, monthName, isToday });
  }
  return options;
};

export default function SalesHistory() {
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const dateVal = String(today.getDate()).padStart(2, "0");
    return `${year}-${month}-${dateVal}`;
  });
  const [dateTo, setDateTo] = useState(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const dateVal = String(today.getDate()).padStart(2, "0");
    return `${year}-${month}-${dateVal}T23:59:59.999Z`;
  });
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [paymentNotes, setPaymentNotes] = useState("");
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [statusTab, setStatusTab] = useState<"all" | "paid" | "unpaid">("all");

  const [dateOptions] = useState(() => generateDateOptions());
  const [selectedDateId, setSelectedDateId] = useState<string | null>(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const dateVal = String(today.getDate()).padStart(2, "0");
    return `${year}-${month}-${dateVal}`;
  });

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const selectedTodayRef = useRef<HTMLButtonElement>(null);
  const selectedActiveRef = useRef<HTMLButtonElement>(null);

  const { data: ordersData, isLoading } = useSalesOrders({
    dateFrom,
    dateTo,
    search,
    transactionStatus: statusTab === "all" ? undefined : statusTab,
    page: currentPage,
    pageSize,
  });
  const { data: unpaidOrdersResponse } = useSalesOrders({
    transactionStatus: "unpaid",
    pageSize: 1000,
  });
  const { data: statusCounts } = useSalesOrderStatusCounts({ dateFrom, dateTo, search });
  const { data: detail, isLoading: detailLoading } = useSalesDetail(selectedOrderId);
  const { data: paymentLogs, isLoading: logsLoading } = usePaymentLogs(selectedOrderId);
  const { data: drivers } = useDrivers();
  const { mutate: addPaymentLog, isPending: paymentPending } = useAddPaymentLog();
  const { mutate: updateItemStatus, isPending: itemStatusPending } = useUpdateItemDeliveryStatus();

  // Scroll to active/today date card on change/mount
  useEffect(() => {
    const target = selectedActiveRef.current || selectedTodayRef.current;
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
    }
  }, [selectedDateId]);

  // Reset to first page when filters, pageSize, or tab change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, dateFrom, dateTo, pageSize, statusTab]);

  // Reset payment input whenever a different order is opened
  useEffect(() => {
    setPaymentAmount(0);
    setPaymentNotes("");
  }, [selectedOrderId]);

  const getDriverName = (id: string | null) =>
    drivers?.find((d) => d.id === id)?.driver_name ?? "-";

  const unpaidDates = useMemo(() => {
    const dates = new Set<string>();
    if (!unpaidOrdersResponse?.data) return dates;
    for (const order of unpaidOrdersResponse.data) {
      const d = new Date(order.sales_date);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const dateVal = String(d.getDate()).padStart(2, "0");
      dates.add(`${year}-${month}-${dateVal}`);
    }
    return dates;
  }, [unpaidOrdersResponse]);

  const handleSelectDate = (dateStr: string | null) => {
    if (!dateStr) {
      setDateFrom("");
      setDateTo("");
      setSelectedDateId(null);
    } else {
      setSelectedDateId(dateStr);
      setDateFrom(dateStr);
      setDateTo(`${dateStr}T23:59:59.999Z`);
    }
  };

  const orders       = ordersData?.data ?? [];
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

        {/* Search & Mini Calendar Filter Bar */}
        <Card className="shadow-sm border-0 ring-1 ring-border/60 mb-5">
          <CardContent className="p-4 flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
            {/* Search Input */}
            <div className="relative w-full md:w-80 shrink-0">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari invoice atau pelanggan..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-10 text-sm"
              />
            </div>

            {/* Horizontal Date Picker Strip */}
            <div className="flex-1 overflow-hidden flex items-center gap-2">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider shrink-0 select-none">
                Tanggal:
              </span>

              {/* Scrollable Container */}
              <div
                ref={scrollContainerRef}
                className="flex-1 flex overflow-x-auto gap-2 py-1 scrollbar-none snap-x snap-mandatory"
                style={{ scrollbarWidth: "none" }}
              >
                {/* "Semua" Option */}
                <button
                  onClick={() => handleSelectDate(null)}
                  className={cn(
                    "snap-start shrink-0 px-4 py-1.5 rounded-lg border text-xs font-medium transition-all",
                    !selectedDateId
                      ? "bg-primary border-primary text-primary-foreground shadow-sm font-bold"
                      : "bg-background border-border text-muted-foreground hover:text-foreground hover:bg-muted/30"
                  )}
                >
                  Semua
                </button>

                {/* Date options */}
                {dateOptions.map((opt) => {
                  const isSelected = selectedDateId === opt.id;
                  const hasUnpaid = unpaidDates.has(opt.id);
                  return (
                    <button
                      key={opt.id}
                      ref={isSelected ? selectedActiveRef : opt.isToday ? selectedTodayRef : null}
                      onClick={() => handleSelectDate(opt.id)}
                      className={cn(
                        "snap-start shrink-0 flex flex-col items-center justify-center min-w-[56px] px-2 py-1.5 rounded-lg border text-center transition-all",
                        isSelected
                          ? "bg-primary border-primary text-primary-foreground shadow-sm scale-[1.02]"
                          : "bg-background border-border text-muted-foreground hover:text-foreground hover:bg-muted/30"
                      )}
                    >
                      <span className="text-[10px] uppercase font-semibold opacity-70 leading-none mb-0.5">
                        {opt.dayName}
                      </span>
                      <span className="text-sm font-bold leading-none">
                        {opt.dayNum}
                      </span>
                      <span className="text-[9px] font-medium leading-none mt-0.5 opacity-80">
                        {opt.monthName}
                      </span>
                      {hasUnpaid && (
                        <span className={cn(
                          "w-1.5 h-1.5 rounded-full mt-1 shrink-0",
                          isSelected ? "bg-white" : "bg-red-500"
                        )} />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>

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
                    <TableHead className="hidden md:table-cell">Tanggal Pesanan</TableHead>
                    <TableHead>Pelanggan</TableHead>
                    <TableHead className="hidden md:table-cell">Pembayaran</TableHead>
                    <TableHead className="hidden md:table-cell">Pengiriman</TableHead>
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
                          order.transaction_status === "paid"
                            ? "bg-emerald-50 hover:bg-emerald-100/60 dark:bg-emerald-950/20 dark:hover:bg-emerald-950/30"
                            : order.transaction_status === "unpaid"
                            ? "bg-red-50 hover:bg-red-100/60 dark:bg-red-950/20 dark:hover:bg-red-950/30"
                            : order.transaction_status === "half_payment"
                            ? "bg-amber-50 hover:bg-amber-100/60 dark:bg-amber-950/20 dark:hover:bg-amber-950/30"
                            : "";
                        return (
                      <TableRow
                        key={order.id}
                        className={`cursor-pointer group ${statusCls}`}
                        onClick={() => setSelectedOrderId(order.id)}
                      >
                        <TableCell className="pl-6 py-3">
                          <span className="font-mono text-sm font-medium">{order.invoice_number}</span>
                          <div className="md:hidden text-[10px] text-muted-foreground mt-0.5">
                            {new Date(order.sales_date).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })} - {new Date(order.sales_date).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
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
                        <TableCell className="max-w-[150px] sm:max-w-none">
                          <p className="text-sm font-medium truncate">{order.customer?.name || order.customer_name || "-"}</p>
                          {(order.customer?.address || order.customer_address) && (
                            <p className="text-xs text-muted-foreground truncate leading-snug hidden md:block">
                              {order.customer?.address || order.customer_address}
                            </p>
                          )}
                          <div className="md:hidden flex flex-wrap gap-1 mt-1 items-center">
                            <span className="inline-flex items-center rounded bg-slate-100 dark:bg-slate-800 px-1 py-0.2 text-[9px] font-medium text-slate-800 dark:text-slate-200">
                              {order.payment_method?.name || "-"}
                            </span>
                            <DeliveryBadge type={order.delivery_types} driverName={getDriverName(order.driver_id)} />
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <span className="text-sm">{order.payment_method?.name || "-"}</span>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <DeliveryBadge type={order.delivery_types} driverName={getDriverName(order.driver_id)} />
                        </TableCell>
                        <TableCell className="text-right pr-4 font-semibold whitespace-nowrap">
                          {formatCurrency(order.grand_total)}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          <TransactionStatusBadge status={order.transaction_status} />
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
          ) : detail ? (
            <div className="overflow-y-auto max-h-[75vh]">
              {/* Order meta */}
              <div className="grid grid-cols-2 gap-px bg-border">
                {[
                  { label: "No. Invoice", value: <span className="font-mono font-semibold">{detail.invoice_number}</span> },
                  { label: "Tanggal", value: new Date(detail.sales_date).toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" }) },
                  { label: "Pelanggan", value: detail.customer?.name || detail.customer_name || "-" },
                  { label: "Metode Bayar", value: detail.payment_method?.name || "-" },
                  {
                    label: "Pengiriman",
                    value: <DeliveryBadge type={detail.delivery_types} driverName={getDriverName(detail.driver_id)} />
                  },
                  { label: "Telepon", value: detail.customer_phone || "-" },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-card px-5 py-3">
                    <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
                    <div className="text-sm font-medium">{value}</div>
                  </div>
                ))}
              </div>

              {(detail.customer?.address || detail.customer_address) && (
                <div className="px-5 py-3 border-b bg-muted/30">
                  <p className="text-xs text-muted-foreground mb-0.5">Alamat</p>
                  <p className="text-sm">{detail.customer?.address || detail.customer_address}</p>
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
                            <p className="text-sm font-medium">{item.product?.name}</p>
                            <p className="text-xs text-muted-foreground">{item.product?.product_code}</p>
                          </TableCell>
                          <TableCell className="text-right text-sm py-2.5">{formatCurrency(item.price)}</TableCell>
                          <TableCell className="text-right text-sm py-2.5">{item.qty}</TableCell>
                          <TableCell className="text-right text-sm py-2.5 text-destructive">
                            {item.discount > 0 ? `- ${formatCurrency(item.discount)}` : "-"}
                          </TableCell>
                          <TableCell className="py-2.5">
                            {(() => {
                              const st: string = item.delivery_status ?? "pending";
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
                          <TableCell className="text-right pr-4 text-sm font-medium py-2.5">
                            {item.qty * item.price > item.subtotal ? (
                              <div className="flex flex-col items-end">
                                <span className="text-xs text-muted-foreground line-through font-normal font-mono">
                                  {formatCurrency(item.qty * item.price)}
                                </span>
                                <span className="text-foreground font-bold font-mono">
                                  {formatCurrency(item.subtotal)}
                                </span>
                              </div>
                            ) : (
                              <span className="font-mono">{formatCurrency(item.subtotal)}</span>
                            )}
                          </TableCell>
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
                    <span className="text-foreground">{formatCurrency(detail.total_amount)}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Total Diskon</span>
                    <span className="text-destructive">− {formatCurrency(detail.total_discount)}</span>
                  </div>
                  {detail.delivery_fee > 0 && (
                    <div className="flex justify-between text-muted-foreground">
                      <span className="flex items-center gap-1"><Truck className="h-3.5 w-3.5" /> Biaya Kirim</span>
                      <span className="text-foreground">+ {formatCurrency(detail.delivery_fee)}</span>
                    </div>
                  )}
                  <div className="flex justify-between rounded-xl bg-primary/5 px-4 py-2.5 font-bold text-primary">
                    <span>Grand Total</span>
                    <span>{formatCurrency(detail.grand_total)}</span>
                  </div>
                </div>
                {detail.notes && (
                  <div className="mt-3 flex gap-2.5 rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-2.5 dark:border-amber-800 dark:bg-amber-950/40">
                    <span className="mt-0.5 text-amber-500 shrink-0">📝</span>
                    <div>
                      <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 mb-0.5">Catatan</p>
                      <p className="text-xs text-amber-800 dark:text-amber-300">{detail.notes}</p>
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
                      <TransactionStatusBadge status={detail.transaction_status} />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Sisa Tagihan</span>
                      <span className={`text-sm font-semibold ${
                        detail.unpaid_transaction <= 0
                          ? "text-emerald-600"
                          : "text-destructive"
                      }`}>
                        {formatCurrency(Math.max(0, detail.unpaid_transaction))}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Sudah Dibayar</span>
                      <span className="text-sm font-medium">
                        {formatCurrency(Math.max(0, detail.grand_total - detail.unpaid_transaction))}
                      </span>
                    </div>
                  </div>

                  {/* Payment input — only shown when there's still something owed */}
                  {detail.unpaid_transaction > 0 ? (() => {
                    const maxPayable = detail.unpaid_transaction;
                    const isOverMax = paymentAmount > 0 && paymentAmount > maxPayable;
                    const isInvalid = paymentAmount <= 0 || isOverMax;
                    return (
                    <div className="flex-1 min-w-[180px] space-y-2">
                      <Label className="text-xs">Catat Pembayaran</Label>
                      <div className="flex gap-2 items-center">
                        <CurrencyInput
                          placeholder={`Maks. ${formatCurrency(maxPayable)}`}
                          value={paymentAmount}
                          onChange={setPaymentAmount}
                          className={`h-9 text-sm flex-1 ${isOverMax ? "border-destructive focus-visible:ring-destructive" : ""}`}
                        />
                        {paymentAmount !== maxPayable && (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => setPaymentAmount(maxPayable)}
                            className="h-9 gap-1.5 px-3 shrink-0 border-primary/30 hover:border-primary bg-primary/5 hover:bg-primary text-primary hover:text-primary-foreground text-xs font-bold transition-all"
                          >
                            <Coins className="h-3.5 w-3.5" />
                            Bayar Pas
                          </Button>
                        )}
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
