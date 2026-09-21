import { useEffect, useRef } from "react";
import {
  LayoutDashboard,
  ShoppingCart,
  History,
  Package,
  Users,
  Database,
  LogOut,
  Building2,
  ChevronsUpDown,
  Truck,
  UserCog,
  Contact,
  Briefcase,
  ReceiptText,
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useLowStockProducts } from "@/hooks/useProducts";
import type { Role } from "@/types/Auth";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type MenuItem = {
  title: string;
  url: string;
  icon: React.ElementType;
  end: boolean;
  /** Store-level roles that can see this item. Empty means superadmin-only. */
  roles: Role[];
  superadminOnly?: boolean;
};

type MenuGroup = {
  label?: string;
  items: MenuItem[];
};

const menuGroups: MenuGroup[] = [
  {
    items: [
      { title: "Dashboard", url: "/", icon: LayoutDashboard, end: true, roles: ["admin"] },
    ],
  },
  {
    label: "Transaksi",
    items: [
      { title: "Transaksi Pending", url: "/penjualan", icon: ShoppingCart, end: false, roles: ["admin", "cashier"] },
      { title: "Riwayat Penjualan", url: "/riwayat", icon: History, end: false, roles: ["admin", "cashier"] },
      { title: "Pengiriman", url: "/pengiriman", icon: Truck, end: false, roles: [], superadminOnly: true },
    ],
  },
  {
    label: "Data Toko",
    items: [
      { title: "Produk", url: "/produk", icon: Package, end: false, roles: ["admin", "cashier"] },
      { title: "Pelanggan", url: "/pelanggan", icon: Users, end: false, roles: ["admin", "cashier"] },
      { title: "Supir", url: "/supir", icon: Contact, end: false, roles: ["admin", "cashier"] },
      { title: "Pengeluaran", url: "/pengeluaran", icon: ReceiptText, end: false, roles: ["admin"] },
      { title: "Karyawan", url: "/karyawan", icon: Briefcase, end: false, roles: ["admin"] },
    ],
  },
  {
    label: "Sistem",
    items: [
      { title: "Manajemen User", url: "/users", icon: UserCog, end: false, roles: [], superadminOnly: true },
      { title: "Master Data", url: "/master-data", icon: Database, end: false, roles: ["admin"] },
    ],
  },
];

const ROLE_LABEL: Record<Role, string> = {
  admin: "Manager",
  cashier: "Kasir",
};

