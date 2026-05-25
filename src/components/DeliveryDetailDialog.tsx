import { useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Truck } from "lucide-react";
import { useDeliveryDetail } from "@/hooks/useDeliveries";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { DeliveryStatusBadge } from "@/components/DeliveryStatusBadge";
import { ItemDeliveryStatusBadge } from "@/components/ItemDeliveryStatusBadge";

interface DeliveryDetailDialogProps {
  deliveryId: string | null;
  onClose: () => void;
}

export function DeliveryDetailDialog({ deliveryId, onClose }: DeliveryDetailDialogProps) {
  const { data: detail, isLoading } = useDeliveryDetail(deliveryId);

  const groupedByOrder = useMemo(() => {
    if (!detail) return [];
    const map = new Map<
      string,
      {
        invoiceNumber: string;
        customerName: string;
        customerAddress: string | null;
        items: typeof detail.delivery_items;
      }
    >();
    for (const di of detail.delivery_items) {
      if (!di.sales_orders) continue;
      const oid = di.sales_order_id;
      if (!map.has(oid)) {
        map.set(oid, {
          invoiceNumber: di.sales_orders.invoice_number,
          customerName: di.sales_orders.customer_name ?? "—",
          customerAddress: di.sales_orders.customer_address ?? null,
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
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <p className="text-sm font-semibold">{group.invoiceNumber}</p>
                      <p className="text-sm font-medium text-foreground">{group.customerName}</p>
                      {group.customerAddress && (
                        <p className="text-xs text-muted-foreground leading-snug">{group.customerAddress}</p>
                      )}
                    </div>
                    <Badge variant="outline" className="text-xs shrink-0">{group.items.length} item</Badge>
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
