import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

interface CurrencyInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type"> {
  value: number;
  onChange: (value: number) => void;
}

/**
 * A text input that accepts numeric input and displays it with Indonesian
 * thousand-separator formatting (e.g. 60000 → "60.000").
 * `onChange` always receives a plain number (never NaN).
 */
export function CurrencyInput({ value, onChange, className, ...props }: CurrencyInputProps) {
  const [display, setDisplay] = useState(() =>
    value > 0 ? value.toLocaleString("id-ID") : ""
  );

  // Sync display when the value is changed externally (e.g. form reset).
  // Only runs when `value` prop changes; reading `display` without adding it
  // to deps is intentional to avoid infinite update loops.
  useEffect(() => {
    const current = Number(display.replace(/\./g, "")) || 0; // eslint-disable-line react-hooks/exhaustive-deps
    if (current !== value) {
      setDisplay(value > 0 ? value.toLocaleString("id-ID") : "");
    }
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Input
      {...props}
      type="text"
      inputMode="numeric"
      value={display}
      onChange={(e) => {
        const digits = e.target.value.replace(/\D/g, "");
        const num = digits ? Number(digits) : 0;
        setDisplay(digits ? num.toLocaleString("id-ID") : "");
        onChange(num);
      }}
      className={cn(className)}
    />
  );
}
