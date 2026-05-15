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
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/hooks/useAuth";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";

const menuItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Penjualan", url: "/penjualan", icon: ShoppingCart },
  { title: "Riwayat", url: "/riwayat", icon: History },
  { title: "Produk", url: "/produk", icon: Package },
  { title: "Pelanggan", url: "/pelanggan", icon: Users },
  { title: "Master Data", url: "/master-data", icon: Database },
];

export function AppSidebar() {
  const { signOut, user, selectedStore, setStoreModalOpen } = useAuth();
  const { state } = useSidebar();
  const collapsed = state === "collapsed";

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border px-4 py-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 shadow-md">
            <Building2 className="h-5 w-5 text-white" />
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
        <SidebarMenuButton
          tooltip={selectedStore?.store_name ?? "Pilih Toko"}
          onClick={() => setStoreModalOpen(true)}
          className="w-full justify-between rounded-lg border border-sidebar-border bg-sidebar-accent/50 px-3 py-2 text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
        >
          <Building2 className="h-4 w-4 shrink-0" />
          {!collapsed && (
            <>
              <div className="ml-2 flex flex-1 flex-col items-start overflow-hidden">
                <span className="truncate text-xs font-medium leading-tight">
                  {selectedStore?.store_name ?? "Pilih Toko"}
                </span>
                <span className="text-[10px] text-sidebar-foreground/50 leading-tight">Ganti Toko</span>
              </div>
              <ChevronsUpDown className="h-3 w-3 shrink-0 opacity-50" />
            </>
          )}
        </SidebarMenuButton>
      </SidebarHeader>

      <SidebarContent className="px-2 py-3">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="gap-0.5">
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild tooltip={item.title}>
                    <NavLink
                      to={item.url}
                      end={item.url === "/"}
                      className="flex items-center gap-3 rounded-lg px-3 py-2 text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                      activeClassName="bg-sidebar-accent text-white font-medium"
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      <span className="text-sm">{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-3">
        {!collapsed && (
          <div className="mb-2 truncate rounded-lg bg-sidebar-accent/50 px-3 py-2 text-xs text-sidebar-foreground/60">
            {user?.email}
          </div>
        )}
        <Button
          variant="ghost"
          size={collapsed ? "icon" : "sm"}
          onClick={signOut}
          className="w-full justify-start text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-red-400 transition-colors"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {!collapsed && <span className="ml-2">Keluar</span>}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
