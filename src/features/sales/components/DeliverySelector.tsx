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
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          <Truck className="h-4 w-4 text-primary" /> Pengiriman
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => {
              setDeliveryType("self_delivery");
              setDriverId("");
            }}
            className={`flex flex-col items-center gap-1.5 rounded-xl border-2 px-3 py-3 transition-colors ${
              deliveryType === "self_delivery"
                ? "border-primary bg-primary/5 text-primary"
                : "border-border hover:border-muted-foreground/40"
            }`}
          >
            <User className="h-5 w-5" />
            <span className="text-xs font-semibold">Ambil Sendiri</span>
          </button>
          <button
            type="button"
            onClick={() => setDeliveryType("driver")}
            className={`flex flex-col items-center gap-1.5 rounded-xl border-2 px-3 py-3 transition-colors ${
              deliveryType === "driver"
                ? "border-primary bg-primary/5 text-primary"
                : "border-border hover:border-muted-foreground/40"
            }`}
          >
            <Truck className="h-5 w-5" />
            <span className="text-xs font-semibold">Kirim Supir</span>
          </button>
        </div>

        {deliveryType === "driver" && (
          <div className="space-y-1.5">
            <Label className="text-xs">
              Pilih Supir <span className="text-destructive">*</span>
            </Label>
            {!drivers || drivers.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                Belum ada supir. Tambahkan di Master Data.
              </p>
            ) : (
              <div className="space-y-1.5">
                {drivers.map((driver) => (
                  <button
                    key={driver.id}
                    type="button"
                    onClick={() => setDriverId(driver.id)}
                    className={`flex w-full items-center gap-3 rounded-xl border-2 px-3 py-2.5 text-left transition-colors ${
                      driverId === driver.id
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-muted-foreground/40"
                    }`}
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100">
                      <Truck className="h-3.5 w-3.5 text-emerald-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{driver.driver_name}</p>
                      {driver.phone_number && (
                        <p className="truncate text-xs text-muted-foreground">{driver.phone_number}</p>
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
