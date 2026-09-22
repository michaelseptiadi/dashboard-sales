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
import { useSalesOrders, useInfiniteSalesOrders, useSalesDetail, useAddPaymentLog, usePaymentLogs, useSalesOrderStatusCounts, useUpdateItemDeliveryStatus } from "@/hooks/useSales";
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

const getTodayDateStr = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const dateVal = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${dateVal}`;
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

  const {
    data: infiniteOrdersData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: isInfiniteLoading,
  } = useInfiniteSalesOrders({
    dateFrom,
    dateTo,
    search,
    transactionStatus: statusTab === "all" ? undefined : statusTab,
    pageSize: 15,
  });

  const mobileOrders = infiniteOrdersData?.pages.flatMap((p) => p.data) ?? [];
  const loadMoreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const target = loadMoreRef.current;
    if (!target || !hasNextPage) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { rootMargin: "250px" }
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);
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

  const isTodaySelected = selectedDateId === getTodayDateStr();

  const handleJumpToToday = () => {
    const todayStr = getTodayDateStr();
    handleSelectDate(todayStr);
    setTimeout(() => {
      selectedTodayRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
    }, 50);
  };

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

        {/* Mini Calendar Filter Bar */}
        <Card className="rounded-2xl border border-border/60 bg-card shadow-sm mb-4">
          <CardContent className="p-3.5 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
            {/* Date Pick & Quick Jump Row */}
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              {/* Semua Tanggal Button */}
              <button
                type="button"
                onClick={() => handleSelectDate(null)}
                className={cn(
                  "shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border transition-all shadow-xs active:scale-95",
                  !selectedDateId
                    ? "bg-primary border-primary text-primary-foreground font-bold shadow-sm"
                    : "bg-background border-border text-foreground hover:bg-muted/40"
                )}
                title="Tampilkan semua transaksi"
              >
                <span>Semua Tanggal</span>
              </button>

              {/* Hari Ini Button */}
              <button
                type="button"
                onClick={handleJumpToToday}
                className={cn(
                  "shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border transition-all shadow-xs active:scale-95",
                  isTodaySelected
                    ? "bg-primary border-primary text-primary-foreground font-bold shadow-sm"
                    : "bg-background border-border text-foreground hover:bg-muted/40"
                )}
                title="Lompat ke tanggal hari ini"
              >
                <CalendarDays className="h-3.5 w-3.5" />
                <span>Hari Ini</span>
              </button>

              {/* Custom Date Picker */}
              <div className="flex items-center gap-2 rounded-xl border border-border/60 bg-background px-2.5 py-1.5 shadow-xs">
                <input
                  type="date"
                  value={selectedDateId || ""}
                  onChange={(e) => handleSelectDate(e.target.value || null)}
                  className="bg-transparent text-xs font-semibold text-foreground focus:outline-none cursor-pointer w-28 sm:w-32"
                />
              </div>
            </div>

            {/* Horizontal Date Picker Strip */}
            <div className="flex-1 overflow-hidden flex items-center gap-2 min-w-0">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider shrink-0 select-none hidden sm:inline">
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
                    "snap-start shrink-0 px-4 py-1.5 rounded-xl border text-xs font-medium transition-all",
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
                        "snap-start shrink-0 flex flex-col items-center justify-center min-w-[60px] px-2 py-1.5 rounded-xl border text-center transition-all",
                        isSelected
                          ? "bg-primary border-primary text-primary-foreground shadow-sm scale-[1.02]"
                          : opt.isToday
                            ? "border-primary/50 bg-primary/[0.08] text-foreground font-semibold shadow-xs ring-1 ring-primary/30"
                            : "bg-background border-border text-muted-foreground hover:text-foreground hover:bg-muted/30"
                      )}
                    >
                      {opt.isToday ? (
                        <span
                          className={cn(
                            "text-[8px] font-extrabold uppercase tracking-tight px-1.5 py-0.5 rounded leading-none mb-0.5",
                            isSelected
                              ? "bg-white/25 text-white"
                              : "bg-primary text-primary-foreground"
                          )}
                        >
                          Hari Ini
                        </span>
                      ) : (
                        <span className="text-[10px] uppercase font-semibold opacity-70 leading-none mb-0.5">
                          {opt.dayName}
                        </span>
                      )}
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
          <CardHeader className="p-3 sm:p-5 pb-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <TabsList className="h-9 w-full sm:w-auto grid grid-cols-3 sm:flex">
                <TabsTrigger value="all" className="text-xs gap-1.5">
                  Semua
                  {orders && <span className="rounded-full bg-muted-foreground/20 px-1.5 py-0.5 text-[10px] font-medium">{statusCounts?.allCount ?? orders.length}</span>}
                </TabsTrigger>
                <TabsTrigger value="paid" className="text-xs gap-1.5">
                  Lunas
                  {paidCount > 0 && <span className="rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 px-1.5 py-0.5 text-[10px] font-medium">{paidCount}</span>}
                </TabsTrigger>
                <TabsTrigger value="unpaid" className="text-xs gap-1.5">
                  Belum Lunas
                  {unpaidCount > 0 && <span className="rounded-full bg-red-500/20 text-red-700 dark:text-red-400 px-1.5 py-0.5 text-[10px] font-medium">{unpaidCount}</span>}
                </TabsTrigger>
              </TabsList>

              {/* Search Bar */}
              <div className="relative w-full sm:w-72 shrink-0">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Cari invoice atau pelanggan..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 h-9 text-xs rounded-xl border-border/60"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="space-y-px px-4 sm:px-6 pb-4">
                <TableSkeleton rows={6} rowClassName="h-14 w-full rounded-lg" />
              </div>
            ) : (
              <>
                {/* Mobile Card List */}
                <div className="divide-y divide-border/60 md:hidden">
                  {isInfiniteLoading ? (
                    <div className="space-y-px p-4">
                      <TableSkeleton rows={4} rowClassName="h-20 w-full rounded-xl" />
                    </div>
                  ) : !mobileOrders || mobileOrders.length === 0 ? (
                    <div className="py-16 text-center">
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <Receipt className="h-10 w-10 opacity-20" />
                        <p className="text-sm font-medium">Tidak ada transaksi</p>
                        <p className="text-xs">Coba ubah filter pencarian</p>
                      </div>
                    </div>
                  ) : (
                    <>
                      {mobileOrders.map((order) => {
                        const isPaid = order.transaction_status === "paid";
                        const isUnpaid = order.transaction_status === "unpaid";
                        const isHalf = order.transaction_status === "half_payment";

                        return (
                          <div
                            key={order.id}
                            onClick={() => setSelectedOrderId(order.id)}
                            className={cn(
                              "p-3.5 transition-colors active:bg-muted/40 cursor-pointer space-y-2.5",
                              isPaid && "bg-emerald-50/40 dark:bg-emerald-950/10",
                              isUnpaid && "bg-red-50/40 dark:bg-red-950/10",
                              isHalf && "bg-amber-50/40 dark:bg-amber-950/10"
                            )}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <span className="font-mono text-xs font-bold text-foreground truncate">
                                  {order.invoice_number}
                                </span>
                                <span className="text-[11px] text-muted-foreground shrink-0">
                                  • {new Date(order.sales_date).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                                </span>
                              </div>
                              <TransactionStatusBadge status={order.transaction_status} />
                            </div>

                            <div className="flex items-baseline justify-between gap-3">
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-semibold text-foreground truncate">
                                  {order.customer?.name || order.customer_name || "Pelanggan Umum"}
                                </p>
                                {(order.customer?.address || order.customer_address) && (
                                  <p className="text-[11px] text-muted-foreground truncate leading-tight mt-0.5">
                                    {order.customer?.address || order.customer_address}
                                  </p>
                                )}
                              </div>
                              <div className="text-right shrink-0">
                                <span className="text-sm font-bold text-foreground">
                                  {formatCurrency(order.grand_total)}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center justify-between pt-0.5">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <span className="inline-flex items-center rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium text-foreground border border-border/40">
                                  {order.payment_method?.name || "Tunai"}
                                </span>
                                <DeliveryBadge type={order.delivery_types} driverName={getDriverName(order.driver_id)} />
                              </div>
                              <div className="flex items-center text-[11px] font-medium text-primary gap-0.5">
                                <span>Detail</span>
                                <ChevronRight className="h-3.5 w-3.5" />
                              </div>
                            </div>
                          </div>
                        );
                      })}

                      {/* Sentinel for infinite scroll */}
                      <div ref={loadMoreRef} className="py-3 text-center">
                        {isFetchingNextPage && (
                          <div className="flex items-center justify-center gap-2 py-2 text-xs text-muted-foreground">
                            <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                            <span>Memuat transaksi lainnya...</span>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>

                {/* Desktop Table View */}
                <div className="hidden md:block">
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
                              <TableCell className="max-w-[180px]">
                                <p className="text-sm font-medium truncate">{order.customer?.name || order.customer_name || "-"}</p>
                                {(order.customer?.address || order.customer_address) && (
                                  <p className="text-xs text-muted-foreground truncate leading-snug">
                                    {order.customer?.address || order.customer_address}
                                  </p>
                                )}
                              </TableCell>
                              <TableCell>
                                <span className="text-sm">{order.payment_method?.name || "-"}</span>
                              </TableCell>
                              <TableCell>
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
                </div>
              </>
            )}
            {/* Pagination */}
            {!isLoading && totalCount > 0 && (
              <div className="hidden md:flex items-center justify-between border-t px-6 py-3">
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
        <DialogContent className="max-w-2xl gap-0 p-0 overflow-hidden rounded-2xl">
          <DialogHeader className="px-5 py-4 border-b">
            <DialogTitle className="flex items-center gap-2 text-base">
              <Receipt className="h-4 w-4 text-primary" /> Detail Transaksi
            </DialogTitle>
          </DialogHeader>

          {detailLoading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
            </div>
          ) : detail ? (
            <div className="overflow-y-auto max-h-[80vh]">
              {/* Order Header Summary */}
              <div className="bg-muted/40 p-4 sm:p-5 border-b border-border/50">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-sm sm:text-base font-bold text-foreground">{detail.invoice_number}</span>
                      <TransactionStatusBadge status={detail.transaction_status} />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(detail.sales_date).toLocaleDateString("id-ID", {
                        day: "2-digit",
                        month: "long",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>

                  <div className="text-left sm:text-right">
                    <span className="text-xs text-muted-foreground">Grand Total</span>
                    <p className="text-lg sm:text-xl font-extrabold text-foreground font-mono">
                      {formatCurrency(detail.grand_total)}
                    </p>
                  </div>
                </div>

                {/* Quick Meta Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-4 pt-3.5 border-t border-border/50 text-xs">
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase font-semibold">Pelanggan</p>
                    <p className="font-semibold text-foreground truncate mt-0.5">
                      {detail.customer?.name || detail.customer_name || "Pelanggan Umum"}
                    </p>
                    {detail.customer_phone && (
                      <p className="text-[11px] text-muted-foreground font-mono">{detail.customer_phone}</p>
                    )}
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase font-semibold">Metode Bayar</p>
                    <p className="font-semibold text-foreground mt-0.5">{detail.payment_method?.name || "Tunai"}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase font-semibold">Pengiriman</p>
                    <div className="mt-0.5">
                      <DeliveryBadge type={detail.delivery_types} driverName={getDriverName(detail.driver_id)} />
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase font-semibold">Status Bayar</p>
                    <p className={cn("font-bold mt-0.5", detail.unpaid_transaction <= 0 ? "text-emerald-600" : "text-destructive")}>
                      {detail.unpaid_transaction <= 0 ? "Lunas" : `Sisa ${formatCurrency(detail.unpaid_transaction)}`}
                    </p>
                  </div>
                </div>

                {(detail.customer?.address || detail.customer_address) && (
                  <div className="mt-3 pt-2.5 border-t border-border/40 text-xs">
                    <span className="text-[10px] text-muted-foreground uppercase font-semibold">Alamat: </span>
                    <span className="text-foreground">{detail.customer?.address || detail.customer_address}</span>
                  </div>
                )}
              </div>

              {/* Items */}
              <div className="p-4 sm:p-5">
                <p className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                  <Package className="h-3.5 w-3.5" /> Produk Dibeli ({detail.items?.length || 0})
                </p>

                {/* Mobile Item Cards */}
                <div className="space-y-2.5 md:hidden">
                  {detail.items?.map((item) => {
                    const st: string = item.delivery_status ?? "pending";
                    const hasDiscount = item.discount > 0;

                    return (
                      <div key={item.id} className="rounded-xl border border-border/60 bg-card p-3 space-y-2 shadow-xs">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold text-foreground leading-snug">
                              {item.product?.name}
                              {item.product_variant ? ` (${item.product_variant.name})` : ""}
                            </p>
                            {item.product?.product_code && (
                              <p className="text-[10px] text-muted-foreground font-mono mt-0.5">{item.product.product_code}</p>
                            )}
                          </div>
                          <span className="font-mono text-xs font-bold text-foreground shrink-0">
                            {formatCurrency(item.subtotal)}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-xs text-muted-foreground pt-1.5 border-t border-border/40">
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-foreground">{item.qty} pcs</span>
                            <span>×</span>
                            <span>{formatCurrency(item.price)}</span>
                            {hasDiscount && (
                              <span className="text-[10px] text-destructive font-medium bg-destructive/10 px-1 py-0.2 rounded">
                                -{formatCurrency(item.discount)}
                              </span>
                            )}
                          </div>

                          <div>
                            {st === "in_delivery" || st === "delivered" ? (
                              <ItemDeliveryStatusBadge status={st} />
                            ) : (
                              <Select
                                value={st}
                                onValueChange={(v) =>
                                  updateItemStatus({ itemId: item.id, status: v as "pending" | "self_pickup" | "completed" })
                                }
                                disabled={itemStatusPending}
                              >
                                <SelectTrigger className="h-6 text-[10px] border border-border/60 px-2 py-0 shadow-none gap-1">
                                  <ItemDeliveryStatusBadge status={st} />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="pending">Pending</SelectItem>
                                  <SelectItem value="self_pickup">Ambil Sendiri</SelectItem>
                                  <SelectItem value="completed">Selesai</SelectItem>
                                </SelectContent>
                              </Select>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Desktop Item Table */}
                <div className="hidden md:block rounded-xl border overflow-hidden">
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
                            <p className="text-sm font-medium">
                              {item.product?.name}
                              {item.product_variant ? ` (${item.product_variant.name})` : ""}
                            </p>
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
                                    updateItemStatus({ itemId: item.id, status: v as "pending" | "self_pickup" | "completed" })
                                  }
                                  disabled={itemStatusPending}
                                >
                                  <SelectTrigger className="h-7 w-fit border-0 p-0 shadow-none focus:ring-0 [&>svg]:ml-1 gap-0">
                                    <ItemDeliveryStatusBadge status={st} />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="pending">Pending</SelectItem>
                                    <SelectItem value="self_pickup">Ambil Sendiri</SelectItem>
                                  <SelectItem value="completed">Selesai</SelectItem>
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

              {/* Totals Summary */}
              <div className="px-4 sm:px-6 py-3 border-t border-border/40 bg-muted/20">
                <div className="ml-auto max-w-xs space-y-1.5 text-xs">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Total Harga Produk</span>
                    <span className="text-foreground font-mono">{formatCurrency(detail.total_amount)}</span>
                  </div>
                  {detail.total_discount > 0 && (
                    <div className="flex justify-between text-muted-foreground">
                      <span>Total Diskon</span>
                      <span className="text-destructive font-mono">− {formatCurrency(detail.total_discount)}</span>
                    </div>
                  )}
                  {detail.delivery_fee > 0 && (
                    <div className="flex justify-between text-muted-foreground">
                      <span className="flex items-center gap-1"><Truck className="h-3 w-3" /> Biaya Kirim</span>
                      <span className="text-foreground font-mono">+ {formatCurrency(detail.delivery_fee)}</span>
                    </div>
                  )}
                  <div className="flex justify-between rounded-xl bg-primary/10 px-3.5 py-2 font-bold text-sm text-foreground border border-primary/20 mt-1">
                    <span>Grand Total</span>
                    <span className="font-mono text-primary">{formatCurrency(detail.grand_total)}</span>
                  </div>
                </div>

                {detail.notes && (
                  <div className="mt-3 flex gap-2 rounded-xl border border-amber-200 bg-amber-50/70 px-3 py-2 text-xs dark:border-amber-800 dark:bg-amber-950/30">
                    <span className="text-amber-600 shrink-0">📝</span>
                    <div className="min-w-0">
                      <p className="font-semibold text-amber-800 dark:text-amber-300 text-[11px]">Catatan:</p>
                      <p className="text-amber-900 dark:text-amber-200 text-xs break-words">{detail.notes}</p>
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
              <div className="border-t px-4 sm:px-6 py-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-wide">
                    <History className="h-3.5 w-3.5" /> Riwayat Pembayaran
                  </p>
                  {paymentLogs && paymentLogs.length > 0 && (
                    <span className="text-[10px] font-semibold text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                      {paymentLogs.length} transaksi
                    </span>
                  )}
                </div>

                {logsLoading ? (
                  <div className="space-y-2">
                    {[1, 2].map((i) => <Skeleton key={i} className="h-12 w-full rounded-xl" />)}
                  </div>
                ) : !paymentLogs || paymentLogs.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-border/70 p-4 text-center">
                    <p className="text-xs text-muted-foreground">Belum ada pembayaran yang dicatat.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {paymentLogs.map((log) => (
                      <div
                        key={log.id}
                        className="flex items-center justify-between gap-3 rounded-xl border border-border/50 bg-card/60 p-3 hover:bg-muted/30 transition-colors shadow-2xs"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">
                            <Coins className="h-4 w-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-semibold text-foreground truncate">
                              {log.notes || "Pembayaran Masuk"}
                            </p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">
                              {new Date(log.paid_at).toLocaleString("id-ID", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </p>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="font-mono text-xs sm:text-sm font-bold text-emerald-600 dark:text-emerald-400">
                            + {formatCurrency(log.amount)}
                          </span>
                        </div>
                      </div>
                    ))}
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
