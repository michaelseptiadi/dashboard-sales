// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useCart, PendingCart } from "../useCart";

const store: Record<string, string> = {};
const mockLocalStorage = {
  getItem: vi.fn((key: string) => store[key] || null),
  setItem: vi.fn((key: string, value: string) => {
    store[key] = value.toString();
  }),
  removeItem: vi.fn((key: string) => {
    delete store[key];
  }),
  clear: vi.fn(() => {
    for (const key in store) {
      delete store[key];
    }
  }),
  length: 0,
  key: vi.fn((index: number) => Object.keys(store)[index] || null),
};

Object.defineProperty(window, "localStorage", {
  value: mockLocalStorage,
  writable: true,
});

let mockSelectedStore: { id: string; store_name: string } | null = {
  id: "store-a",
  store_name: "Store A",
};

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    selectedStore: mockSelectedStore,
  }),
}));

describe("useCart Hook - Store Isolation", () => {
  beforeEach(() => {
    window.localStorage.clear();
    mockSelectedStore = {
      id: "store-a",
      store_name: "Store A",
    };
  });

  it("should isolate pending carts between different stores", () => {
    // 1. Render hook with Store A active
    const { result, rerender } = renderHook(() => useCart());

    // Expect initial empty list
    expect(result.current.carts).toHaveLength(0);

    // Add a new cart in Store A
    let cartA: PendingCart;
    act(() => {
      cartA = result.current.newCart();
    });

    expect(result.current.carts).toHaveLength(1);
    expect(result.current.carts[0].id).toBe(cartA.id);

    // Check localStorage has correct store key
    const rawCartsA = window.localStorage.getItem("puri_indah_carts_v1_store-a");
    expect(rawCartsA).toBeDefined();
    expect(JSON.parse(rawCartsA!)).toHaveLength(1);

    // Store B key should be empty/null
    expect(window.localStorage.getItem("puri_indah_carts_v1_store-b")).toBeNull();

    // 2. Switch mock store to Store B
    mockSelectedStore = {
      id: "store-b",
      store_name: "Store B",
    };

    // Rerender the hook so that the useEffect in useCart notices storeId change
    rerender();

    // Carts for Store B should be empty
    expect(result.current.carts).toHaveLength(0);

    // Add a new cart in Store B
    let cartB: PendingCart;
    act(() => {
      cartB = result.current.newCart();
    });

    expect(result.current.carts).toHaveLength(1);
    expect(result.current.carts[0].id).toBe(cartB.id);

    // Check localStorage Store B key
    const rawCartsB = window.localStorage.getItem("puri_indah_carts_v1_store-b");
    expect(rawCartsB).toBeDefined();
    expect(JSON.parse(rawCartsB!)).toHaveLength(1);

    // 3. Switch back to Store A
    mockSelectedStore = {
      id: "store-a",
      store_name: "Store A",
    };

    rerender();

    // Store A cart should be re-hydrated
    expect(result.current.carts).toHaveLength(1);
    expect(result.current.carts[0].id).toBe(cartA.id);
  });
});
