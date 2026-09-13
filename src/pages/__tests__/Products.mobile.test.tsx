// @vitest-environment jsdom
import { act, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom";
import Products from "../Products";

const fetchNextPage = vi.fn();
let intersect: IntersectionObserverCallback;

vi.stubGlobal("IntersectionObserver", class {
  constructor(callback: IntersectionObserverCallback) { intersect = callback; }
  observe() {}
  disconnect() {}
  unobserve() {}
});

vi.mock("@/components/DashboardLayout", () => ({ DashboardLayout: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ currentRole: "admin", isSuperAdmin: false }) }));
vi.mock("@/hooks/useProducts", () => ({
  useInfiniteProducts: () => ({
    data: { pages: [{ data: [{
      id: "p1", store_product_id: "sp1", name: "Semen Tiga Roda", product_code: "BRG-0001",
      store_id: "s1", category_id: "c1", unit_id: "u1", selling_price: 72000, capital_price: 65000,
      minimum_stock: 10, current_stock: 7, is_active: true, created_at: "", updated_at: "",
      categories: { name: "Semen" }, units: { name: "Sak" },
      variants: [{ id: "v1", name: "Standar", stock: 7, minimum_stock: 10, is_active: true }],
    }], meta: { page: 1, limit: 10, total: 20, totalPages: 2 } }] },
    isLoading: false,
    isFetchingNextPage: false,
    hasNextPage: true,
    fetchNextPage,
  }),
  useLowStockProducts: () => ({ data: [{
    id: "p2", store_product_id: "sp2", name: "Cat Tembok (Putih)", product_code: "BRG-0002",
    store_id: "s1", category_id: "c2", unit_id: "u2", selling_price: 95000, capital_price: 80000,
    minimum_stock: 5, current_stock: 0, is_active: true, created_at: "", updated_at: "",
    categories: { name: "Cat" }, units: { name: "Kaleng" },
    variants: [{ id: "v2", name: "Putih", stock: 0, minimum_stock: 5, is_active: true }],
  }] }),
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

  it("loads the next page when the bottom sentinel enters view", () => {
    render(<MemoryRouter><Products /></MemoryRouter>);

    act(() => intersect([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver));

    expect(fetchNextPage).toHaveBeenCalledOnce();
    expect(screen.getByRole("region", { name: "Daftar produk mobile" })).toHaveTextContent("Semen Tiga Roda");
  });

  it("shows out-of-stock products even when they are not on the loaded page", () => {
    render(<MemoryRouter><Products /></MemoryRouter>);

    fireEvent.click(screen.getByRole("button", { name: "Stok habis" }));

    const list = screen.getByRole("region", { name: "Daftar produk mobile" });
    expect(list).toHaveTextContent("Cat Tembok (Putih)");
    expect(list).not.toHaveTextContent("Semen Tiga Roda");
  });
});
