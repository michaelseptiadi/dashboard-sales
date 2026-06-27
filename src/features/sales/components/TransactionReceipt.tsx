import { CheckCircle2, Plus, X, Receipt, Calendar, User, Phone, MapPin, CreditCard, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency } from "@/lib/format";
import type { SalesItem } from "@/features/sales/types";

interface TransactionReceiptProps {
  invoiceNumber: string;
  salesDate: string;
  customerMode: "existing" | "manual";
  customerName: string;
  customerPhone?: string;
  customerAddress?: string;
  paymentMethodName: string;
  paymentBank?: string;
  deliveryType: "driver" | "self_delivery" | "";
  driverName?: string;
  notes?: string;
  items: SalesItem[];
  totalAmount: number;
  totalDiscount: number;
  deliveryFee: number;
  grandTotal: number;
  paymentAmount: number;
  onReset: () => void;
  onClose: () => void;
}

export function TransactionReceipt({
  invoiceNumber,
  salesDate,
  customerName,
  customerPhone,
  customerAddress,
  paymentMethodName,
  paymentBank,
  deliveryType,
  driverName,
  notes,
  items,
  totalAmount,
  totalDiscount,
  deliveryFee,
  grandTotal,
  paymentAmount,
  onReset,
  onClose,
}: TransactionReceiptProps) {
  const kembalian = paymentAmount > grandTotal ? paymentAmount - grandTotal : 0;
  const sisaBayar = grandTotal > paymentAmount ? grandTotal - paymentAmount : 0;

  return (
    <div className="flex flex-col gap-6 p-1 max-w-3xl mx-auto animate-in fade-in duration-300">
      {/* Success Banner */}
      <div className="text-center py-6 space-y-3">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400">
          <CheckCircle2 className="h-8 w-8" />
        </div>
        <div className="space-y-1">
          <h2 className="text-2xl font-bold tracking-tight text-foreground">Transaksi Berhasil Disimpan!</h2>
          <p className="text-sm text-muted-foreground">Invoice telah sukses diterbitkan dan stok telah disesuaikan.</p>
        </div>
      </div>

      {/* Receipt Layout */}
      <div id="receipt-print-area" className="bg-card border rounded-3xl shadow-sm p-6 sm:p-8 space-y-6 relative overflow-hidden bg-gradient-to-b from-card to-card/95">
        {/* Decorative receipt notch lines at top */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-primary via-primary/50 to-primary" />
        
        {/* Receipt Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-6 border-b border-muted/20">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-primary font-bold text-lg">
              <Receipt className="h-5 w-5" />
              <span>PURI INDAH SALES</span>
            </div>
            <p className="text-xs text-muted-foreground font-mono">Invoice: {invoiceNumber}</p>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-xl font-medium">
            <Calendar className="h-3.5 w-3.5" />
            <span>
              {new Date(salesDate).toLocaleDateString("id-ID", {
                day: "2-digit",
                month: "long",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-sm">
          {/* Customer Info */}
          <div className="space-y-2.5 bg-muted/10 p-4 rounded-2xl border border-muted/15">
            <div className="flex items-center gap-2 font-semibold text-xs text-muted-foreground uppercase tracking-wider">
              <User className="h-3.5 w-3.5 text-primary" />
              <span>Informasi Pelanggan</span>
            </div>
            <div className="space-y-1">
              <p className="font-bold text-foreground">{customerName || "-"}</p>
              {customerPhone && (
                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <Phone className="h-3 w-3" /> {customerPhone}
                </p>
              )}
              {customerAddress && (
                <p className="text-xs text-muted-foreground flex items-center gap-1.5 items-start mt-1">
                  <MapPin className="h-3 w-3 mt-0.5 shrink-0" /> 
                  <span className="leading-normal">{customerAddress}</span>
                </p>
              )}
            </div>
          </div>

          {/* Payment & Delivery Info */}
          <div className="space-y-2.5 bg-muted/10 p-4 rounded-2xl border border-muted/15">
            <div className="flex items-center gap-2 font-semibold text-xs text-muted-foreground uppercase tracking-wider">
              <CreditCard className="h-3.5 w-3.5 text-primary" />
              <span>Pembayaran &amp; Logistik</span>
            </div>
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Metode Bayar:</span>
                <span className="font-semibold text-foreground">
                  {paymentMethodName || "-"}{paymentBank ? ` (${paymentBank})` : ""}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Pengiriman:</span>
                <span className="font-semibold text-foreground">
                  {deliveryType === "driver" ? "Dikirim Supir" : "Ambil Sendiri"}
                </span>
              </div>
              {deliveryType === "driver" && driverName && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Driver:</span>
                  <span className="font-semibold text-foreground">{driverName}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Items Table */}
        <div className="space-y-3">
          <h3 className="font-semibold text-xs text-muted-foreground uppercase tracking-wider">Daftar Item</h3>
          <div className="border rounded-2xl overflow-hidden bg-background/50 overflow-x-auto">
            <Table className="min-w-[600px]">
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="text-xs font-semibold pl-4">Produk</TableHead>
                  <TableHead className="text-right text-xs font-semibold w-16">Qty</TableHead>
                  <TableHead className="text-right text-xs font-semibold w-28">Harga</TableHead>
                  <TableHead className="text-right text-xs font-semibold w-24">Diskon</TableHead>
                  <TableHead className="text-right text-xs font-semibold pr-4 w-28">Subtotal</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.product_id} className="hover:bg-muted/10 border-b border-muted/10">
                    <TableCell className="py-2.5 pl-4">
                      <div className="flex flex-col gap-0.5">
                        <p className="font-semibold text-sm text-foreground leading-normal">{item.product_name}</p>
                        <p className="text-[10px] text-muted-foreground font-mono">{item.product_code}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-right text-sm py-2.5 font-medium">{item.qty}</TableCell>
                    <TableCell className="text-right text-sm py-2.5 font-mono">{formatCurrency(item.price)}</TableCell>
                    <TableCell className="text-right text-sm py-2.5 text-destructive font-mono">
                      {item.discount > 0 ? `-${formatCurrency(item.discount)}` : "-"}
                    </TableCell>
                    <TableCell className="text-right text-sm py-2.5 pr-4">
                      {item.qty * item.price > item.subtotal ? (
                        <div className="flex flex-col items-end">
                          <span className="text-[11px] text-muted-foreground line-through font-normal font-mono">
                            {formatCurrency(item.qty * item.price)}
                          </span>
                          <span className="text-foreground font-bold font-mono">
                            {formatCurrency(item.subtotal)}
                          </span>
                        </div>
                      ) : (
                        <span className="text-foreground font-bold font-mono">{formatCurrency(item.subtotal)}</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Pricing Summary */}
        <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pt-4 border-t border-muted/20">
          {/* Notes (if any) */}
          <div className="flex-1 min-w-[200px] text-xs">
            {notes && (
              <div className="bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-800/30 rounded-2xl p-3.5">
                <span className="font-semibold text-amber-800 dark:text-amber-400 block mb-1">Catatan:</span>
                <span className="text-amber-700/90 dark:text-amber-300 leading-relaxed block">{notes}</span>
              </div>
            )}
          </div>

          {/* Pricing Totals */}
          <div className="w-full sm:w-72 space-y-2 text-xs">
            <div className="flex justify-between text-muted-foreground">
              <span>Total Harga:</span>
              <span className="font-semibold font-mono text-foreground">{formatCurrency(totalAmount)}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Total Diskon:</span>
              <span className="font-semibold font-mono text-destructive">− {formatCurrency(totalDiscount)}</span>
            </div>
            {deliveryFee > 0 && (
              <div className="flex justify-between text-muted-foreground">
                <span className="flex items-center gap-1"><Truck className="h-3.5 w-3.5" /> Biaya Kirim:</span>
                <span className="font-semibold font-mono text-foreground">+ {formatCurrency(deliveryFee)}</span>
              </div>
            )}
            <div className="flex justify-between rounded-xl bg-primary/5 px-3 py-2 font-bold text-primary text-sm border border-primary/10">
              <span>Grand Total:</span>
              <span className="font-mono text-base">{formatCurrency(grandTotal)}</span>
            </div>
            <div className="flex justify-between text-muted-foreground pt-1 border-t border-dashed">
              <span>Jumlah Dibayar:</span>
              <span className="font-bold font-mono text-foreground">{formatCurrency(paymentAmount)}</span>
            </div>
            {kembalian > 0 ? (
              <div className="flex justify-between text-emerald-600 font-bold">
                <span>Kembalian:</span>
                <span className="font-mono">{formatCurrency(kembalian)}</span>
              </div>
            ) : sisaBayar > 0 ? (
              <div className="flex justify-between text-amber-600 font-bold">
                <span>Sisa Bayar (Hutang):</span>
                <span className="font-mono">{formatCurrency(sisaBayar)}</span>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
        <div className="flex items-center gap-3 w-full sm:w-auto sm:ml-auto">
          <Button
            onClick={onClose}
            variant="ghost"
            className="w-full sm:w-auto gap-2 rounded-2xl h-11"
          >
            <X className="h-4 w-4" /> Tutup
          </Button>
          <Button
            onClick={onReset}
            className="w-full sm:w-auto gap-2 rounded-2xl h-11 shadow-sm font-semibold"
          >
            <Plus className="h-4 w-4" /> Transaksi Baru
          </Button>
        </div>
      </div>
      
      {/* Print-specific style block */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #receipt-print-area, #receipt-print-area * {
            visibility: visible;
          }
          #receipt-print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            border: none;
            box-shadow: none;
            padding: 0;
            background: white !important;
            color: black !important;
          }
          /* Hide print preview scrollbars and headers */
          @page {
            size: auto;
            margin: 10mm;
          }
        }
      `}</style>
    </div>
  );
}
