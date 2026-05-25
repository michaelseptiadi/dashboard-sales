import type { ReactNode } from "react";
import { X, SlidersHorizontal } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// ── Root ──────────────────────────────────────────────────────────────────────

interface FilterBarProps {
  children: ReactNode;
  /** Number of currently active filters — shows badge + enables reset */
  activeFilterCount?: number;
  /** Called when the Reset button is clicked */
  onReset?: () => void;
  /** Primary action rendered in the header (e.g. "Buat Pengiriman" button) */
  action?: ReactNode;
  className?: string;
}

function FilterBar({
  children,
  activeFilterCount = 0,
  onReset,
  action,
  className,
}: FilterBarProps) {
  const showReset = activeFilterCount > 0 && !!onReset;

  return (
    <Card className={cn("overflow-hidden shadow-sm", className)}>
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between border-b bg-muted/40 px-5 py-2.5">
        {/* Left: icon + label + active badge */}
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="h-3.5 w-3.5 text-muted-foreground/60" />
          <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/70">
            Filter
          </span>
          {activeFilterCount > 0 && (
            <span className="inline-flex items-center rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold leading-none text-primary">
              {activeFilterCount}
            </span>
          )}
        </div>

        {/* Right: reset link + divider + action */}
        <div className="flex items-center gap-1">
          {showReset && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onReset}
              className="h-7 gap-1 px-2 text-xs text-muted-foreground hover:text-foreground"
            >
              <X className="h-3 w-3" />
              Reset
            </Button>
          )}
          {action && (
            <>
              {showReset && (
                <span className="mx-1 h-4 w-px bg-border" aria-hidden />
              )}
              {action}
            </>
          )}
        </div>
      </div>

      {/* ── Filter fields ───────────────────────────────────────────────── */}
      <CardContent className="px-5 py-4">{children}</CardContent>
    </Card>
  );
}

// ── Row ───────────────────────────────────────────────────────────────────────

FilterBar.Row = function FilterBarRow({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-end gap-3", className)}>
      {children}
    </div>
  );
};

// ── Labeled field wrapper ─────────────────────────────────────────────────────

FilterBar.Field = function FilterBarField({
  label,
  children,
  className,
}: {
  label?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {label && (
        <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
          {label}
        </span>
      )}
      {children}
    </div>
  );
};

export { FilterBar };
