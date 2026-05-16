import { Badge } from "@/components/ui/badge";
import { Truck, User } from "lucide-react";

interface DeliveryBadgeProps {
  type: string | null;
  driverName?: string;
}

export function DeliveryBadge({ type, driverName = "-" }: DeliveryBadgeProps) {
  if (type === "driver") {
    return (
      <Badge variant="outline" className="gap-1 border-emerald-200 bg-emerald-50 text-emerald-700 font-normal">
        <Truck className="h-3 w-3" /> {driverName}
      </Badge>
    );
  }
  if (type === "self_delivery") {
    return (
      <Badge variant="outline" className="gap-1 border-blue-200 bg-blue-50 text-blue-700 font-normal">
        <User className="h-3 w-3" /> Ambil Sendiri
      </Badge>
    );
  }
  return <span className="text-muted-foreground">-</span>;
}
