// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom";
import Products from "../Products";

vi.mock("@/components/DashboardLayout", () => ({ DashboardLayout: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ currentRole: "admin", isSuperAdmin: false }) }));
vi.mock("@/hooks/useProducts", () => ({
  useProducts: () => ({ data: { data: [{
    id: "p1", store_product_id: "sp1", name: "Semen Tiga Roda", product_code: "BRG-0001",
    store_id: "s1", category_id: "c1", unit_id: "u1", selling_price: 72000, capital_price: 65000,
    minimum_stock: 10, current_stock: 7, is_active: true, created_at: "", updated_at: "",
    categories: { name: "Semen" }, units: { name: "Sak" },
    variants: [{ id: "v1", name: "Standar", stock: 7, minimum_stock: 10, is_active: true }],
  }], meta: { page: 1, limit: 10, total: 1, totalPages: 1 } }, isLoading: false }),
  useLowStockProducts: () => ({ data: [] }),
  useCategories: () => ({ data: [{ id: "c1", name: "Semen" }] }),
  useUnits: () => ({ data: [{ id: "u1", name: "Sak" }] }),
  useCreateProduct: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdateProduct: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useAdjustStock: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useRealtimeStock: vi.fn(),
}));

describe("Products mobile presentation", () => {
  it("presents products as actionable mobile cards with stock context", () => {
    render(<MemoryRouter><Products /></MemoryRouter>);

    const list = screen.getByRole("region", { name: "Daftar produk mobile" });
    expect(list).toHaveTextContent("Semen Tiga Roda");
    expect(list).toHaveTextContent("Stok rendah");
    expect(list).toHaveTextContent("Rp 72.000");
    expect(screen.getByRole("button", { name: "Lihat detail Semen Tiga Roda" })).toBeInTheDocument();
  });
});
