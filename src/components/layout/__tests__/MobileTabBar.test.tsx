// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom";
import { MobileTabBar } from "../MobileTabBar";

let currentRole: "admin" | "cashier" = "admin";

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ currentRole, isSuperAdmin: false }),
}));

vi.mock("@/components/ui/sidebar", () => ({
  SidebarTrigger: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button {...props}>{children}</button>
  ),
}));

describe("MobileTabBar", () => {
  beforeEach(() => {
    currentRole = "admin";
  });

  it("shows the manager's primary destinations", () => {
    render(<MemoryRouter initialEntries={["/"]}><MobileTabBar /></MemoryRouter>);

    expect(screen.getByRole("link", { name: /dashboard/i })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: /transaksi/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /menu lainnya/i })).toBeInTheDocument();
  });

  it("replaces the unavailable dashboard with history for cashiers", () => {
    currentRole = "cashier";
    render(<MemoryRouter initialEntries={["/penjualan"]}><MobileTabBar /></MemoryRouter>);

    expect(screen.queryByRole("link", { name: /dashboard/i })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /riwayat/i })).toBeInTheDocument();
  });
});
