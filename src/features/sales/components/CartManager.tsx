import { ShoppingCart, Plus, X, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/format";
import type { PendingCart } from "@/hooks/useCart";

interface CartManagerProps {
  carts: PendingCart[];
  activeCartId: string;
  onSwitch: (id: string) => void;
  onNew: () => void;
  onRemove: (id: string) => void;
}

export function CartManager({ carts, activeCartId, onSwitch, onNew, onRemove }: CartManagerProps) {
  return (
    <div className="mb-6 rounded-xl border bg-muted/40 p-3">
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <ShoppingCart className="h-4 w-4 text-primary" />
          <span>Antrian Transaksi Pending</span>
          <Badge variant="secondary" className="text-xs">
            {carts.length}
          </Badge>
        </div>
        <Button size="sm" className="h-8 gap-1.5" onClick={onNew}>
          <Plus className="h-3.5 w-3.5" />
          Pelanggan Baru
        </Button>
      </div>

      {/* Cart tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {carts.map((cart, idx) => {
          const label = cart.customerName.trim() || `Pelanggan ${idx + 1}`;
          const isActive = cart.id === activeCartId;
          const grandTotal = cart.items.reduce((s, i) => s + i.subtotal, 0) + cart.deliveryFee;

          return (
            <div
              key={cart.id}
              role="button"
              tabIndex={0}
              aria-pressed={isActive}
              className={cn(
                "group relative flex min-w-[160px] shrink-0 cursor-pointer flex-col gap-1 rounded-lg border-2 px-4 py-3 text-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring select-none",
                isActive
                  ? "border-primary bg-background shadow-md"
                  : "border-transparent bg-background/60 hover:border-border hover:bg-background hover:shadow-sm",
              )}
              onClick={() => onSwitch(cart.id)}
              onKeyDown={(e) => e.key === "Enter" && onSwitch(cart.id)}
            >
              {/* Active indicator bar */}
              {isActive && (
                <span className="absolute inset-x-0 top-0 h-1 rounded-t-lg bg-primary" />
              )}

              {/* Remove button */}
              {carts.length > 1 && (
                <button
                  aria-label={`Hapus ${label}`}
                  className="absolute right-1.5 top-1.5 rounded-full p-0.5 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemove(cart.id);
                  }}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}

              {/* Cart label */}
              <span
                className={cn(
                  "max-w-[140px] truncate font-medium leading-tight",
                  isActive ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {label}
              </span>

              {/* Item count + total */}
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Package className="h-3 w-3" />
                  {cart.items.length} produk
                </span>
                {cart.items.length > 0 && (
                  <span className={cn("font-medium", isActive && "text-primary")}>
                    {formatCurrency(grandTotal)}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
