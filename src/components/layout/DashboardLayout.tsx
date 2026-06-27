import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/useAuth";

const SUPERADMIN_ONLY_ROUTES = ["/users", "/pengiriman"];

interface DashboardLayoutProps {
  children: React.ReactNode;
  title: string;
}

export function DashboardLayout({ children, title }: DashboardLayoutProps) {
  const { currentRole, roleLoading, isSuperAdmin, superAdminLoading } = useAuth();
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
      <div className="flex h-screen h-dvh w-full bg-background overflow-hidden">
        <AppSidebar />
        <main className="flex-1 overflow-auto h-full">
          <header className="sticky top-0 z-10 flex h-14 items-center gap-3 border-b bg-white/80 px-6 backdrop-blur-md supports-[backdrop-filter]:bg-white/60 shadow-sm">
            <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
            <Separator orientation="vertical" className="h-5" />
            <h1 className="text-sm font-semibold text-foreground tracking-tight">{title}</h1>
          </header>
          <div className="p-6 max-w-[1600px]">{children}</div>
        </main>
      </div>
    </SidebarProvider>
  );
}


