import { Truck, User } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

interface Driver {
  id: string;
  driver_name: string;
  phone_number?: string | null;
}

interface DeliverySelectorProps {
  deliveryType: "driver" | "self_delivery" | "";
  setDeliveryType: (type: "driver" | "self_delivery" | "") => void;
  driverId: string;
  setDriverId: (id: string) => void;
  drivers?: Driver[];
}

export function DeliverySelector({
  deliveryType,
  setDeliveryType,
  driverId,
  setDriverId,
  drivers,
}: DeliverySelectorProps) {
  return (
    <Card className="border-muted/50 shadow-sm hover:shadow-md/40 transition-all duration-300 rounded-2xl overflow-hidden bg-card/65 backdrop-blur-md">
      <CardHeader className="pb-4 border-b border-muted/20 bg-muted/10">
        <CardTitle className="flex items-center gap-2.5 text-xs font-bold text-muted-foreground uppercase tracking-wider">
          <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
            <Truck className="h-4 w-4" />
          </div>
          <span>Pengiriman</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-5 space-y-4">
        {deliveryType === "driver" ? (
          <div className="flex items-center gap-3.5 rounded-2xl border border-primary/20 bg-primary/5 px-4 py-4 text-left shadow-sm">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Truck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">Metode: Kirim Supir</p>
              <p className="text-xs text-muted-foreground leading-normal mt-0.5">
                Ditentukan otomatis karena terdapat minimal 1 produk yang dikirim.
              </p>
            </div>
          </div>
        ) : deliveryType === "self_delivery" ? (
          <div className="flex items-center gap-3.5 rounded-2xl border border-blue-200/60 bg-blue-50/50 dark:border-blue-900/30 dark:bg-blue-950/10 px-4 py-4 text-left shadow-sm">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400">
              <User className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">Metode: Ambil Sendiri</p>
              <p className="text-xs text-muted-foreground leading-normal mt-0.5">
                Ditentukan otomatis karena semua produk diset untuk diambil sendiri.
              </p>
            </div>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground text-center py-4 border border-dashed rounded-2xl">
            Tambahkan produk untuk menentukan metode pengiriman.
          </p>
        )}

        {deliveryType === "driver" && (
          <div className="space-y-2.5 pt-1 animate-in fade-in slide-in-from-top-2 duration-300">
            <Label className="text-xs font-semibold text-muted-foreground">
              Pilih Supir <span className="text-destructive font-bold">*</span>
            </Label>
            {!drivers || drivers.length === 0 ? (
              <p className="text-xs text-muted-foreground bg-muted/30 p-3 rounded-xl border border-dashed text-center">
                Belum ada supir. Tambahkan di Master Data.
              </p>
            ) : (
              <div className="space-y-2">
                {drivers.map((driver) => (
                  <button
                    key={driver.id}
                    type="button"
                    onClick={() => setDriverId(driver.id)}
                    className={`flex w-full items-center gap-3.5 rounded-2xl border px-3.5 py-3 text-left transition-all duration-200 active:scale-[0.99] ${
                      driverId === driver.id
                        ? "border-primary bg-primary/5 shadow-sm ring-1 ring-primary/20"
                        : "border-muted hover:border-muted-foreground/35 hover:bg-accent/20"
                    }`}
                  >
                    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-colors ${
                      driverId === driver.id ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                    }`}>
                      <Truck className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-foreground">{driver.driver_name}</p>
                      {driver.phone_number && (
                        <p className="truncate text-xs text-muted-foreground font-medium font-mono">{driver.phone_number}</p>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
