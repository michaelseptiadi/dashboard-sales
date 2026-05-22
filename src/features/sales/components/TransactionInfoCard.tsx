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

interface TransactionInfoCardProps {
  invoiceNumber: string;
  salesDate: string;
  setSalesDate: (v: string) => void;
  paymentMethodId: string;
  setPaymentMethodId: (v: string) => void;
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
  notes,
  setNotes,
  paymentMethods,
}: TransactionInfoCardProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          <Receipt className="h-4 w-4 text-primary" /> Transaksi
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1.5">
          <Label className="text-xs">No. Invoice</Label>
          <Input value={invoiceNumber} readOnly className="bg-muted font-mono text-sm h-9" />
        </div>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Tanggal &amp; Waktu</Label>
            <Input
              type="datetime-local"
              value={salesDate}
              onChange={(e) => setSalesDate(e.target.value)}
              className="h-9 text-sm w-full"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">
              Metode Bayar <span className="text-destructive">*</span>
            </Label>
            <Select value={paymentMethodId} onValueChange={setPaymentMethodId}>
              <SelectTrigger className={`h-9 text-sm ${!paymentMethodId ? "border-destructive" : ""}`}>
                <SelectValue placeholder="Pilih" />
              </SelectTrigger>
              <SelectContent>
                {paymentMethods?.map((pm) => (
                  <SelectItem key={pm.id} value={pm.id}>
                    {pm.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Catatan</Label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Catatan tambahan (opsional)..."
            rows={2}
            className="text-sm resize-none"
          />
        </div>
      </CardContent>
    </Card>
  );
}
