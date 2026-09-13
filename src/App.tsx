import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { StoreSelectModal } from "@/components/StoreSelectModal";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { SidebarProvider, useSidebar } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/AppSidebar";
import Auth from "./pages/Auth";
import Index from "./pages/Index";
import Sales from "./pages/Sales";
import SalesHistory from "./pages/SalesHistory";
import Products from "./pages/Products";
import ProductDetail from "./pages/ProductDetail";
import Customers from "./pages/Customers";
import CustomerDetail from "./pages/CustomerDetail";
import MasterData from "./pages/MasterData";
import Pengiriman from "./pages/Pengiriman";
import PengirimanForm from "./pages/PengirimanForm";
import Users from "./pages/Users";
import Supir from "./pages/Supir";
import Karyawan from "./pages/Karyawan";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2, // 2 minutes — prevents refetch on every page nav
      retry: 1,
    },
  },
});

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
}

function AuthRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

const PersistentMobileSidebar = () => {
  const { user } = useAuth();
  const { isMobile } = useSidebar();
  if (!user || !isMobile) return null;
  return <AppSidebar />;
};

const AppRoutes = () => (
  <>
    <StoreSelectModal />
    <PersistentMobileSidebar />
    <Routes>
      <Route path="/auth" element={<AuthRoute><Auth /></AuthRoute>} />
      <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
      <Route path="/penjualan" element={<ProtectedRoute><Sales /></ProtectedRoute>} />
      <Route path="/riwayat" element={<ProtectedRoute><SalesHistory /></ProtectedRoute>} />
      <Route path="/produk" element={<ProtectedRoute><Products /></ProtectedRoute>} />
      <Route path="/produk/:id" element={<ProtectedRoute><ProductDetail /></ProtectedRoute>} />
      <Route path="/pelanggan" element={<ProtectedRoute><Customers /></ProtectedRoute>} />
      <Route path="/pelanggan/:id" element={<ProtectedRoute><CustomerDetail /></ProtectedRoute>} />
      <Route path="/master-data" element={<ProtectedRoute><MasterData /></ProtectedRoute>} />
      <Route path="/pengiriman" element={<ProtectedRoute><Pengiriman /></ProtectedRoute>} />
      <Route path="/pengiriman/buat" element={<ProtectedRoute><PengirimanForm /></ProtectedRoute>} />
      <Route path="/pengiriman/:id/edit" element={<ProtectedRoute><PengirimanForm /></ProtectedRoute>} />
      <Route path="/users" element={<ProtectedRoute><Users /></ProtectedRoute>} />
      <Route path="/supir" element={<ProtectedRoute><Supir /></ProtectedRoute>} />
      <Route path="/karyawan" element={<ProtectedRoute><Karyawan /></ProtectedRoute>} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  </>
);

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <SidebarProvider defaultOpen={false}>
              <AppRoutes />
            </SidebarProvider>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
