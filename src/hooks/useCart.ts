import { useState, useCallback } from "react";
import { generateInvoice } from "@/lib/format";
import type { SalesItem } from "@/features/sales/types";

const STORAGE_KEY = "puri_indah_carts_v1";

export interface PendingCart {
  id: string;
  createdAt: string;
  invoiceNumber: string;
  salesDate: string;
  customerMode: "existing" | "manual";
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  paymentMethodId: string;
  deliveryType: "driver" | "self_delivery" | "";
  driverId: string;
  deliveryFee: number;
  notes: string;
  items: SalesItem[];
  paymentAmount: number;
}

export type CartFormData = Omit<PendingCart, "id" | "createdAt">;

export function createEmptyCartData(): CartFormData {
  return {
    invoiceNumber: generateInvoice(),
    salesDate: new Date().toISOString().slice(0, 16),
    customerMode: "existing",
    customerId: "",
    customerName: "",
    customerPhone: "",
    customerAddress: "",
    paymentMethodId: "",
    deliveryType: "driver",
    driverId: "",
    deliveryFee: 0,
    notes: "",
    items: [],
    paymentAmount: 0,
  };
}

function loadCarts(): PendingCart[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as PendingCart[]) : [];
  } catch {
    return [];
  }
}

function persistCarts(carts: PendingCart[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(carts));
}

function makeCart(): PendingCart {
  return {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    ...createEmptyCartData(),
  };
}

export function useCart() {
  const [carts, setCarts] = useState<PendingCart[]>(() => {
    const saved = loadCarts();
    if (saved.length > 0) return saved;
    const initial = makeCart();
    persistCarts([initial]);
    return [initial];
  });

  const [activeCartId, setActiveCartId] = useState<string>(() => {
    const saved = loadCarts();
    return saved[0]?.id ?? "";
  });

  const activeCart = carts.find((c) => c.id === activeCartId) ?? carts[0];

  const saveCart = useCallback((id: string, data: CartFormData) => {
    setCarts((prev) => {
      const updated = prev.map((c) => (c.id === id ? { ...c, ...data } : c));
      persistCarts(updated);
      return updated;
    });
  }, []);

  const newCart = useCallback((): PendingCart => {
    const cart = makeCart();
    setCarts((prev) => {
      const updated = [...prev, cart];
      persistCarts(updated);
      return updated;
    });
    setActiveCartId(cart.id);
    return cart;
  }, []);

  const switchCart = useCallback((id: string) => {
    setActiveCartId(id);
  }, []);

  const removeCart = useCallback(
    (id: string) => {
      let nextActiveId = "";
      setCarts((prev) => {
        const remaining = prev.filter((c) => c.id !== id);
        if (remaining.length === 0) {
          const fresh = makeCart();
          persistCarts([fresh]);
          nextActiveId = fresh.id;
          return [fresh];
        }
        persistCarts(remaining);
        if (id === activeCartId) {
          nextActiveId = remaining[0].id;
        }
        return remaining;
      });
      if (id === activeCartId || nextActiveId) {
        setActiveCartId((prev) => (nextActiveId || prev));
      }
    },
    [activeCartId],
  );

  return { carts, activeCartId, activeCart, saveCart, newCart, switchCart, removeCart };
}
