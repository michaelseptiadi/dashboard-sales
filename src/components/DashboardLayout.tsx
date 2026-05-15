import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Separator } from "@/components/ui/separator";

interface DashboardLayoutProps {
  children: React.ReactNode;
  title: string;
}

export function DashboardLayout({ children, title }: DashboardLayoutProps) {
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
