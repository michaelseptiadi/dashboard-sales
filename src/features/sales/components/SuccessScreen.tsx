import { CheckCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/format";

interface SuccessScreenProps {
  invoiceNumber: string;
  grandTotal: number;
  onReset: () => void;
}

export function SuccessScreen({ invoiceNumber, grandTotal, onReset }: SuccessScreenProps) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center p-4">
      <Card className="w-full max-w-sm shadow-lg">
        <CardContent className="px-8 py-10 space-y-5 text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
            <CheckCircle className="h-10 w-10 text-green-600" />
          </div>
          <div className="space-y-1">
            <h2 className="text-2xl font-bold">Transaksi Berhasil!</h2>
            <p className="font-mono text-sm text-muted-foreground">{invoiceNumber}</p>
          </div>
          <div className="rounded-xl bg-muted/60 px-6 py-4">
            <p className="text-sm text-muted-foreground">Grand Total</p>
            <p className="text-3xl font-bold text-primary">{formatCurrency(grandTotal)}</p>
          </div>
          <Button onClick={onReset} className="w-full" size="lg">
            Buat Transaksi Baru
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
