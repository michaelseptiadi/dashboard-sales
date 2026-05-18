import { useState, useEffect, useMemo } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Separator } from "@/components/ui/separator";
import { TableSkeleton } from "@/components/TableSkeleton";
import { CurrencyInput } from "@/components/ui/currency-input";
import { formatCurrency } from "@/lib/format";
import { useToast } from "@/hooks/use-toast";
import { useDrivers } from "@/hooks/useMasterData";
import {
  useDeliveries,
  useDeliveryDetail,
  useSalesOrdersForDelivery,
  useCreateDelivery,
  useUpdateDelivery,
  useUpdateDeliveryStatus,
  useDeleteDelivery,
  type Delivery,
  type DeliveryStatus,
  type SalesOrderForDelivery,
} from "@/hooks/useDeliveries";
import {
  Plus, Pencil, Trash2, Truck, Search, X, ChevronDown,
  Package, CheckCircle2, Clock, AlertCircle, RefreshCw, Eye,
} from "lucide-react";

// ── Helpers ───────────────────────────────────────────────────────────────────

const DELIVERY_STATUS_CONFIG: Record<
  DeliveryStatus,
  { label: string; className: string; icon: React.ReactNode }
> = {
  pending: {
    label: "Menunggu",
    className: "bg-amber-100 text-amber-700 border-amber-200",
    icon: <Clock className="h-3 w-3" />,
  },
  in_progress: {
    label: "Dalam Perjalanan",
    className: "bg-blue-100 text-blue-700 border-blue-200",
    icon: <Truck className="h-3 w-3" />,
  },
  delivered: {
    label: "Terkirim",
    className: "bg-emerald-100 text-emerald-700 border-emerald-200",
    icon: <CheckCircle2 className="h-3 w-3" />,
  },
  failed: {
    label: "Gagal",
    className: "bg-red-100 text-red-700 border-red-200",
    icon: <AlertCircle className="h-3 w-3" />,
  },
};

const ITEM_DELIVERY_STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  pending:     { label: "Belum",         className: "bg-slate-100 text-slate-600 border-slate-200" },
  in_delivery: { label: "Dalam Pengiriman", className: "bg-blue-100 text-blue-700 border-blue-200" },
  delivered:   { label: "Terkirim",      className: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  self_pickup: { label: "Ambil Sendiri", className: "bg-purple-100 text-purple-700 border-purple-200" },
};

function DeliveryStatusBadge({ status }: { status: DeliveryStatus | string }) {
  const cfg = DELIVERY_STATUS_CONFIG[status as DeliveryStatus] ?? {
    label: status,
    className: "",
    icon: null,
  };
  return (
    <Badge variant="outline" className={`flex items-center gap-1 text-xs font-medium ${cfg.className}`}>
      {cfg.icon}
      {cfg.label}
    </Badge>
  );
}

function ItemDeliveryStatusBadge({ status }: { status: string }) {
  const cfg = ITEM_DELIVERY_STATUS_CONFIG[status] ?? { label: status, className: "" };
  return (
    <Badge variant="outline" className={`text-xs font-medium ${cfg.className}`}>
      {cfg.label}
    </Badge>
  );
}

// ── Form state types ───────────────────────────────────────────────────────────

interface FormOrderEntry {
  order: SalesOrderForDelivery;
  selectedItemIds: Set<string>;
}

