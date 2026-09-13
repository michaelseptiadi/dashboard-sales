import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { Separator } from "@/components/ui/separator";
import { Building2, ChevronsUpDown, ChevronDown, Database, LogOut, UserCog } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { MobileTabBar } from "./MobileTabBar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function getInitials(name?: string, email?: string): string {
  if (name && name.trim()) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return parts[0].slice(0, 2).toUpperCase();
  }
  if (email) {
    return email.slice(0, 2).toUpperCase();
  }
  return "U";
}

const SUPERADMIN_ONLY_ROUTES = ["/users", "/pengiriman"];

interface DashboardLayoutProps {
  children: React.ReactNode;
  title: string;
}

export function DashboardLayout({ children, title }: DashboardLayoutProps) {
  const { currentRole, roleLoading, isSuperAdmin, superAdminLoading, selectedStore, setStoreModalOpen, user, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const roleLabel = isSuperAdmin
    ? "Superadmin"
    : currentRole === "admin"
    ? "Admin"
    : currentRole === "cashier"
    ? "Kasir"
    : "User";

  const roleBadgeClass = isSuperAdmin
    ? "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 border-amber-200/50"
    : currentRole === "admin"
    ? "bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300 border-blue-200/50"
    : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 border-emerald-200/50";

  useEffect(() => {
    if (roleLoading || superAdminLoading) return;

    // Superadmin-only pages: redirect non-superadmins away
    if (
      (SUPERADMIN_ONLY_ROUTES.includes(location.pathname) ||
       location.pathname.startsWith("/pengiriman/")) &&
      !isSuperAdmin
    ) {
      if (currentRole === "cashier") {
        navigate("/penjualan", { replace: true });
      } else {
        navigate("/", { replace: true });
      }
      return;
    }

    // Superadmin bypasses all other restrictions
    if (isSuperAdmin) return;

    // Cashier: only allowed on specific routes
    if (currentRole === "cashier") {
      const isAllowed =
        location.pathname === "/penjualan" ||
        location.pathname === "/riwayat" ||
        location.pathname === "/produk" || location.pathname.startsWith("/produk/") ||
        location.pathname === "/pelanggan" || location.pathname.startsWith("/pelanggan/") ||
        location.pathname === "/supir";

      if (!isAllowed) {
        navigate("/penjualan", { replace: true });
      }
    }
  }, [currentRole, roleLoading, isSuperAdmin, superAdminLoading, location.pathname, navigate]);

  return (
    <SidebarProvider defaultOpen={false}>
      <div className="flex h-screen h-dvh w-full overflow-hidden bg-background">
        <AppSidebar />
        <main className="h-full flex-1 overflow-auto overscroll-contain">
          <header className="sticky top-0 z-30 flex min-h-14 items-center gap-3 border-b bg-card/90 px-4 pt-[env(safe-area-inset-top)] shadow-sm backdrop-blur-xl md:h-14 md:px-6 md:pt-0">
            <SidebarTrigger className="hidden text-muted-foreground hover:text-foreground md:inline-flex" />
            <Separator orientation="vertical" className="hidden h-5 md:block" />
            <h1 className="hidden text-sm font-semibold tracking-tight md:block">{title}</h1>
            <button
              type="button"
              onClick={() => setStoreModalOpen(true)}
              className="flex min-h-11 min-w-0 items-center gap-2 rounded-xl pr-2 text-left active:scale-[0.98] md:hidden"
              aria-label="Ganti toko"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Building2 className="h-4 w-4" />
              </span>
              <span className="min-w-0">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Toko aktif</span>
                <span className="block truncate text-sm font-bold max-w-[130px]">{selectedStore?.store_name ?? "Pilih toko"}</span>
              </span>
              <ChevronsUpDown className="h-4 w-4 shrink-0 text-muted-foreground" />
            </button>

            {/* Profile Dropdown on top right */}
            <div className="ml-auto flex items-center gap-2 md:gap-3">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="flex items-center gap-2.5 rounded-full p-1 pl-1.5 pr-2 md:rounded-xl md:p-1.5 md:px-2.5 text-left transition-all hover:bg-muted/60 active:scale-[0.98] outline-none border border-transparent hover:border-border/40"
                    aria-label="Profil pengguna"
                  >
                    <Avatar className="h-8 w-8 md:h-8 md:w-8 border border-border/60 bg-primary/10 text-primary font-bold shadow-xs">
                      <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                        {getInitials(user?.name, user?.email)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="hidden min-w-0 flex-col md:flex">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate text-xs font-bold leading-none text-foreground max-w-[130px]">
                          {user?.name || user?.email?.split('@')[0] || "User"}
                        </span>
                        <Badge
                          variant="outline"
                          className={`text-[9px] px-1 py-0 font-semibold leading-tight border ${roleBadgeClass}`}
                        >
                          {roleLabel}
                        </Badge>
                      </div>
                      <span className="text-[10px] text-muted-foreground truncate leading-tight mt-0.5">
                        {user?.email}
                      </span>
                    </div>
                    <ChevronDown className="hidden h-3.5 w-3.5 text-muted-foreground md:block" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 p-2 rounded-xl shadow-lg border-muted/40">
                  <DropdownMenuLabel className="font-normal p-2">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-bold leading-none text-foreground">
                        {user?.name || "User"}
                      </p>
                      <p className="text-xs leading-none text-muted-foreground truncate">
                        {user?.email}
                      </p>
                      <div className="pt-1.5 flex items-center gap-1.5">
                        <Badge
                          variant="outline"
                          className={`text-[10px] px-1.5 py-0 font-semibold border ${roleBadgeClass}`}
                        >
                          {roleLabel}
                        </Badge>
                        {selectedStore && (
                          <span className="text-[10px] text-muted-foreground flex items-center gap-1 truncate">
                            <Building2 className="h-3 w-3" />
                            <span className="truncate max-w-[100px]">{selectedStore.store_name}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator className="my-1" />
                  <DropdownMenuItem
                    onClick={() => setStoreModalOpen(true)}
                    className="flex items-center gap-2 rounded-lg text-xs font-medium cursor-pointer"
                  >
                    <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>Ganti Toko</span>
                  </DropdownMenuItem>
                  {isSuperAdmin && (
                    <DropdownMenuItem
                      onClick={() => navigate("/users")}
                      className="flex items-center gap-2 rounded-lg text-xs font-medium cursor-pointer"
                    >
                      <UserCog className="h-3.5 w-3.5 text-muted-foreground" />
                      <span>Manajemen User</span>
                    </DropdownMenuItem>
                  )}
                  {(isSuperAdmin || currentRole === "admin") && (
                    <DropdownMenuItem
                      onClick={() => navigate("/master-data")}
                      className="flex items-center gap-2 rounded-lg text-xs font-medium cursor-pointer"
                    >
                      <Database className="h-3.5 w-3.5 text-muted-foreground" />
                      <span>Master Data</span>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator className="my-1" />
                  <DropdownMenuItem
                    onClick={() => signOut()}
                    className="flex items-center gap-2 rounded-lg text-xs font-medium text-destructive focus:bg-destructive/10 focus:text-destructive cursor-pointer"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    <span>Keluar</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>
          <div className="max-w-[1600px] p-4 pb-24 md:p-6">{children}</div>
        </main>
        <MobileTabBar />
      </div>
    </SidebarProvider>
  );
}


