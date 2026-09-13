import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { Separator } from "@/components/ui/separator";
import { Building2, ChevronsUpDown } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { MobileTabBar } from "./MobileTabBar";

const SUPERADMIN_ONLY_ROUTES = ["/users", "/pengiriman"];

interface DashboardLayoutProps {
  children: React.ReactNode;
  title: string;
}

export function DashboardLayout({ children, title }: DashboardLayoutProps) {
  const { currentRole, roleLoading, isSuperAdmin, superAdminLoading, selectedStore, setStoreModalOpen } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

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
                <span className="block truncate text-sm font-bold">{selectedStore?.store_name ?? "Pilih toko"}</span>
              </span>
              <ChevronsUpDown className="h-4 w-4 shrink-0 text-muted-foreground" />
            </button>
          </header>
          <div className="max-w-[1600px] p-4 pb-24 md:p-6">{children}</div>
        </main>
        <MobileTabBar />
      </div>
    </SidebarProvider>
  );
}


