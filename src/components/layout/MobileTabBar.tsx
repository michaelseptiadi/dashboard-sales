import { History, LayoutDashboard, Menu, Package, ShoppingCart, Users } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

const managerItems = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "Transaksi", href: "/penjualan", icon: ShoppingCart },
  { label: "Riwayat", href: "/riwayat", icon: History },
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
      className={`fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-40 grid ${items.length === 5 ? "grid-cols-6" : "grid-cols-5"} items-center rounded-[1.35rem] border border-slate-200/80 bg-white/90 px-2 py-2 shadow-[0_18px_45px_-12px_rgba(15,23,42,0.24),inset_0_1px_0_rgba(255,255,255,0.9)] backdrop-blur-2xl backdrop-saturate-150 dark:border-white/10 dark:bg-slate-950/90 dark:shadow-[0_18px_45px_-12px_rgba(0,0,0,0.65)] lg:hidden`}
    >
      {items.map(({ label, href, icon: Icon }) => {
        const active = href === "/" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            to={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "relative flex min-h-11 flex-col items-center justify-center gap-0.5 rounded-xl py-1 text-[10px] font-medium transition-all duration-200 active:scale-90",
              active ? "font-bold text-primary" : "text-muted-foreground hover:text-foreground",
            )}
          >
            <span
              className={cn(
                "relative flex h-8 w-8 items-center justify-center rounded-xl transition-all duration-300",
                active
                  ? "bg-primary text-primary-foreground shadow-md shadow-primary/25 scale-105"
                  : "text-muted-foreground/80 hover:bg-slate-100 dark:hover:bg-white/10",
              )}
            >
              <Icon className="h-4 w-4" />
            </span>
            <span className={cn("leading-tight tracking-tight text-[9.5px] mt-0.5 transition-colors", active ? "text-primary font-bold" : "text-muted-foreground")}>
              {label}
            </span>
            {active && (
              <span className="absolute -bottom-0.5 h-1 w-3 rounded-full bg-primary/70 animate-in fade-in zoom-in-50 duration-200" />
            )}
          </Link>
        );
      })}
      <SidebarTrigger
        aria-label="Menu lainnya"
        className="relative flex min-h-11 h-auto w-auto flex-col items-center justify-center gap-0.5 rounded-xl py-1 text-[10px] font-medium text-muted-foreground/80 transition-all duration-200 hover:text-foreground active:scale-90"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-xl hover:bg-muted/50 text-muted-foreground">
          <Menu className="h-4 w-4" />
        </span>
        <span className="leading-tight tracking-tight text-[9.5px] mt-0.5 text-muted-foreground">Lainnya</span>
      </SidebarTrigger>
    </nav>
  );
}
