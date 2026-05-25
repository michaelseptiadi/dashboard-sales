import { useState } from "react";
import type { DateRange } from "react-day-picker";
import { CalendarIcon, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Parse "YYYY-MM-DD" into a local Date (avoids UTC timezone shift) */
function parseDate(s: string): Date | undefined {
  if (!s) return undefined;
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** Format a local Date back to "YYYY-MM-DD" */
function toDateString(d: Date): string {
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0"),
  ].join("-");
}

/** Format for display label */
function fmtDate(d: Date): string {
  return d.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
}

// ── Component ─────────────────────────────────────────────────────────────────

interface DateRangePickerProps {
  from: string;
  to: string;
  onFromChange: (v: string) => void;
  onToChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}

export function DateRangePicker({
  from,
  to,
  onFromChange,
  onToChange,
  placeholder = "Pilih rentang tanggal",
  className,
}: DateRangePickerProps) {
  const [open, setOpen] = useState(false);

  const range: DateRange = {
    from: parseDate(from),
    to: parseDate(to),
  };

  const handleSelect = (selected: DateRange | undefined) => {
    onFromChange(selected?.from ? toDateString(selected.from) : "");
    onToChange(selected?.to ? toDateString(selected.to) : "");
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onFromChange("");
    onToChange("");
  };

  const hasValue = !!(from || to);
  const label = range.from
    ? range.to
      ? `${fmtDate(range.from)} – ${fmtDate(range.to)}`
      : `${fmtDate(range.from)} →`
    : null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "h-9 justify-start gap-2 text-sm font-normal",
            !hasValue && "text-muted-foreground",
            className,
          )}
        >
          <CalendarIcon className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{label ?? placeholder}</span>
          {hasValue && (
            <X
              className="ml-auto h-3.5 w-3.5 shrink-0 opacity-60 hover:opacity-100 transition-opacity"
              onClick={handleClear}
            />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="range"
          selected={range}
          onSelect={handleSelect}
          numberOfMonths={2}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}