const pad = (n: number) => String(n).padStart(2, "0");
const nowDatetimeLocal = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
const toDatetimeLocal = (iso: string): string => {
  const d = new Date(iso);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
const formatDateTime = (iso: string): string =>
  new Date(iso).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" });

const today = nowDatetimeLocal();

function buildFormOrders(detail: ReturnType<typeof useDeliveryDetail>["data"]): FormOrderEntry[] {
  if (!detail) return [];
  const orderMap = new Map<string, FormOrderEntry>();

  for (const di of detail.delivery_items) {
    const orderId = di.sales_order_id;
    if (!orderMap.has(orderId)) {
      if (!di.sales_orders) continue;
      orderMap.set(orderId, {
        order: {
          id: orderId,
          invoice_number: di.sales_orders.invoice_number,
          customer_name: di.sales_orders.customer_name,
          customer_address: di.sales_orders.customer_address,
          sales_date: di.sales_orders.sales_date,
          delivery_status: "",
          sales_items: [],
        },
        selectedItemIds: new Set(),
      });
    }
    const entry = orderMap.get(orderId)!;
    if (di.sales_items) {
      // Avoid duplicates
      if (!entry.order.sales_items.find((s) => s.id === di.sales_items!.id)) {
        entry.order.sales_items.push(di.sales_items);
      }
      entry.selectedItemIds.add(di.sales_item_id);
    }
  }

  return Array.from(orderMap.values());
}

// ── TransactionPicker dialog ───────────────────────────────────────────────────

interface TransactionPickerProps {
  open: boolean;
  onClose: () => void;
  onAdd: (order: SalesOrderForDelivery) => void;
  alreadySelectedIds: Set<string>;
}

function TransactionPicker({ open, onClose, onAdd, alreadySelectedIds }: TransactionPickerProps) {
  const [search, setSearch] = useState("");
  const { data: orders = [], isLoading } = useSalesOrdersForDelivery(search);

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Pilih Transaksi</DialogTitle>
        </DialogHeader>
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Cari no. invoice atau nama pelanggan..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-9 text-sm"
          />
        </div>
        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          {isLoading ? (
            <p className="text-sm text-muted-foreground text-center py-6">Memuat...</p>
          ) : orders.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Tidak ada transaksi ditemukan</p>
          ) : (
            orders.map((order) => {
              const pendingCount = order.sales_items.filter((i) => i.delivery_status === "pending").length;
              const isAdded = alreadySelectedIds.has(order.id);
              return (
                <div
                  key={order.id}
                  className={`rounded-lg border p-3 transition-colors ${
                    isAdded
                      ? "bg-muted/50 border-muted cursor-default opacity-60"
                      : "cursor-pointer hover:border-primary/50 hover:bg-accent/30"
                  }`}
                  onClick={() => { if (!isAdded) { onAdd(order); onClose(); } }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium">{order.invoice_number}</p>
                      <p className="text-xs text-muted-foreground">{order.customer_name ?? "—"}</p>
                      <p className="text-xs text-muted-foreground">{order.sales_date}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs text-muted-foreground">
                        {order.sales_items.length} item{order.sales_items.length !== 1 && "s"}
                      </p>
                      <p className="text-xs font-medium text-amber-600">{pendingCount} belum kirim</p>
                      {isAdded && <Badge variant="secondary" className="text-xs mt-1">Sudah dipilih</Badge>}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── DeliveryDetailDialog ───────────────────────────────────────────────────────

function DeliveryDetailDialog({
  deliveryId,
  onClose,
}: {
  deliveryId: string | null;
  onClose: () => void;
}) {
  const { data: detail, isLoading } = useDeliveryDetail(deliveryId);

  const groupedByOrder = useMemo(() => {
    if (!detail) return [];
    const map = new Map<string, { invoiceNumber: string; customerName: string; items: typeof detail.delivery_items }>();
    for (const di of detail.delivery_items) {
      if (!di.sales_orders) continue;
      const oid = di.sales_order_id;
      if (!map.has(oid)) {
        map.set(oid, {
          invoiceNumber: di.sales_orders.invoice_number,
          customerName: di.sales_orders.customer_name ?? "—",
          items: [],
        });
      }
      map.get(oid)!.items.push(di);
    }
    return Array.from(map.values());
  }, [detail]);

  return (
    <Dialog open={!!deliveryId} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Truck className="h-4 w-4" />
            {isLoading ? "Memuat..." : detail?.delivery_number ?? "Detail Pengiriman"}
          </DialogTitle>
        </DialogHeader>
        {isLoading ? (
          <p className="text-sm text-muted-foreground py-6 text-center">Memuat detail...</p>
        ) : detail ? (
          <div className="flex-1 overflow-y-auto space-y-4">
            {/* Info row */}
            <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                <span className="text-muted-foreground">Tanggal</span>
                <p className="font-medium">{formatDateTime(detail.delivery_date)}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Status</span>
                <div className="mt-0.5"><DeliveryStatusBadge status={detail.delivery_status} /></div>
              </div>
              <div>
                <span className="text-muted-foreground">Driver</span>
                <p className="font-medium">{detail.drivers?.driver_name ?? "—"}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Ritase</span>
                <p className="font-medium">{formatCurrency(detail.ritase_fee)}</p>
              </div>
              {detail.notes && (
                <div className="col-span-2">
                  <span className="text-muted-foreground">Catatan</span>
                  <p className="font-medium">{detail.notes}</p>
                </div>
              )}
            </div>
            <Separator />
            {/* Items grouped by order */}
            <div className="space-y-4">
              {groupedByOrder.map((group) => (
                <div key={group.invoiceNumber} className="rounded-lg border p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold">{group.invoiceNumber}</p>
                      <p className="text-xs text-muted-foreground">{group.customerName}</p>
                    </div>
                    <Badge variant="outline" className="text-xs">{group.items.length} item</Badge>
                  </div>
                  <div className="rounded border overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/30">
                          <TableHead className="text-xs py-2">Produk</TableHead>
                          <TableHead className="text-xs py-2 text-right">Qty</TableHead>
                          <TableHead className="text-xs py-2 text-right">Subtotal</TableHead>
                          <TableHead className="text-xs py-2">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {group.items.map((di) => (
                          <TableRow key={di.id}>
                            <TableCell className="text-xs py-1.5">
                              <p>{di.sales_items?.products?.name ?? "—"}</p>
                              <p className="text-muted-foreground">{di.sales_items?.products?.product_code ?? ""}</p>
                            </TableCell>
                            <TableCell className="text-xs py-1.5 text-right">{di.sales_items?.qty ?? "—"}</TableCell>
                            <TableCell className="text-xs py-1.5 text-right">
                              {di.sales_items ? formatCurrency(di.sales_items.subtotal) : "—"}
                            </TableCell>
                            <TableCell className="text-xs py-1.5">
                              <ItemDeliveryStatusBadge status={di.sales_items?.delivery_status ?? "pending"} />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground py-6 text-center">Data tidak ditemukan</p>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function Pengiriman() {
  const { toast } = useToast();
  const { data: drivers = [] } = useDrivers();

  // ── Filters ──
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [filterDriver, setFilterDriver] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  const { data: deliveries = [], isLoading } = useDeliveries({
    dateFrom: filterDateFrom,
    dateTo: filterDateTo,
    driverId: filterDriver || undefined,
    status: filterStatus || undefined,
  });

  const activeFilterCount = [filterDateFrom, filterDateTo, filterDriver, filterStatus].filter(Boolean).length;

  const resetFilters = () => {
    setFilterDateFrom(""); setFilterDateTo("");
    setFilterDriver(""); setFilterStatus("");
  };

  // ── Sheet / Form state ──
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [transPickerOpen, setTransPickerOpen] = useState(false);

  // Form fields
  const [formDate, setFormDate] = useState(today);
  const [formDriver, setFormDriver] = useState("");
  const [formRitase, setFormRitase] = useState(0);
  const [formNotes, setFormNotes] = useState("");
  const [formOrders, setFormOrders] = useState<FormOrderEntry[]>([]);

  // Load detail for edit
  const { data: editDetail, isLoading: editLoading } = useDeliveryDetail(editId);

  useEffect(() => {
    if (editDetail && editId) {
      setFormDate(toDatetimeLocal(editDetail.delivery_date));
      setFormDriver(editDetail.driver_id ?? "");
      setFormRitase(editDetail.ritase_fee ?? 0);
      setFormNotes(editDetail.notes ?? "");
      setFormOrders(buildFormOrders(editDetail));
    }
  }, [editDetail, editId]);

  const openCreate = () => {
    setEditId(null);
    setFormDate(today);
    setFormDriver("");
    setFormRitase(0);
    setFormNotes("");
    setFormOrders([]);
    setSheetOpen(true);
  };

  const openEdit = (delivery: Delivery) => {
    setEditId(delivery.id);
    setFormDate(delivery.delivery_date ? toDatetimeLocal(delivery.delivery_date) : today);
    setFormDriver(delivery.driver_id ?? "");
    setFormRitase(delivery.ritase_fee ?? 0);
    setFormNotes(delivery.notes ?? "");
    setFormOrders([]); // will be populated by useEffect when editDetail loads
    setSheetOpen(true);
  };

  const closeSheet = () => {
    setSheetOpen(false);
    setEditId(null);
    setFormOrders([]);
  };

  // ── Order/item selection ──
  const alreadySelectedOrderIds = useMemo(
    () => new Set(formOrders.map((e) => e.order.id)),
    [formOrders]
  );

  const addOrderToForm = (order: SalesOrderForDelivery) => {
    if (alreadySelectedOrderIds.has(order.id)) return;
    // Pre-select only 'pending' items
    const pendingIds = new Set(
      order.sales_items
        .filter((i) => i.delivery_status === "pending")
        .map((i) => i.id)
    );
    setFormOrders((prev) => [...prev, { order, selectedItemIds: pendingIds }]);
  };

  const removeOrderFromForm = (orderId: string) => {
    setFormOrders((prev) => prev.filter((e) => e.order.id !== orderId));
  };

  const toggleItem = (orderId: string, itemId: string) => {
    setFormOrders((prev) =>
      prev.map((e) => {
        if (e.order.id !== orderId) return e;
        const next = new Set(e.selectedItemIds);
        if (next.has(itemId)) next.delete(itemId);
        else next.add(itemId);
        return { ...e, selectedItemIds: next };
      })
    );
  };

  // ── Mutations ──
  const createDelivery = useCreateDelivery();
  const updateDelivery = useUpdateDelivery();

  const handleSave = async () => {
    if (!formDate) {
      toast({ title: "Tanggal pengiriman wajib diisi", variant: "destructive" });
      return;
    }
    const items = formOrders.flatMap((e) =>
      [...e.selectedItemIds].map((itemId) => ({
        sales_order_id: e.order.id,
        sales_item_id:  itemId,
      }))
    );
    if (!formDriver) {
      toast({ title: "Driver wajib dipilih", variant: "destructive" });
      return;
    }
    if (items.length === 0) {
      toast({ title: "Pilih minimal satu item untuk dikirim", variant: "destructive" });
      return;
    }

    try {
      if (editId) {
        await updateDelivery.mutateAsync({
          id: editId,
          delivery_date: formDate,
          driver_id: formDriver,
          ritase_fee: formRitase,
          notes: formNotes || null,
          newItems: items,
        });
        toast({ title: "Pengiriman berhasil diperbarui" });
      } else {
        await createDelivery.mutateAsync({
          p_delivery_date: formDate,
          p_driver_id: formDriver,
          p_ritase_fee: formRitase,
          p_notes: formNotes || null,
          p_items: items,
        });
        toast({ title: "Pengiriman berhasil dibuat" });
      }
      closeSheet();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Terjadi kesalahan";
      toast({ title: "Gagal menyimpan", description: msg, variant: "destructive" });
    }
  };

  const isPending = createDelivery.isPending || updateDelivery.isPending;

  // ── Status update ──
  const updateStatus = useUpdateDeliveryStatus();

  const handleStatusChange = async (delivery: Delivery, status: DeliveryStatus) => {
    try {
      await updateStatus.mutateAsync({ id: delivery.id, status });
      toast({ title: `Status diubah ke "${DELIVERY_STATUS_CONFIG[status].label}"` });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Terjadi kesalahan";
      toast({ title: "Gagal mengubah status", description: msg, variant: "destructive" });
    }
  };

  // ── Delete ──
  const [deleteTarget, setDeleteTarget] = useState<Delivery | null>(null);
  const deleteDelivery = useDeleteDelivery();

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteDelivery.mutateAsync(deleteTarget.id);
      toast({ title: "Pengiriman dihapus" });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Terjadi kesalahan";
      toast({ title: "Gagal menghapus", description: msg, variant: "destructive" });
    } finally {
      setDeleteTarget(null);
    }
  };

  // ── Detail view ──
  const [detailId, setDetailId] = useState<string | null>(null);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <DashboardLayout title="Pengiriman">
      <div className="space-y-5">

        {/* ── Filter bar ── */}
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex flex-wrap items-end gap-3">
              <div className="flex flex-col gap-1">
                <Label className="text-xs">Dari Tanggal</Label>
                <Input type="date" value={filterDateFrom} onChange={(e) => setFilterDateFrom(e.target.value)} className="h-9 text-sm w-36" />
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-xs">Sampai Tanggal</Label>
                <Input type="date" value={filterDateTo} onChange={(e) => setFilterDateTo(e.target.value)} className="h-9 text-sm w-36" />
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-xs">Driver</Label>
                <Select value={filterDriver || "__all__"} onValueChange={(v) => setFilterDriver(v === "__all__" ? "" : v)}>
                  <SelectTrigger className="h-9 text-sm w-44">
                    <SelectValue placeholder="Semua Driver" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">Semua Driver</SelectItem>
                    {drivers.map((d) => (
                      <SelectItem key={d.id} value={d.id}>{d.driver_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-xs">Status</Label>
                <Select value={filterStatus || "__all__"} onValueChange={(v) => setFilterStatus(v === "__all__" ? "" : v)}>
                  <SelectTrigger className="h-9 text-sm w-44">
                    <SelectValue placeholder="Semua Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">Semua Status</SelectItem>
                    {(Object.keys(DELIVERY_STATUS_CONFIG) as DeliveryStatus[]).map((s) => (
                      <SelectItem key={s} value={s}>{DELIVERY_STATUS_CONFIG[s].label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {activeFilterCount > 0 && (
                <Button variant="ghost" size="sm" onClick={resetFilters} className="h-9 gap-1 text-muted-foreground">
                  <X className="h-3.5 w-3.5" />
                  Reset ({activeFilterCount})
                </Button>
              )}
              <div className="ml-auto">
                <Button onClick={openCreate} className="h-9 gap-2">
                  <Plus className="h-4 w-4" />
                  Buat Pengiriman
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── Table ── */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-4"><TableSkeleton rows={5} /></div>
            ) : deliveries.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Truck className="h-10 w-10 text-muted-foreground/30 mb-3" />
                <p className="text-sm font-medium text-muted-foreground">Belum ada data pengiriman</p>
                <p className="text-xs text-muted-foreground/70 mt-1">Klik "Buat Pengiriman" untuk memulai</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30">
                      <TableHead className="text-xs font-semibold">No. Pengiriman</TableHead>
                      <TableHead className="text-xs font-semibold">Tanggal</TableHead>
                      <TableHead className="text-xs font-semibold">Driver</TableHead>
                      <TableHead className="text-xs font-semibold text-right">Ritase</TableHead>
                      <TableHead className="text-xs font-semibold text-center"># Transaksi</TableHead>
                      <TableHead className="text-xs font-semibold text-center"># Item</TableHead>
                      <TableHead className="text-xs font-semibold">Status</TableHead>
                      <TableHead className="text-xs font-semibold text-right">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {deliveries.map((delivery) => {
                      const uniqueOrders = new Set(
                        (delivery.delivery_items ?? []).map((di) => di.sales_order_id)
                      ).size;
                      const itemCount = (delivery.delivery_items ?? []).length;
                      const driverName = delivery.drivers?.driver_name
                        ?? drivers.find((d) => d.id === delivery.driver_id)?.driver_name
                        ?? "—";

                      return (
                        <TableRow key={delivery.id} className="hover:bg-muted/20">
                          <TableCell className="text-sm font-medium">{delivery.delivery_number}</TableCell>
                          <TableCell className="text-sm">{formatDateTime(delivery.delivery_date)}</TableCell>
                          <TableCell className="text-sm">{driverName}</TableCell>
                          <TableCell className="text-sm text-right">{formatCurrency(delivery.ritase_fee)}</TableCell>
                          <TableCell className="text-sm text-center">
                            <Badge variant="outline" className="text-xs">{uniqueOrders}</Badge>
                          </TableCell>
                          <TableCell className="text-sm text-center">
                            <Badge variant="outline" className="text-xs">{itemCount}</Badge>
                          </TableCell>
                          <TableCell>
                            <Select
                              value={delivery.delivery_status}
                              onValueChange={(v) => handleStatusChange(delivery, v as DeliveryStatus)}
                              disabled={delivery.delivery_status === "delivered"}
                            >
                              <SelectTrigger className="h-7 w-fit border-0 p-0 shadow-none focus:ring-0 [&>svg]:ml-1 gap-0">
                                <DeliveryStatusBadge status={delivery.delivery_status} />
                              </SelectTrigger>
                              <SelectContent>
                                {(Object.keys(DELIVERY_STATUS_CONFIG) as DeliveryStatus[]).map((s) => (
                                  <SelectItem key={s} value={s}>
                                    <div className="flex items-center gap-2">
                                      {DELIVERY_STATUS_CONFIG[s].icon}
                                      {DELIVERY_STATUS_CONFIG[s].label}
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                title="Lihat detail"
                                onClick={() => setDetailId(delivery.id)}
                              >
                                <Eye className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                title="Edit"
                                onClick={() => openEdit(delivery)}
                                disabled={delivery.delivery_status === "delivered"}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-destructive hover:text-destructive"
                                title="Hapus"
                                onClick={() => setDeleteTarget(delivery)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Create / Edit Sheet ───────────────────────────────────────────────── */}
      <Sheet open={sheetOpen} onOpenChange={(o) => { if (!o) closeSheet(); }}>
        <SheetContent side="right" className="w-full sm:max-w-2xl flex flex-col p-0 overflow-hidden">
          <SheetHeader className="px-6 py-4 border-b shrink-0">
            <SheetTitle className="flex items-center gap-2">
              <Truck className="h-4 w-4" />
              {editId ? "Edit Pengiriman" : "Buat Pengiriman"}
            </SheetTitle>
          </SheetHeader>

          {editId && editLoading ? (
            <div className="flex-1 flex items-center justify-center">
              <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto">
              {/* ── Basic info ── */}
              <div className="px-6 py-5 space-y-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Informasi Pengiriman</p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-sm">Tanggal & Waktu Pengiriman *</Label>
                    <Input
                      type="datetime-local"
                      value={formDate}
                      onChange={(e) => setFormDate(e.target.value)}
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm">Driver *</Label>
                    <Select value={formDriver || ""} onValueChange={setFormDriver}>
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Pilih Driver" />
                      </SelectTrigger>
                      <SelectContent>
                        {drivers.map((d) => (
                          <SelectItem key={d.id} value={d.id}>{d.driver_name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm">Ritase (Insentif Driver)</Label>
                    <CurrencyInput value={formRitase} onChange={setFormRitase} className="h-9" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm">Catatan</Label>
                    <Input
                      value={formNotes}
                      onChange={(e) => setFormNotes(e.target.value)}
                      placeholder="Opsional..."
                      className="h-9"
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* ── Transactions & Items ── */}
              <div className="px-6 py-5 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Transaksi & Item ({formOrders.reduce((s, e) => s + e.selectedItemIds.size, 0)} item dipilih)
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setTransPickerOpen(true)}
                    className="h-8 gap-1.5 text-xs"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Tambah Transaksi
                  </Button>
                </div>

                {formOrders.length === 0 ? (
                  <div className="rounded-lg border-2 border-dashed border-muted-foreground/20 p-8 text-center">
                    <Package className="h-8 w-8 mx-auto text-muted-foreground/30 mb-2" />
                    <p className="text-sm text-muted-foreground">Belum ada transaksi dipilih</p>
                    <p className="text-xs text-muted-foreground/70 mt-1">Klik "Tambah Transaksi" untuk memilih</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {formOrders.map((entry) => (
                      <div key={entry.order.id} className="rounded-lg border">
                        {/* Order header */}
                        <div className="flex items-center justify-between px-3 py-2 bg-muted/30 rounded-t-lg border-b">
                          <div>
                            <p className="text-sm font-semibold">{entry.order.invoice_number}</p>
                            <p className="text-xs text-muted-foreground">{entry.order.customer_name ?? "—"}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              {entry.selectedItemIds.size}/{entry.order.sales_items.length} item
                            </Badge>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-muted-foreground hover:text-destructive"
                              onClick={() => removeOrderFromForm(entry.order.id)}
                            >
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                        {/* Items */}
                        <div className="divide-y">
                          {entry.order.sales_items.map((item) => {
                            const isChecked = entry.selectedItemIds.has(item.id);
                            const isDisabled = item.delivery_status === "delivered" || item.delivery_status === "in_delivery";
                            return (
                              <div
                                key={item.id}
                                className={`flex items-center gap-3 px-3 py-2 ${isDisabled ? "opacity-50" : "hover:bg-muted/20"}`}
                              >
                                <Checkbox
                                  checked={isChecked}
                                  onCheckedChange={() => !isDisabled && toggleItem(entry.order.id, item.id)}
                                  disabled={isDisabled}
                                />
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm truncate">{item.products?.name ?? "—"}</p>
                                  <p className="text-xs text-muted-foreground">{item.products?.product_code}</p>
                                </div>
                                <div className="text-right shrink-0">
                                  <p className="text-xs font-medium">Qty: {item.qty}</p>
                                  <p className="text-xs text-muted-foreground">{formatCurrency(item.subtotal)}</p>
                                </div>
                                <ItemDeliveryStatusBadge status={item.delivery_status} />
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Footer actions ── */}
          <div className="border-t px-6 py-4 shrink-0 flex items-center justify-end gap-3 bg-background">
            <Button variant="outline" onClick={closeSheet} disabled={isPending}>
              Batal
            </Button>
            <Button onClick={handleSave} disabled={isPending || (editId ? editLoading : false)}>
              {isPending ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : null}
              {editId ? "Simpan Perubahan" : "Buat Pengiriman"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* ── Transaction Picker Dialog ── */}
      <TransactionPicker
        open={transPickerOpen}
        onClose={() => setTransPickerOpen(false)}
        onAdd={addOrderToForm}
        alreadySelectedIds={alreadySelectedOrderIds}
      />

      {/* ── Detail Dialog ── */}
      <DeliveryDetailDialog deliveryId={detailId} onClose={() => setDetailId(null)} />

      {/* ── Delete Confirmation ── */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Pengiriman?</AlertDialogTitle>
            <AlertDialogDescription>
              Pengiriman <strong>{deleteTarget?.delivery_number}</strong> akan dihapus. Item yang sudah
              di-assign ke pengiriman ini akan dikembalikan ke status "Belum Kirim". Tindakan ini tidak
              dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
