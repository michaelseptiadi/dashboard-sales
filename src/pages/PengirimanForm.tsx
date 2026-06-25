import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { formatCurrency } from "@/lib/format";
import { useToast } from "@/hooks/use-toast";
import { useDrivers } from "@/hooks/useMasterData";
import {
  useDeliveryDetail,
  useSalesOrdersForDelivery,
  useCreateDelivery,
  useUpdateDelivery,
  type SalesOrderForDelivery,
} from "@/hooks/useDeliveries";
import { ArrowLeft, Plus, Search, X, Package, RefreshCw, Truck } from "lucide-react";

// ── Ritase options (frontend-defined) ─────────────────────────────────────────

const RITASE_OPTIONS: { label: string; value: number }[] = [
  { label: "Rp 0 (Tidak ada)",  value: 0       },
  { label: "Rp 2.000",         value: 2000   },
  { label: "Rp 3.000",         value: 3000   },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

interface FormOrderEntry {
  order: SalesOrderForDelivery;
  selectedItemIds: Set<string>;
}

const ITEM_STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  pending:     { label: "Belum Dikirim",            className: "bg-slate-100 text-slate-600 border-slate-200"   },
  in_delivery: { label: "Dalam Pengiriman", className: "bg-blue-100 text-blue-700 border-blue-200"      },
  delivered:   { label: "Terkirim",         className: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  self_pickup: { label: "Ambil Sendiri",    className: "bg-purple-100 text-purple-700 border-purple-200" },
};

function ItemStatusBadge({ status }: { status: string }) {
  const cfg = ITEM_STATUS_CONFIG[status] ?? { label: status, className: "" };
  return (
    <Badge variant="outline" className={`text-xs font-medium whitespace-nowrap ${cfg.className}`}>
      {cfg.label}
    </Badge>
  );
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

/** If the stored fee isn't one of our preset options, fall back to 0. */
function normalizeRitase(fee: number): number {
  return RITASE_OPTIONS.some((o) => o.value === fee) ? fee : 0;
}

function buildFormOrders(
  detail: ReturnType<typeof useDeliveryDetail>["data"]
): FormOrderEntry[] {
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
  const { data: rawOrders = [], isLoading } = useSalesOrdersForDelivery(search);
  const orders = rawOrders.filter((o) => o.sales_items.some((i) => i.delivery_status === "pending"));

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

// ── Main Form Page ─────────────────────────────────────────────────────────────

export default function PengirimanForm() {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: drivers = [] } = useDrivers();

  const isEdit = Boolean(id);
  const today = nowDatetimeLocal();

  // ── Form state ──
  const [formDate, setFormDate]     = useState(today);
  const [formDriver, setFormDriver] = useState("");
  const [formRitase, setFormRitase] = useState(0);
  const [formNotes, setFormNotes]   = useState("");
  const [formOrders, setFormOrders] = useState<FormOrderEntry[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);

  // ── Load existing delivery for edit ──
  const { data: editDetail, isLoading: editLoading } = useDeliveryDetail(id ?? null);

  useEffect(() => {
    if (isEdit && editDetail) {
      setFormDate(toDatetimeLocal(editDetail.delivery_date));
      setFormDriver(editDetail.driver_id ?? "");
      setFormRitase(normalizeRitase(editDetail.ritase_fee ?? 0));
      setFormNotes(editDetail.notes ?? "");
      setFormOrders(buildFormOrders(editDetail));
    }
  }, [editDetail, isEdit]);

  // ── Order / item selection ──
  const alreadySelectedOrderIds = useMemo(
    () => new Set(formOrders.map((e) => e.order.id)),
    [formOrders]
  );

  const addOrder = (order: SalesOrderForDelivery) => {
    if (alreadySelectedOrderIds.has(order.id)) return;
    const pendingIds = new Set(
      order.sales_items.filter((i) => i.delivery_status === "pending").map((i) => i.id)
    );
    setFormOrders((prev) => [...prev, { order, selectedItemIds: pendingIds }]);
  };

  const removeOrder = (orderId: string) =>
    setFormOrders((prev) => prev.filter((e) => e.order.id !== orderId));

  const toggleItem = (orderId: string, itemId: string) =>
    setFormOrders((prev) =>
      prev.map((e) => {
        if (e.order.id !== orderId) return e;
        const next = new Set(e.selectedItemIds);
        if (next.has(itemId)) next.delete(itemId);
        else next.add(itemId);
        return { ...e, selectedItemIds: next };
      })
    );

  const totalItems = formOrders.reduce((s, e) => s + e.selectedItemIds.size, 0);

  // ── Mutations ──
  const createDelivery = useCreateDelivery();
  const updateDelivery = useUpdateDelivery();
  const isPending = createDelivery.isPending || updateDelivery.isPending;

  const handleSave = async () => {
    if (!formDate) {
      toast({ title: "Tanggal pengiriman wajib diisi", variant: "destructive" });
      return;
    }
    if (!formDriver) {
      toast({ title: "Driver wajib dipilih", variant: "destructive" });
      return;
    }
    const items = formOrders.flatMap((e) =>
      [...e.selectedItemIds].map((itemId) => ({
        sales_order_id: e.order.id,
        sales_item_id:  itemId,
      }))
    );
    if (items.length === 0) {
      toast({ title: "Pilih minimal satu item untuk dikirim", variant: "destructive" });
      return;
    }

    try {
      if (isEdit && id) {
        await updateDelivery.mutateAsync({
          id,
          delivery_date: formDate,
          driver_id:     formDriver,
          ritase_fee:    formRitase,
          notes:         formNotes || null,
          newItems:      items,
        });
        toast({ title: "Pengiriman berhasil diperbarui" });
      } else {
        await createDelivery.mutateAsync({
          p_delivery_date: formDate,
          p_driver_id:     formDriver,
          p_ritase_fee:    formRitase,
          p_notes:         formNotes || null,
          p_items:         items,
        });
        toast({ title: "Pengiriman berhasil dibuat" });
      }
      navigate("/pengiriman");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Terjadi kesalahan";
      toast({ title: "Gagal menyimpan", description: msg, variant: "destructive" });
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  const pageTitle = isEdit ? "Edit Pengiriman" : "Buat Pengiriman";

  return (
    <DashboardLayout title={pageTitle}>
      <div className="max-w-3xl mx-auto space-y-5">

        {/* ── Back button ── */}
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/pengiriman")}
            className="gap-1.5 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Kembali ke Pengiriman
          </Button>
        </div>

        {isEdit && editLoading ? (
          <div className="flex items-center justify-center py-24">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {/* ── Basic info card ── */}
            <Card>
              <CardContent className="pt-5 space-y-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Informasi Pengiriman
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Date */}
                  <div className="space-y-1.5">
                    <Label>Tanggal &amp; Waktu Pengiriman *</Label>
                    <Input
                      type="datetime-local"
                      value={formDate}
                      onChange={(e) => setFormDate(e.target.value)}
                      className="h-9"
                    />
                  </div>

                  {/* Driver */}
                  <div className="space-y-1.5">
                    <Label>Driver *</Label>
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

                  {/* Ritase */}
                  <div className="space-y-1.5">
                    <Label>Ritase (Insentif Driver)</Label>
                    <Select
                      value={String(formRitase)}
                      onValueChange={(v) => setFormRitase(Number(v))}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Pilih ritase..." />
                      </SelectTrigger>
                      <SelectContent>
                        {RITASE_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={String(opt.value)}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Notes */}
                  <div className="space-y-1.5">
                    <Label>Catatan</Label>
                    <Input
                      value={formNotes}
                      onChange={(e) => setFormNotes(e.target.value)}
                      placeholder="Opsional..."
                      className="h-9"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* ── Transactions & Items card ── */}
            <Card>
              <CardContent className="pt-5 space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Transaksi &amp; Item
                    {totalItems > 0 && (
                      <span className="ml-2 normal-case font-normal text-foreground">
                        ({totalItems} item dipilih)
                      </span>
                    )}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPickerOpen(true)}
                    className="h-8 gap-1.5 text-xs"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Tambah Transaksi
                  </Button>
                </div>

                {formOrders.length === 0 ? (
                  <div className="rounded-lg border-2 border-dashed border-muted-foreground/20 py-14 text-center">
                    <Package className="h-8 w-8 mx-auto text-muted-foreground/30 mb-2" />
                    <p className="text-sm text-muted-foreground">Belum ada transaksi dipilih</p>
                    <p className="text-xs text-muted-foreground/70 mt-1">
                      Klik "Tambah Transaksi" untuk memilih
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {formOrders.map((entry) => (
                      <div key={entry.order.id} className="rounded-lg border overflow-hidden">
                        {/* Order header */}
                        <div className="flex items-center justify-between px-4 py-2.5 bg-muted/40 border-b">
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
                              onClick={() => removeOrder(entry.order.id)}
                            >
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                        {/* Items */}
                        <div className="divide-y">
                          {entry.order.sales_items.map((item) => {
                            const isChecked  = entry.selectedItemIds.has(item.id);
                            const isDisabled = item.delivery_status !== "pending";
                            return (
                              <div
                                key={item.id}
                                className={`flex items-center gap-3 px-4 py-2.5 ${
                                  isDisabled ? "opacity-50" : "hover:bg-muted/20"
                                }`}
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
                                  {item.qty * item.price > item.subtotal ? (
                                    <div className="flex flex-col items-end">
                                      <span className="text-[10px] text-muted-foreground line-through font-normal">
                                        {formatCurrency(item.qty * item.price)}
                                      </span>
                                      <span className="text-xs font-semibold text-foreground">
                                        {formatCurrency(item.subtotal)}
                                      </span>
                                    </div>
                                  ) : (
                                    <p className="text-xs text-muted-foreground">{formatCurrency(item.subtotal)}</p>
                                  )}
                                </div>
                                <ItemStatusBadge status={item.delivery_status} />
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* ── Summary & Actions ── */}
            <Card>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="text-sm text-muted-foreground space-y-0.5">
                    <p>
                      <span className="font-medium text-foreground">{formOrders.length}</span> transaksi,{" "}
                      <span className="font-medium text-foreground">{totalItems}</span> item
                    </p>
                    {formRitase > 0 && (
                      <p>
                        Ritase:{" "}
                        <span className="font-medium text-foreground">{formatCurrency(formRitase)}</span>
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <Button
                      variant="outline"
                      onClick={() => navigate("/pengiriman")}
                      disabled={isPending}
                    >
                      Batal
                    </Button>
                    <Button onClick={handleSave} disabled={isPending} className="gap-2">
                      {isPending && <RefreshCw className="h-4 w-4 animate-spin" />}
                      <Truck className="h-4 w-4" />
                      {isEdit ? "Simpan Perubahan" : "Buat Pengiriman"}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* ── Transaction Picker Dialog ── */}
      <TransactionPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onAdd={addOrder}
        alreadySelectedIds={alreadySelectedOrderIds}
      />
    </DashboardLayout>
  );
}
