import { History, LayoutDashboard, Menu, Package, ShoppingCart, Users } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

const managerItems = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "Transaksi", href: "/penjualan", icon: ShoppingCart },
  { label: "Produk", href: "/produk", icon: Package },
  { label: "Pelanggan", href: "/pelanggan", icon: Users },
];

const cashierItems = [
  { label: "Transaksi", href: "/penjualan", icon: ShoppingCart },
  { label: "Riwayat", href: "/riwayat", icon: History },
  { label: "Produk", href: "/produk", icon: Package },
  { label: "Pelanggan", href: "/pelanggan", icon: Users },
];

export function MobileTabBar() {
  const { currentRole, isSuperAdmin } = useAuth();
  const { pathname } = useLocation();
  const items = currentRole === "cashier" && !isSuperAdmin ? cashierItems : managerItems;

  return (
    <nav
      aria-label="Navigasi utama"
      className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-border/70 bg-card/95 px-1 pb-[max(.35rem,env(safe-area-inset-bottom))] pt-1.5 shadow-[0_-8px_24px_rgba(15,23,42,0.08)] backdrop-blur-xl md:hidden"
    >
      {items.map(({ label, href, icon: Icon }) => {
        const active = href === "/" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            to={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl text-[10px] font-semibold transition active:scale-95",
              active ? "text-primary" : "text-muted-foreground",
            )}
          >
            <span className={cn("rounded-xl p-1.5", active && "bg-primary/10")}><Icon className="h-5 w-5" /></span>
            {label}
          </Link>
        );
      })}
      <SidebarTrigger
        aria-label="Menu lainnya"
        className="flex h-auto min-h-12 w-auto flex-col items-center justify-center gap-1 rounded-xl text-[10px] font-semibold text-muted-foreground active:scale-95"
      >
        <span className="rounded-xl p-1.5"><Menu className="h-5 w-5" /></span>
        Lainnya
      </SidebarTrigger>
    </nav>
  );
}
