import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TransactionStatusBadge } from "@/components/TransactionStatusBadge";
import { ItemDeliveryStatusBadge } from "@/components/ItemDeliveryStatusBadge";
import { formatCurrency } from "@/lib/format";
import { useSalesDetail } from "@/hooks/useSales";
import { Receipt } from "lucide-react";

interface Props {
  orderId: string | null;
  onClose: () => void;
}

export function SalesOrderDetailDialog({ orderId, onClose }: Props) {
  const { data, isLoading } = useSalesDetail(orderId);
  const order = data?.order;
  const items = data?.items ?? [];

  return (
    <Dialog open={!!orderId} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="h-4 w-4" />
            {isLoading ? "Memuat..." : order?.invoice_number ?? "Detail Transaksi"}
          </DialogTitle>
        </DialogHeader>
        {isLoading ? (
          <div className="space-y-3 py-4">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-6 w-full" />)}
          </div>
        ) : order ? (
          <div className="flex-1 overflow-y-auto space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-muted-foreground">Tanggal</span>
                <p className="font-medium">
                  {new Date(order.sales_date).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Status</span>
                <div className="mt-0.5">
                  <TransactionStatusBadge status={(order as any).transaction_status} />
                </div>
              </div>
              <div>
                <span className="text-muted-foreground">Pelanggan</span>
                <p className="font-medium">{(order as any).customers?.name || order.customer_name || "—"}</p>
                {((order as any).customers?.address || order.customer_address) && (
                  <p className="text-xs text-muted-foreground">
                    {(order as any).customers?.address || order.customer_address}
                  </p>
                )}
              </div>
              <div>
                <span className="text-muted-foreground">Pembayaran</span>
                <p className="font-medium">{(order as any).payment_methods?.name || "—"}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Grand Total</span>
                <p className="font-semibold text-base">{formatCurrency(order.grand_total)}</p>
              </div>
              {order.notes && (
                <div className="col-span-2">
                  <span className="text-muted-foreground">Catatan</span>
                  <p className="font-medium">{order.notes}</p>
                </div>
              )}
            </div>
            <Separator />
            <div className="rounded border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead className="text-xs py-2">Produk</TableHead>
                    <TableHead className="text-xs py-2 text-right">Qty</TableHead>
                    <TableHead className="text-xs py-2 text-right">Harga</TableHead>
                    <TableHead className="text-xs py-2 text-right">Subtotal</TableHead>
                    <TableHead className="text-xs py-2">Status Kirim</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="text-xs py-1.5">
                        <p className="font-medium">{(item as any).products?.name ?? "—"}</p>
                        <p className="text-muted-foreground font-mono">{(item as any).products?.product_code ?? ""}</p>
                      </TableCell>
                      <TableCell className="text-xs py-1.5 text-right">{item.qty}</TableCell>
                      <TableCell className="text-xs py-1.5 text-right">{formatCurrency(item.price)}</TableCell>
                      <TableCell className="text-xs py-1.5 text-right font-medium">{formatCurrency(item.subtotal)}</TableCell>
                      <TableCell className="text-xs py-1.5">
                        <ItemDeliveryStatusBadge status={(item as any).delivery_status} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground py-6 text-center">Data tidak ditemukan</p>
        )}
      </DialogContent>
    </Dialog>
  );
}
