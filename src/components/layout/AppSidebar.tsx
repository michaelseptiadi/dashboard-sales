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
      { title: "Riwayat Penjualan", url: "/riwayat", icon: History, end: false, roles: ["admin"] },
      { title: "Pengiriman", url: "/pengiriman", icon: Truck, end: false, roles: ["admin", "cashier"] },
    ],
  },
  {
    label: "Master Data",
    items: [
      { title: "Produk", url: "/produk", icon: Package, end: false, roles: ["admin"] },
      { title: "Pelanggan", url: "/pelanggan", icon: Users, end: false, roles: ["admin"] },
      { title: "Master Data", url: "/master-data", icon: Database, end: false, roles: ["admin"] },
    ],
  },
  {
    label: "Sistem",
    items: [
      { title: "Manajemen User", url: "/users", icon: UserCog, end: false, roles: ["admin"] },
    ],
  },
];

const ROLE_LABEL: Record<Role, string> = {
  admin: "Admin",
  cashier: "Kasir",
};

export function AppSidebar() {
  const { signOut, user, selectedStore, setStoreModalOpen, currentRole, isSuperAdmin } = useAuth();
  const { state } = useSidebar();
  const location = useLocation();
  const collapsed = state === "collapsed";
  const { data: lowStockItems } = useLowStockProducts();
  const lowStockCount = lowStockItems?.length ?? 0;

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
      <SidebarHeader className="border-b border-sidebar-border px-3 py-3 group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:py-3">
        <div className="flex items-center gap-3 mb-2 group-data-[collapsible=icon]:mb-0 group-data-[collapsible=icon]:justify-center">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 shadow-md">
            <Building2 className="h-4 w-4 text-white" />
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-sidebar-foreground leading-tight">
                {selectedStore?.store_name ?? "Toko Bangunan"}
              </span>
              <span className="text-[11px] text-sidebar-foreground/50 mt-0.5">
                Dashboard Penjualan
              </span>
            </div>
          )}
        </div>
        {!collapsed && (
          <SidebarMenuButton
            tooltip={selectedStore?.store_name ?? "Pilih Toko"}
            onClick={() => setStoreModalOpen(true)}
            className="w-full justify-between rounded-lg border border-sidebar-border bg-sidebar-accent/50 px-3 py-2 text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
          >
            <Building2 className="h-4 w-4 shrink-0" />
            <div className="ml-2 flex flex-1 flex-col items-start overflow-hidden">
              <span className="truncate text-xs font-medium leading-tight">
                {selectedStore?.store_name ?? "Pilih Toko"}
              </span>
              <span className="text-[10px] text-sidebar-foreground/50 leading-tight">Ganti Toko</span>
            </div>
            <ChevronsUpDown className="h-3 w-3 shrink-0 opacity-50" />
          </SidebarMenuButton>
        )}
      </SidebarHeader>

      <SidebarContent>
        {visibleGroups.map((group, gi) => (
          <SidebarGroup key={gi}>
            {group.label && (
              <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
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
                      <Link to={item.url}>
                        <item.icon />
                        <span className="flex-1">{item.title}</span>
                        {item.url === "/produk" && lowStockCount > 0 && (
                          <Badge className="ml-auto h-4 min-w-4 px-1 text-[10px] leading-none bg-destructive hover:bg-destructive text-white">
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
        ))}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border px-4 py-4">
        {!collapsed && (
          <div className="mb-2 flex items-center gap-2">
            <p className="truncate text-xs text-sidebar-foreground/50 flex-1">{user?.email}</p>
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
        <Button
          variant="ghost"
          size="sm"
          onClick={() => signOut()}
          className="w-full justify-start gap-2 text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {!collapsed && <span>Keluar</span>}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}


