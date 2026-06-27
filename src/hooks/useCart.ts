import { useState, useCallback, useEffect } from "react";
import { generateInvoice } from "@/lib/format";
import type { SalesItem } from "@/features/sales/types";
import { useAuth } from "@/hooks/useAuth";

const STORAGE_KEY_PREFIX = "puri_indah_carts_v1";

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
  paymentBank?: string;
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
    paymentBank: "",
    deliveryType: "self_delivery",
    driverId: "",
    deliveryFee: 0,
    notes: "",
    items: [],
    paymentAmount: 0,
  };
}

function generateUUID(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  // Fallback for insecure contexts (like HTTP on mobile/local network)
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function makeCart(): PendingCart {
  return {
    id: generateUUID(),
    createdAt: new Date().toISOString(),
    ...createEmptyCartData(),
  };
}

export function useCart() {
  const { selectedStore } = useAuth();
  const storeId = selectedStore?.id ?? "global";
  const storageKey = `${STORAGE_KEY_PREFIX}_${storeId}`;

  const loadCarts = useCallback((): PendingCart[] => {
    try {
      const raw = localStorage.getItem(storageKey);
      return raw ? (JSON.parse(raw) as PendingCart[]) : [];
    } catch {
      return [];
    }
  }, [storageKey]);

  const persistCarts = useCallback((updatedCarts: PendingCart[]) => {
    localStorage.setItem(storageKey, JSON.stringify(updatedCarts));
  }, [storageKey]);

  const [carts, setCarts] = useState<PendingCart[]>(() => {
    try {
      const initStore = localStorage.getItem("selected_store");
      const initStoreId = initStore ? (JSON.parse(initStore) as { id: string })?.id : "global";
      const raw = localStorage.getItem(`${STORAGE_KEY_PREFIX}_${initStoreId}`);
      return raw ? (JSON.parse(raw) as PendingCart[]) : [];
    } catch {
      return [];
    }
  });

  const [activeCartId, setActiveCartId] = useState<string>(() => {
    try {
      const initStore = localStorage.getItem("selected_store");
      const initStoreId = initStore ? (JSON.parse(initStore) as { id: string })?.id : "global";
      const raw = localStorage.getItem(`${STORAGE_KEY_PREFIX}_${initStoreId}`);
      const parsed = raw ? (JSON.parse(raw) as PendingCart[]) : [];
      return parsed[0]?.id ?? "";
    } catch {
      return "";
    }
  });

  // Keep carts state and activeCartId in sync when storeId changes
  useEffect(() => {
    const loaded = loadCarts();
    setCarts(loaded);
    setActiveCartId(loaded[0]?.id ?? "");
  }, [storeId, loadCarts]);

  const activeCart = carts.find((c) => c.id === activeCartId) ?? carts[0];

  const saveCart = useCallback((id: string, data: CartFormData) => {
    setCarts((prev) => {
      const updated = prev.map((c) => (c.id === id ? { ...c, ...data } : c));
      persistCarts(updated);
      return updated;
    });
  }, [persistCarts]);

  const newCart = useCallback((): PendingCart => {
    const cart = makeCart();
    setCarts((prev) => {
      const updated = [...prev, cart];
      persistCarts(updated);
      return updated;
    });
    setActiveCartId(cart.id);
    return cart;
  }, [persistCarts]);

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
    [activeCartId, persistCarts],
  );

  return { carts, activeCartId, activeCart, saveCart, newCart, switchCart, removeCart };
}