export function AppSidebar() {
  const { signOut, user, selectedStore, setStoreModalOpen, currentRole, isSuperAdmin } = useAuth();
  const { state } = useSidebar();
  const location = useLocation();
  const collapsed = state === "collapsed";
  const { data: lowStockItems } = useLowStockProducts();
  const lowStockCount = lowStockItems?.length ?? 0;

  const contentRef = useRef<HTMLDivElement>(null);

  // Restore scroll position on mount
  useEffect(() => {
    const savedScroll = sessionStorage.getItem("sidebar_scroll_position");
    if (savedScroll && contentRef.current) {
      contentRef.current.scrollTop = parseFloat(savedScroll);
    }
  }, []);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    sessionStorage.setItem("sidebar_scroll_position", e.currentTarget.scrollTop.toString());
  };

  const isActive = (url: string, end: boolean) => {
    if (end) return location.pathname === url;
    return location.pathname === url || location.pathname.startsWith(url + "/");
  };

  const canSeeItem = (item: MenuItem) => {
    if (item.superadminOnly) return isSuperAdmin;
    if (isSuperAdmin) return true;
    if (!currentRole) return false;
    return item.roles.includes(currentRole);
  };

  const visibleGroups = menuGroups
    .map((group) => ({ ...group, items: group.items.filter(canSeeItem) }))
    .filter((group) => group.items.length > 0);

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border/40 px-3 py-3 group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:py-3">
        <div className="flex items-center gap-3 mb-2 group-data-[collapsible=icon]:mb-0 group-data-[collapsible=icon]:justify-center">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 via-indigo-500 to-blue-600 shadow-md shadow-blue-500/20 ring-1 ring-white/30">
            <Building2 className="h-4 w-4 text-white" />
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="text-sm font-bold text-sidebar-foreground leading-tight tracking-tight">
                {selectedStore?.store_name ?? "Toko Bangunan"}
              </span>
              <span className="text-[10px] font-medium text-sidebar-foreground/50 mt-0.5">
                Dashboard Penjualan
              </span>
            </div>
          )}
        </div>
        {!collapsed && (
          <SidebarMenuButton
            tooltip={selectedStore?.store_name ?? "Pilih Toko"}
            onClick={() => setStoreModalOpen(true)}
            className="w-full justify-between rounded-xl border border-sidebar-border/50 bg-white/40 dark:bg-white/[0.04] backdrop-blur-md px-3 py-2 text-sidebar-foreground/85 hover:bg-white/70 dark:hover:bg-white/[0.08] hover:text-sidebar-foreground transition-all duration-200 shadow-[inset_0_1px_1px_rgba(255,255,255,0.4),0_1px_3px_rgba(0,0,0,0.02)]"
          >
            <Building2 className="h-4 w-4 shrink-0 text-primary" />
            <div className="ml-2 flex flex-1 flex-col items-start overflow-hidden">
              <span className="truncate text-xs font-semibold leading-tight">
                {selectedStore?.store_name ?? "Pilih Toko"}
              </span>
              <span className="text-[10px] text-sidebar-foreground/50 leading-tight">Ganti Toko</span>
            </div>
            <ChevronsUpDown className="h-3 w-3 shrink-0 opacity-50" />
          </SidebarMenuButton>
        )}
      </SidebarHeader>

      <SidebarContent ref={contentRef} onScroll={handleScroll}>
        {visibleGroups.map((group, gi) => (
          <div key={gi}>
            {gi > 0 && (
              <div className="mx-3.5 my-1.5 border-t border-sidebar-border/25" />
            )}
            <SidebarGroup className="px-2.5 py-1">
              {group.label && (
                <SidebarGroupLabel className="text-[10px] font-bold text-sidebar-foreground/40 uppercase tracking-widest px-2.5 mb-1 select-none">
                  {group.label}
                </SidebarGroupLabel>
              )}
              <SidebarGroupContent>
                <SidebarMenu>
                  {group.items.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton
                        asChild
                        tooltip={item.title}
                        isActive={isActive(item.url, item.end)}
                      >
                        <Link to={item.url} className="flex items-center gap-2.5">
                          <item.icon className="h-4 w-4 shrink-0 transition-transform group-hover/menu-item:scale-105" />
                          <span className="flex-1">{item.title}</span>
                          {item.url === "/produk" && lowStockCount > 0 && (
                            <Badge className="ml-auto h-4 min-w-4 px-1 text-[10px] leading-none bg-destructive hover:bg-destructive text-white shadow-xs">
                              {lowStockCount}
                            </Badge>
                          )}
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </div>
        ))}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border/40 px-3 py-3 group-data-[collapsible=icon]:px-2 group-data-[collapsible=icon]:py-3">
        {!collapsed && (
          <div className="mb-2 flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-white/40 dark:bg-white/[0.04] backdrop-blur-md border border-sidebar-border/40 shadow-[inset_0_1px_1px_rgba(255,255,255,0.3)]">
            <p className="truncate text-xs font-medium text-sidebar-foreground/70 flex-1">{user?.email}</p>
            {isSuperAdmin ? (
              <Badge className="shrink-0 text-[10px] px-1.5 py-0 bg-amber-500 hover:bg-amber-500">
                Superadmin
              </Badge>
            ) : currentRole ? (
              <Badge variant="secondary" className="shrink-0 text-[10px] px-1.5 py-0">
                {ROLE_LABEL[currentRole]}
              </Badge>
            ) : null}
          </div>
        )}
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip="Keluar"
              onClick={() => signOut()}
              className="text-sidebar-foreground/70 hover:bg-destructive/10 hover:text-destructive transition-all duration-200"
            >
              <LogOut className="h-4 w-4 shrink-0" />
              {!collapsed && <span className="font-medium">Keluar</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}


