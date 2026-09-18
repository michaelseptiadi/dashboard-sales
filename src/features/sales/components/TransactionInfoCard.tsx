import { Receipt } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface PaymentMethod {
  id: string;
  name: string;
}

const BANK_OPTIONS = ["BCA", "Mandiri", "BNI", "BRI (QRIS)"] as const;

interface TransactionInfoCardProps {
  invoiceNumber: string;
  salesDate: string;
  setSalesDate: (v: string) => void;
  paymentMethodId: string;
  setPaymentMethodId: (v: string) => void;
  paymentBank: string;
  setPaymentBank: (v: string) => void;
  dueDate: string;
  setDueDate: (v: string) => void;
  notes: string;
  setNotes: (v: string) => void;
  paymentMethods?: PaymentMethod[];
}

export function TransactionInfoCard({
  invoiceNumber,
  salesDate,
  setSalesDate,
  paymentMethodId,
  setPaymentMethodId,
  paymentBank,
  setPaymentBank,
  dueDate,
  setDueDate,
  notes,
  setNotes,
  paymentMethods,
}: TransactionInfoCardProps) {
  const selectedMethod = paymentMethods?.find((pm) => pm.id === paymentMethodId);
  const isTempo = selectedMethod?.name.toLowerCase().includes("tempo") ||
                  selectedMethod?.name.toLowerCase().includes("kredit") ||
                  selectedMethod?.name.toLowerCase().includes("credit");
  const isTransferBank = selectedMethod?.name.toLowerCase().includes("transfer");

  return (
    <>
      {/* Compact mobile header — no Card wrapper */}
      <div className="flex items-center justify-between md:hidden">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
            <Receipt className="h-3.5 w-3.5" />
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Transaksi</span>
        </div>
        <span className="font-mono text-[10px] text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-full">{invoiceNumber}</span>
      </div>

      {/* Mobile: flat compact fields */}
      <div className="space-y-3 md:hidden">
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-muted-foreground">Tanggal &amp; Waktu</Label>
          <Input
            type="datetime-local"
            value={salesDate}
            onChange={(e) => setSalesDate(e.target.value)}
            className="h-9 rounded-xl text-xs"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-muted-foreground">
            Metode Bayar <span className="text-destructive font-bold">*</span>
          </Label>
          <Select value={paymentMethodId} onValueChange={setPaymentMethodId}>
            <SelectTrigger className="h-9 rounded-xl text-xs">
              <SelectValue placeholder="Pilih metode bayar..." />
            </SelectTrigger>
            <SelectContent className="max-h-60 overflow-y-auto rounded-xl shadow-md border-muted/40">
              {paymentMethods?.map((pm) => (
                <SelectItem key={pm.id} value={pm.id} className="rounded-lg text-xs">
                  {pm.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {isTransferBank && (
          <div className="space-y-1.5 animate-in fade-in slide-in-from-top-2 duration-300">
            <Label className="text-xs font-semibold text-muted-foreground">Bank Tujuan</Label>
            <Select value={paymentBank} onValueChange={setPaymentBank}>
              <SelectTrigger className="h-9 rounded-xl text-xs">
                <SelectValue placeholder="Pilih Bank..." />
              </SelectTrigger>
              <SelectContent className="max-h-60 overflow-y-auto rounded-xl shadow-md border-muted/40">
                {BANK_OPTIONS.map((bank) => (
                  <SelectItem key={bank} value={bank} className="rounded-lg text-xs">
                    {bank}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        {isTempo && (
          <div className="space-y-1.5 animate-in fade-in slide-in-from-top-2 duration-300">
            <Label className="text-xs font-semibold text-muted-foreground">Jatuh Tempo</Label>
            <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="h-9 rounded-xl text-xs" required />
          </div>
        )}
      </div>

      {/* Desktop: full Card layout */}
      <Card className="hidden md:block border-muted/50 shadow-sm hover:shadow-md/40 transition-all duration-300 rounded-2xl overflow-hidden bg-card/65 backdrop-blur-md">
        <CardHeader className="pb-4 border-b border-muted/20 bg-muted/10">
          <CardTitle className="flex items-center gap-2.5 text-xs font-bold text-muted-foreground uppercase tracking-wider">
            <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
              <Receipt className="h-4 w-4" />
            </div>
            <span>Transaksi</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-5 space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground">No. Invoice</Label>
            <Input value={invoiceNumber} readOnly className="bg-muted/50 font-mono text-sm h-10 rounded-xl border-muted/65 focus:ring-0 focus-visible:ring-0 cursor-not-allowed select-none" />
          </div>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">Tanggal &amp; Waktu</Label>
              <Input
                type="datetime-local"
                value={salesDate}
                onChange={(e) => setSalesDate(e.target.value)}
                className="h-10 rounded-xl text-sm w-full hover:border-muted-foreground/35"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">
                Metode Bayar <span className="text-destructive font-bold">*</span>
              </Label>
              <Select value={paymentMethodId} onValueChange={setPaymentMethodId}>
                <SelectTrigger className="h-10 rounded-xl text-sm hover:border-muted-foreground/35">
                  <SelectValue placeholder="Pilih metode bayar..." />
                </SelectTrigger>
                <SelectContent className="rounded-xl shadow-md border-muted/40">
                  {paymentMethods?.map((pm) => (
                    <SelectItem key={pm.id} value={pm.id} className="rounded-lg">
                      {pm.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {isTransferBank && (
              <div className="space-y-1.5 animate-in fade-in slide-in-from-top-2 duration-300">
                <Label className="text-xs font-semibold text-muted-foreground">
                  Bank Tujuan <span className="text-destructive font-bold">*</span>
                </Label>
                <Select value={paymentBank} onValueChange={setPaymentBank}>
                  <SelectTrigger className="h-10 rounded-xl text-sm hover:border-muted-foreground/35">
                    <SelectValue placeholder="Pilih Bank..." />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl shadow-md border-muted/40">
                    {BANK_OPTIONS.map((bank) => (
                      <SelectItem key={bank} value={bank} className="rounded-lg">
                        {bank}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {isTempo && (
              <div className="space-y-1.5 animate-in fade-in slide-in-from-top-2 duration-300">
                <Label className="text-xs font-semibold text-muted-foreground">Tanggal Jatuh Tempo <span className="text-destructive font-bold">*</span></Label>
                <Input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="h-10 rounded-xl text-sm w-full hover:border-muted-foreground/35"
                  required
                />
              </div>
            )}
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground">Catatan</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Catatan tambahan (opsional)..."
              rows={2}
              className="text-sm rounded-xl resize-none hover:border-muted-foreground/35 focus:ring-primary/20"
            />
          </div>
        </CardContent>
      </Card>
    </>
  );
}
