import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { TableSkeleton } from "@/components/TableSkeleton";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { DeliveryStatusBadge, DELIVERY_STATUS_CONFIG } from "@/components/DeliveryStatusBadge";
import { DeliveryDetailDialog } from "@/components/DeliveryDetailDialog";
import { useToast } from "@/hooks/use-toast";
import { useDrivers } from "@/hooks/useMasterData";
import {
  useDeliveries,
  useUpdateDeliveryStatus,
  useDeleteDelivery,
  type Delivery,
  type DeliveryStatus,
} from "@/hooks/useDeliveries";
import { Plus, Pencil, Trash2, Truck, Search, X, Eye } from "lucide-react";

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function Pengiriman() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: drivers = [] } = useDrivers();

  // ── Filters ──
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [filterDriver, setFilterDriver] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterCustomer, setFilterCustomer] = useState("");

  const { data: deliveries = [], isLoading } = useDeliveries({
    dateFrom: filterDateFrom,
    dateTo: filterDateTo,
    driverId: filterDriver || undefined,
    status: filterStatus || undefined,
    customerSearch: filterCustomer || undefined,
  });

  const activeFilterCount = [filterDateFrom, filterDateTo, filterDriver, filterStatus, filterCustomer].filter(Boolean).length;

  const resetFilters = () => {
    setFilterDateFrom(""); setFilterDateTo("");
    setFilterDriver(""); setFilterStatus(""); setFilterCustomer("");
  };

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
                <Label className="text-xs">Nama / Alamat Pelanggan</Label>
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Cari nama atau alamat..."
                    value={filterCustomer}
                    onChange={(e) => setFilterCustomer(e.target.value)}
                    className="h-9 pl-8 text-sm w-52"
                  />
                </div>
              </div>
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
                <Button onClick={() => navigate("/pengiriman/buat")} className="h-9 gap-2">
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

                      const statusRowCls =
                        delivery.delivery_status === "delivered"
                          ? "bg-emerald-50 hover:bg-emerald-100/60 dark:bg-emerald-950/20 dark:hover:bg-emerald-950/30"
                          : delivery.delivery_status === "in_progress"
                          ? "bg-blue-50 hover:bg-blue-100/60 dark:bg-blue-950/20 dark:hover:bg-blue-950/30"
                          : delivery.delivery_status === "pending"
                          ? "bg-amber-50 hover:bg-amber-100/60 dark:bg-amber-950/20 dark:hover:bg-amber-950/30"
                          : delivery.delivery_status === "failed"
                          ? "bg-red-50 hover:bg-red-100/60 dark:bg-red-950/20 dark:hover:bg-red-950/30"
                          : "";

                      return (
                        <TableRow key={delivery.id} className={statusRowCls}>
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
                                onClick={() => navigate(`/pengiriman/${delivery.id}/edit`)}
                                disabled={delivery.delivery_status !== "pending"}
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
