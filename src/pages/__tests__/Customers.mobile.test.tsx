// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom";
import Customers from "../Customers";

vi.mock("@/components/DashboardLayout", () => ({ DashboardLayout: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ currentRole: "admin", isSuperAdmin: false }) }));
vi.mock("@/hooks/useCustomers", () => ({
  useCustomers: () => ({ data: [{ id: "c1", name: "Budi Santoso", phone: "08123456789", address: "Jl. Melati 12", email: "budi@example.com", is_active: true, created_at: "", updated_at: "" }], isLoading: false }),
  useCreateCustomer: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

describe("Customers mobile presentation", () => {
  it("presents customers as scannable contact cards", () => {
    render(<MemoryRouter><Customers /></MemoryRouter>);

    const list = screen.getByRole("region", { name: "Daftar pelanggan mobile" });
    expect(list).toHaveTextContent("Budi Santoso");
    expect(list).toHaveTextContent("08123456789");
    expect(list).toHaveTextContent("Jl. Melati 12");
    expect(screen.getByRole("button", { name: "Lihat detail Budi Santoso" })).toBeInTheDocument();
  });
});
