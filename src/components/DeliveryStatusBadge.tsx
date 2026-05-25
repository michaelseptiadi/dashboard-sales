import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Clock, AlertCircle, Truck } from "lucide-react";
import type { DeliveryStatus } from "@/hooks/useDeliveries";

export const DELIVERY_STATUS_CONFIG: Record<
  DeliveryStatus,
  { label: string; className: string; icon: React.ReactNode }
> = {
  pending: {
    label: "Menunggu",
    className: "bg-amber-100 text-amber-700 border-amber-200",
    icon: <Clock className="h-3 w-3" />,
  },
  in_progress: {
    label: "Dalam Perjalanan",
    className: "bg-blue-100 text-blue-700 border-blue-200",
    icon: <Truck className="h-3 w-3" />,
  },
  delivered: {
    label: "Terkirim",
    className: "bg-emerald-100 text-emerald-700 border-emerald-200",
    icon: <CheckCircle2 className="h-3 w-3" />,
  },
  failed: {
    label: "Gagal",
    className: "bg-red-100 text-red-700 border-red-200",
    icon: <AlertCircle className="h-3 w-3" />,
  },
};

export function DeliveryStatusBadge({ status }: { status: DeliveryStatus | string }) {
  const cfg = DELIVERY_STATUS_CONFIG[status as DeliveryStatus] ?? {
    label: status,
    className: "",
    icon: null,
  };
  return (
    <Badge variant="outline" className={`flex items-center gap-1 text-xs font-medium ${cfg.className}`}>
      {cfg.icon}
      {cfg.label}
    </Badge>
  );
}
