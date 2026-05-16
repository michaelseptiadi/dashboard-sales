import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface TableSkeletonProps {
  rows?: number;
  rowClassName?: string;
}

export function TableSkeleton({ rows = 5, rowClassName }: TableSkeletonProps) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className={cn("h-12 w-full", rowClassName)} />
      ))}
    </div>
  );
}
