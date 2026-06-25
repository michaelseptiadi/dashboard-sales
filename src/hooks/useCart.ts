import { useState, useCallback } from "react";
import { generateInvoice } from "@/lib/format";
import type { SalesItem } from "@/features/sales/types";

const STORAGE_KEY = "puri_indah_carts_v1";

export interface PendingCart {
  id: string;
  createdAt: string;
  invoiceNumber: string;
  salesDate: string;
  dueDate?: string;
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
  const tzoffset = new Date().getTimezoneOffset() * 60000;
  const localDate = new Date(Date.now() - tzoffset).toISOString().slice(0, 16);
  return {
    invoiceNumber: generateInvoice(),
    salesDate: localDate,
    dueDate: "",
    customerMode: "existing",
    customerId: "",
    customerName: "Umum (Walk-in)",
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
    return loadCarts();
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
        persistCarts(remaining);
        if (id === activeCartId) {
          nextActiveId = remaining[0]?.id ?? "";
        }
        return remaining;
      });
      if (id === activeCartId) {
        setActiveCartId(nextActiveId);
      }
    },
    [activeCartId],
  );

  return { carts, activeCartId, activeCart, saveCart, newCart, switchCart, removeCart };
}
