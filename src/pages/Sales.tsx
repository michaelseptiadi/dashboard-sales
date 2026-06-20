import { useState, useCallback, useEffect, useRef } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useToast } from "@/hooks/use-toast";
import { useCustomers } from "@/hooks/useCustomers";
import { useActiveProducts } from "@/hooks/useProducts";
import { usePaymentMethods, useCreateSalesTransaction, useAddPaymentLog, useMarkSelfPickupItems } from "@/hooks/useSales";
import { useDrivers } from "@/hooks/useMasterData";
import { useDebounce } from "@/hooks/useDebounce";
import { TransactionInfoCard } from "@/features/sales/components/TransactionInfoCard";
import { CustomerSelector } from "@/features/sales/components/CustomerSelector";
import { DeliverySelector } from "@/features/sales/components/DeliverySelector";
import { ItemsTable } from "@/features/sales/components/ItemsTable";
import { SuccessScreen } from "@/features/sales/components/SuccessScreen";
import { CartManager } from "@/features/sales/components/CartManager";
import { useCart, createEmptyCartData } from "@/hooks/useCart";
import { nowLocalDateTimeString } from "@/lib/format";
import type { SalesItem } from "@/features/sales/types";
import type { Product } from "@/hooks/useProducts";

export default function Sales() {
  const { toast } = useToast();
  const { data: customers } = useCustomers();
  const { data: paymentMethods } = usePaymentMethods();
  const { data: drivers } = useDrivers();
  const createTransaction = useCreateSalesTransaction();
  const { mutateAsync: addPaymentLog } = useAddPaymentLog();
  const { mutateAsync: markSelfPickup } = useMarkSelfPickupItems();

  const { carts, activeCartId, activeCart, saveCart, newCart, switchCart, removeCart } = useCart();

  // ── form state (initialised from active cart in localStorage) ──────────────
  const [invoiceNumber, setInvoiceNumber] = useState(() => activeCart?.invoiceNumber ?? "");
  const [salesDate, setSalesDate] = useState(() => activeCart?.salesDate ?? nowLocalDateTimeString());

  const [customerMode, setCustomerMode] = useState<"existing" | "manual">(() => activeCart?.customerMode ?? "existing");
  const [customerId, setCustomerId] = useState<string>(() => activeCart?.customerId ?? "");
  const [customerName, setCustomerName] = useState(() => activeCart?.customerName ?? "");
  const [customerPhone, setCustomerPhone] = useState(() => activeCart?.customerPhone ?? "");
  const [customerAddress, setCustomerAddress] = useState(() => activeCart?.customerAddress ?? "");
  const [paymentMethodId, setPaymentMethodId] = useState(() => activeCart?.paymentMethodId ?? "");
  const [deliveryType, setDeliveryType] = useState<"driver" | "self_delivery" | "">(() => activeCart?.deliveryType ?? "driver");
  const [driverId, setDriverId] = useState(() => activeCart?.driverId ?? "");
  const [deliveryFee, setDeliveryFee] = useState(() => activeCart?.deliveryFee ?? 0);
  const [notes, setNotes] = useState(() => activeCart?.notes ?? "");
  const [items, setItems] = useState<SalesItem[]>(() => activeCart?.items ?? []);
  const [paymentAmount, setPaymentAmount] = useState(() => activeCart?.paymentAmount ?? 0);
  const [submitted, setSubmitted] = useState(false);
  const submittedDataRef = useRef<{ invoice: string; total: number } | null>(null);

  const [productSearch, setProductSearch] = useState("");
  const debouncedProductSearch = useDebounce(productSearch, 500);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const { data: searchProducts } = useActiveProducts(debouncedProductSearch, selectedCategory);
  const [productSearchOpen, setProductSearchOpen] = useState(false);

  // ── prevent auto-save from firing when we're loading a different cart ──────
  const loadingCartRef = useRef(false);

  // Sanitize customerId: clear if it exists but is not found in the loaded customers list
  useEffect(() => {
    if (customers && customerId && customerMode === "existing") {
      const exists = customers.some((c) => c.id === customerId);
      if (!exists) {
        setCustomerId("");
        setCustomerName("");
      }
    }
  }, [customers, customerId, customerMode]);

  // ── auto-save current form to active cart (debounced) ─────────────────────
  useEffect(() => {
    if (loadingCartRef.current) return;
    const timer = setTimeout(() => {
      if (!activeCartId) return;
      saveCart(activeCartId, {
        invoiceNumber,
        salesDate,
        customerMode,
        customerId,
        customerName,
        customerPhone,
        customerAddress,
        paymentMethodId,
        deliveryType,
        driverId,
        deliveryFee,
        notes,
        items,
        paymentAmount,
      });
    }, 400);
    return () => clearTimeout(timer);
  }, [
    invoiceNumber, salesDate, customerMode, customerId, customerName,
    customerPhone, customerAddress, paymentMethodId, deliveryType,
    driverId, deliveryFee, notes, items, paymentAmount, activeCartId, saveCart,
  ]);

  // ── load a cart's data into form fields ───────────────────────────────────
  const loadCart = useCallback((cart: typeof activeCart) => {
    if (!cart) return;
    loadingCartRef.current = true;
    setInvoiceNumber(cart.invoiceNumber);
    setSalesDate(cart.salesDate);
    setCustomerMode(cart.customerMode);
    setCustomerId(cart.customerId);
    setCustomerName(cart.customerName);
    setCustomerPhone(cart.customerPhone);
    setCustomerAddress(cart.customerAddress);
    setPaymentMethodId(cart.paymentMethodId);
    setDeliveryType(cart.deliveryType);
    setDriverId(cart.driverId);
    setDeliveryFee(cart.deliveryFee);
    setNotes(cart.notes);
    setItems(cart.items);
    setPaymentAmount(cart.paymentAmount ?? 0);
    setSubmitted(false);
    // allow auto-save again after React flushes state updates
    requestAnimationFrame(() => { loadingCartRef.current = false; });
  }, []);

  // ── switch to an existing pending cart ────────────────────────────────────
  const handleSwitchCart = useCallback((id: string) => {
    if (id === activeCartId) return;
    const target = carts.find((c) => c.id === id);
    if (!target) return;
    switchCart(id);
    loadCart(target);
  }, [activeCartId, carts, switchCart, loadCart]);

  // ── create a new pending cart ─────────────────────────────────────────────
  const handleNewCart = useCallback(() => {
    const cart = newCart();
    loadCart(cart);
  }, [newCart, loadCart]);

  // ── remove a cart (and switch to another) ────────────────────────────────
  const handleRemoveCart = useCallback((id: string) => {
    const remaining = carts.filter((c) => c.id !== id);
    removeCart(id);
    if (id === activeCartId) {
      if (remaining.length > 0) {
        loadCart(remaining[0]);
      } else {
        // removeCart creates a fresh cart automatically; load empty defaults
        const empty = createEmptyCartData();
        loadingCartRef.current = true;
        setInvoiceNumber(empty.invoiceNumber);
        setSalesDate(empty.salesDate);
        setCustomerMode(empty.customerMode);
        setCustomerId(empty.customerId);
        setCustomerName(empty.customerName);
        setCustomerPhone(empty.customerPhone);
        setCustomerAddress(empty.customerAddress);
        setPaymentMethodId(empty.paymentMethodId);
        setDeliveryType(empty.deliveryType);
        setDriverId(empty.driverId);
        setDeliveryFee(empty.deliveryFee);
        setNotes(empty.notes);
        setItems(empty.items);
        setPaymentAmount(0);
        setSubmitted(false);
        requestAnimationFrame(() => { loadingCartRef.current = false; });
      }
    }
  }, [activeCartId, carts, removeCart, loadCart]);

  // When an existing customer is selected, also sync their name into customerName
  // so the CartManager label reflects the actual customer immediately.
  const handleSetCustomerId = useCallback((id: string) => {
    setCustomerId(id);
    const found = customers?.find((c) => c.id === id);
    if (found) setCustomerName(found.name);
  }, [customers]);

  // When switching to manual mode, clear the id-derived name so it doesn't bleed over.
  const handleSetCustomerMode = useCallback((mode: "existing" | "manual") => {
    setCustomerMode(mode);
    if (mode === "manual") {
      setCustomerId("");
      setCustomerName("");
    } else {
      // restore name from currently selected customer if any
      const found = customers?.find((c) => c.id === customerId);
      if (found) setCustomerName(found.name);
      else setCustomerName("");
    }
  }, [customers, customerId]);

  const addItem = useCallback(
    (product: Product) => {
      setItems((prev) => {
        const existing = prev.find((i) => i.product_id === product.store_product_id);
        if (existing) {
          return prev.map((i) =>
            i.product_id === product.store_product_id
              ? { ...i, qty: i.qty + 1, subtotal: (i.qty + 1) * i.price - i.discount }
              : i
          );
        }
        return [
          ...prev,
          {
            product_id: product.store_product_id,
            product_name: product.name,
            product_code: product.product_code,
            qty: 1,
            price: product.selling_price,
            discount: 0,
            subtotal: product.selling_price,
          },
        ];
      });
    },
    [setItems],
  );

  const decrementItem = useCallback(
    (productId: string) => {
      setItems((prev) => {
        const existing = prev.find((i) => i.product_id === productId);
        if (!existing) return prev;
        if (existing.qty <= 1) {
          return prev.filter((i) => i.product_id !== productId);
        }
        return prev.map((i) =>
          i.product_id === productId
            ? { ...i, qty: i.qty - 1, subtotal: (i.qty - 1) * i.price - i.discount }
            : i
        );
      });
    },
    [setItems],
  );

  const updateItem = (index: number, field: keyof SalesItem, value: number) => {
    setItems((prev) => {
      const updated = [...prev];
      (updated[index] as any)[field] = Number(value);
      updated[index].subtotal =
        Number(updated[index].qty) * Number(updated[index].price) - Number(updated[index].discount);
      return updated;
    });
  };

  const removeItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const toggleItemSelfPickup = (index: number) => {
    setItems((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, self_pickup: !item.self_pickup } : item
      )
    );
  };

  // Keep deliveryType in sync with items: all self_pickup → self_delivery, otherwise → driver
  useEffect(() => {
    if (items.length === 0) return;
    const allSelfPickup = items.every((i) => i.self_pickup);
    if (allSelfPickup) {
      if (deliveryType !== "self_delivery") {
        setDeliveryType("self_delivery");
        setDriverId("");
      }
    } else {
      if (deliveryType !== "driver") {
        setDeliveryType("driver");
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);

  const totalAmount = items.reduce((sum, i) => sum + Number(i.qty) * Number(i.price), 0);
  const totalDiscount = items.reduce((sum, i) => sum + Number(i.discount), 0);
  const grandTotal = items.reduce((sum, i) => sum + Number(i.subtotal), 0) + Number(deliveryFee);

  const handleSubmit = async () => {
    if (!paymentMethodId) {
      toast({ title: "Metode bayar harus dipilih", variant: "destructive" });
      return;
    }
    if (deliveryType === "driver" && !driverId) {
      toast({ title: "Pilih supir pengiriman", variant: "destructive" });
      return;
    }
    if (customerMode === "existing" && !customerId) {
      toast({ title: "Pelanggan harus dipilih", variant: "destructive" });
      return;
    }
    if (customerMode === "manual" && !customerName.trim()) {
      toast({ title: "Nama pelanggan harus diisi", variant: "destructive" });
      return;
    }
    if (items.length === 0) {
      toast({ title: "Tambahkan minimal 1 produk", variant: "destructive" });
      return;
    }

    try {
      const orderId = await createTransaction.mutateAsync({
        p_invoice_number: invoiceNumber,
        p_sales_date: salesDate,
        p_customer_id: customerMode === "existing" && customerId ? customerId : undefined,
        p_customer_name: customerMode === "manual" ? customerName : undefined,
        p_customer_phone: customerMode === "manual" ? customerPhone : undefined,
        p_customer_address: customerMode === "manual" ? customerAddress : undefined,
        p_payment_method_id: paymentMethodId || undefined,
        p_delivery_types: deliveryType || undefined,
        p_driver_id: deliveryType === "driver" && driverId ? driverId : undefined,
        p_notes: notes || undefined,
        p_delivery_fee: deliveryFee > 0 ? deliveryFee : undefined,
        p_items: items.map((i) => ({
          product_id: i.product_id,
          qty: i.qty,
          price: i.price,
          discount: i.discount,
        })),
      });
      if (paymentAmount > 0 && orderId) {
        await addPaymentLog({
          orderId: orderId as string,
          amount: Math.min(paymentAmount, grandTotal),
        });
      }
      // Mark self_pickup items
      const selfPickupProductIds = items
        .filter((i) => i.self_pickup)
        .map((i) => i.product_id);
      if (selfPickupProductIds.length > 0 && orderId) {
        await markSelfPickup({ orderId: orderId as string, productIds: selfPickupProductIds });
      }
      // Capture submitted data for the SuccessScreen before resetting the form
      submittedDataRef.current = { invoice: invoiceNumber, total: grandTotal };
      // Remove the submitted cart and reset the form to the next/empty cart
      const submittedId = activeCartId;
      const remaining = carts.filter((c) => c.id !== submittedId);
      removeCart(submittedId);
      if (remaining.length > 0) {
        switchCart(remaining[0].id);
        loadCart(remaining[0]);
      } else {
        const empty = createEmptyCartData();
        loadingCartRef.current = true;
        setInvoiceNumber(empty.invoiceNumber);
        setSalesDate(empty.salesDate);
        setCustomerMode(empty.customerMode);
        setCustomerId(empty.customerId);
        setCustomerName(empty.customerName);
        setCustomerPhone(empty.customerPhone);
        setCustomerAddress(empty.customerAddress);
        setPaymentMethodId(empty.paymentMethodId);
        setDeliveryType(empty.deliveryType);
        setDriverId(empty.driverId);
        setDeliveryFee(empty.deliveryFee);
        setNotes(empty.notes);
        setItems(empty.items);
        setPaymentAmount(0);
        requestAnimationFrame(() => { loadingCartRef.current = false; });
      }
      setSubmitted(true);
      toast({ title: "Transaksi berhasil disimpan!" });
    } catch (error: any) {
      toast({
        title: "Gagal menyimpan transaksi",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // Called from SuccessScreen — form is already reset; just clear the success overlay
  const resetForm = useCallback(() => {
    submittedDataRef.current = null;
    setSubmitted(false);
  }, []);

  if (submitted) {
    return (
      <DashboardLayout title="Penjualan">
        <SuccessScreen
          invoiceNumber={submittedDataRef.current?.invoice ?? invoiceNumber}
          grandTotal={submittedDataRef.current?.total ?? grandTotal}
          onReset={resetForm}
        />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Penjualan">
      <CartManager
        carts={carts}
        activeCartId={activeCartId}
        onSwitch={handleSwitchCart}
        onNew={handleNewCart}
        onRemove={handleRemoveCart}
      />
      <div className="grid items-start gap-6 lg:grid-cols-[360px_1fr]">
        <div className="space-y-4 lg:sticky lg:top-6">
          <TransactionInfoCard
            invoiceNumber={invoiceNumber}
            salesDate={salesDate}
            setSalesDate={setSalesDate}
            paymentMethodId={paymentMethodId}
            setPaymentMethodId={setPaymentMethodId}
            notes={notes}
            setNotes={setNotes}
            paymentMethods={paymentMethods}
          />
          <CustomerSelector
            customerMode={customerMode}
            setCustomerMode={handleSetCustomerMode}
            customerId={customerId}
            setCustomerId={handleSetCustomerId}
            customerName={customerName}
            setCustomerName={setCustomerName}
            customerPhone={customerPhone}
            setCustomerPhone={setCustomerPhone}
            customerAddress={customerAddress}
            setCustomerAddress={setCustomerAddress}
            customers={customers}
          />
          <DeliverySelector
            deliveryType={deliveryType}
            setDeliveryType={setDeliveryType}
            driverId={driverId}
            setDriverId={setDriverId}
            drivers={drivers}
          />
        </div>
        <ItemsTable
          items={items}
          addItem={addItem}
          decrementItem={decrementItem}
          updateItem={updateItem}
          toggleItemSelfPickup={toggleItemSelfPickup}
          removeItem={removeItem}
          productSearch={productSearch}
          setProductSearch={setProductSearch}
          searchProducts={searchProducts}
          productSearchOpen={productSearchOpen}
          setProductSearchOpen={setProductSearchOpen}
          selectedCategory={selectedCategory}
          setSelectedCategory={setSelectedCategory}
          totalAmount={totalAmount}
          totalDiscount={totalDiscount}
          deliveryFee={deliveryFee}
          setDeliveryFee={setDeliveryFee}
          grandTotal={grandTotal}
          paymentAmount={paymentAmount}
          setPaymentAmount={setPaymentAmount}
          onSubmit={handleSubmit}
          isPending={createTransaction.isPending}
        />
      </div>
    </DashboardLayout>
  );
}

