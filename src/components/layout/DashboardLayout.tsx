import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/useAuth";

const CASHIER_ALLOWED_ROUTES = ["/penjualan", "/pengiriman"];
const SUPERADMIN_ONLY_ROUTES = ["/users"];

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

    // Superadmin & Manager pages: redirect others away
    if (SUPERADMIN_ONLY_ROUTES.includes(location.pathname) && !isSuperAdmin && currentRole !== "admin") {
      navigate("/", { replace: true });
      return;
    }

    // Superadmin bypasses all other restrictions
    if (isSuperAdmin) return;

    // Cashier: only allowed on specific routes
    if (
      currentRole === "cashier" &&
      !CASHIER_ALLOWED_ROUTES.includes(location.pathname)
    ) {
      navigate("/penjualan", { replace: true });
    }
  }, [currentRole, roleLoading, isSuperAdmin, superAdminLoading, location.pathname, navigate]);

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar />
        <main className="flex-1 overflow-auto">
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


