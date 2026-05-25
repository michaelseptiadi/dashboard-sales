import { Badge } from "@/components/ui/badge";
import { Truck, User } from "lucide-react";

interface DeliveryBadgeProps {
  type: string | null;
  driverName?: string;
}

export function DeliveryBadge({ type, driverName = "-" }: DeliveryBadgeProps) {
  if (type === "driver") {
    return (
      <Badge variant="outline" className="gap-1 border-blue-400 bg-blue-100 text-blue-700 font-normal dark:border-violet-800 dark:bg-violet-950/50 dark:text-violet-400">
        <Truck className="h-3 w-3" /> {driverName}
      </Badge>
    );
  }
  if (type === "self_delivery") {
    return (
      <Badge variant="outline" className="gap-1 border-gray-400 bg-gray-100 text-black font-normal dark:border-sky-800 dark:bg-sky-950/50 dark:text-sky-400">
        <User className="h-3 w-3" /> Ambil Sendiri
      </Badge>
    );
  }
  return <span className="text-muted-foreground">-</span>;
}
