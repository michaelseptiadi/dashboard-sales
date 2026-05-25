import { Badge } from "@/components/ui/badge";

const CONFIG: Record<string, { label: string; className: string }> = {
  pending:     { label: "Pending",           className: "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400" },
  in_delivery: { label: "Dalam Pengiriman",  className: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-400" },
  delivered:   { label: "Terkirim",          className: "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-400" },
  self_pickup: { label: "Ambil Sendiri",     className: "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-950/50 dark:text-purple-400" },
};

export function ItemDeliveryStatusBadge({ status }: { status: string | null | undefined }) {
  const cfg = CONFIG[status ?? "pending"] ?? CONFIG["pending"];
  return (
    <Badge variant="outline" className={`text-xs font-medium ${cfg.className}`}>
      {cfg.label}
    </Badge>
  );
}
