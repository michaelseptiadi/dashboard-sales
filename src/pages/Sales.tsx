import { useState, useCallback, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useToast } from "@/hooks/use-toast";
import { useCustomers } from "@/hooks/useCustomers";
import { useActiveProducts, useInfiniteActiveProducts } from "@/hooks/useProducts";
import { usePaymentMethods, useCreateSalesTransaction, useAddPaymentLog, useMarkSelfPickupItems } from "@/hooks/useSales";
import { useDrivers } from "@/hooks/useMasterData";
import { TransactionInfoCard } from "@/features/sales/components/TransactionInfoCard";
import { CustomerSelector } from "@/features/sales/components/CustomerSelector";
import { DeliverySelector } from "@/features/sales/components/DeliverySelector";
import { ItemsTable } from "@/features/sales/components/ItemsTable";
import { useCart, createEmptyCartData } from "@/hooks/useCart";
import type { SalesItem } from "@/features/sales/types";
import type { Product } from "@/hooks/useProducts";

// Modern UI components for checkout modal
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { TransactionReceipt } from "@/features/sales/components/TransactionReceipt";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Plus,
  ChevronLeft,
  ChevronRight,
  User,
  Package,
  CreditCard,
  ShoppingCart,
  Trash2,
  Receipt,
  ArrowRight,
  Coins,
  Check,
} from "lucide-react";
import { formatCurrency } from "@/lib/format";

const getLocalDatetimeString = (date: Date = new Date()) => {
  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - offset * 60 * 1000);
  return localDate.toISOString().slice(0, 16);
};

export default function Sales() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: customers } = useCustomers();
  const { data: paymentMethods } = usePaymentMethods();
  const { data: drivers } = useDrivers();
  const createTransaction = useCreateSalesTransaction();
  const { mutateAsync: addPaymentLog } = useAddPaymentLog();
  const { mutateAsync: markSelfPickup } = useMarkSelfPickupItems();

  const { carts, activeCartId, activeCart, saveCart, newCart, switchCart, removeCart } = useCart();

  const sortedCarts = [...carts].sort((a, b) => {
    const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return timeB - timeA;
  });

  // ── form state (initialised from active cart in localStorage) ──────────────
  const [invoiceNumber, setInvoiceNumber] = useState(() => activeCart?.invoiceNumber ?? "");
  const [salesDate, setSalesDate] = useState(() => activeCart?.salesDate ?? getLocalDatetimeString());
  const [dueDate, setDueDate] = useState(() => activeCart?.dueDate ?? "");
  const [customerMode, setCustomerMode] = useState<"existing" | "manual">(
    () => activeCart?.customerMode ?? "existing"
  );
  const [customerId, setCustomerId] = useState<string>(() => activeCart?.customerId ?? "");
  const [customerName, setCustomerName] = useState(() => activeCart?.customerName ?? "");
  const [customerPhone, setCustomerPhone] = useState(() => activeCart?.customerPhone ?? "");
  const [customerAddress, setCustomerAddress] = useState(() => activeCart?.customerAddress ?? "");
  const [paymentMethodId, setPaymentMethodId] = useState(() => activeCart?.paymentMethodId ?? "");
  const [paymentBank, setPaymentBank] = useState(() => activeCart?.paymentBank ?? "");
  const [deliveryType, setDeliveryType] = useState<"driver" | "self_delivery" | "">(
    () => activeCart?.deliveryType ?? "self_delivery"
  );
  const [driverId, setDriverId] = useState(() => activeCart?.driverId ?? "");
  const [deliveryFee, setDeliveryFee] = useState(() => activeCart?.deliveryFee ?? 0);
  const [notes, setNotes] = useState(() => activeCart?.notes ?? "");
  const [items, setItems] = useState<SalesItem[]>(() => activeCart?.items ?? []);
  const [paymentAmount, setPaymentAmount] = useState(() => activeCart?.paymentAmount ?? 0);
  const [submitted, setSubmitted] = useState(false);
  const submittedDataRef = useRef<{
    invoice: string;
    salesDate: string;
    customerMode: "existing" | "manual";
    customerName: string;
    customerPhone?: string;
    customerAddress?: string;
    paymentMethodName: string;
    paymentBank?: string;
    deliveryType: "driver" | "self_delivery" | "";
    driverName?: string;
    notes?: string;
    items: SalesItem[];
    totalAmount: number;
    totalDiscount: number;
    deliveryFee: number;
    grandTotal: number;
    paymentAmount: number;
  } | null>(null);

  const [productSearch, setProductSearch] = useState("");
  const { data: searchProductsInfinite, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteActiveProducts(productSearch);
  const searchProducts = searchProductsInfinite?.pages.flatMap(p => p.data) || [];
  const [productSearchOpen, setProductSearchOpen] = useState(false);

  const handleEditProduct = (product: Product) => {
    sessionStorage.setItem("sales:return_to_product_search", JSON.stringify({ search: productSearch }));
    navigate(`/produk/${product.id}`);
  };

  useEffect(() => {
    const raw = sessionStorage.getItem("sales:return_to_product_search");
    if (!raw) return;
    sessionStorage.removeItem("sales:return_to_product_search");
    try {
      const state = JSON.parse(raw) as { search?: string };
      setProductSearch(state.search ?? "");
      setProductSearchOpen(true);
    } catch {
      setProductSearchOpen(true);
    }
  }, []);

  // Modal and Step states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [maxStep, setMaxStep] = useState(1);

  useEffect(() => {
    setMaxStep((prev) => Math.max(prev, currentStep));
  }, [currentStep]);

  useEffect(() => {
    if (!isModalOpen) {
      setMaxStep(1);
    }
  }, [isModalOpen]);

  useEffect(() => {
    if (items.length > 0) {
      setMaxStep((prev) => Math.max(prev, 2));
    }
  }, [items.length]);

  const canNavigateToStep = (targetStep: number) => {
    if (targetStep === 1) return true;
    if (targetStep === 2) return maxStep >= 2;
    if (targetStep === 3) return maxStep >= 3 && items.length > 0;
    return false;
  };

  // prevent auto-save from firing when we're loading a different cart
  const loadingCartRef = useRef(false);
  // prevent the cart-sync effect from resetting submitted state right after a successful submit
  const justSubmittedRef = useRef(false);

  // auto-save current form to active cart (debounced)
  useEffect(() => {
    if (loadingCartRef.current) return;
    const timer = setTimeout(() => {
      if (!activeCartId) return;
      saveCart(activeCartId, {
        invoiceNumber,
        salesDate,
        dueDate,
        customerMode,
        customerId,
        customerName,
        customerPhone,
        customerAddress,
        paymentMethodId,
        paymentBank,
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
    invoiceNumber,
    salesDate,
    dueDate,
    customerMode,
    customerId,
    customerName,
    customerPhone,
    customerAddress,
    paymentMethodId,
    paymentBank,
    deliveryType,
    driverId,
    deliveryFee,
    notes,
    items,
    paymentAmount,
    activeCartId,
    saveCart,
  ]);

  // load a cart's data into form fields
  const loadCart = useCallback((cart: typeof activeCart) => {
    if (!cart) return;
    loadingCartRef.current = true;
    setInvoiceNumber(cart.invoiceNumber);
    setSalesDate(cart.salesDate);
    setDueDate(cart.dueDate ?? "");
    setCustomerMode(cart.customerMode);
    setCustomerId(cart.customerId);
    setCustomerName(cart.customerName);
    setCustomerPhone(cart.customerPhone);
    setCustomerAddress(cart.customerAddress);
    setPaymentMethodId(cart.paymentMethodId);
    setPaymentBank(cart.paymentBank ?? "");
    setDeliveryType(cart.deliveryType);
    setDriverId(cart.driverId);
    setDeliveryFee(cart.deliveryFee);
    setNotes(cart.notes);
    setItems(cart.items);
    setPaymentAmount(cart.paymentAmount ?? 0);
    setSubmitted(false);
    // allow auto-save again after React flushes state updates
    requestAnimationFrame(() => {
      loadingCartRef.current = false;
    });
  }, []);

  // Keep form state synchronized when activeCartId changes (e.g. switching carts or switching stores)
  useEffect(() => {
    // Don't reset state right after a successful submission — the receipt needs to stay visible
    if (justSubmittedRef.current) return;
    if (!activeCartId) {
      // If no active cart exists (e.g. empty queue for this store), clear form fields
      const empty = createEmptyCartData();
      loadingCartRef.current = true;
      setInvoiceNumber(empty.invoiceNumber);
      setSalesDate(empty.salesDate);
      setDueDate(empty.dueDate ?? "");
      setCustomerMode(empty.customerMode);
      setCustomerId(empty.customerId);
      setCustomerName(empty.customerName);
      setCustomerPhone(empty.customerPhone);
      setCustomerAddress(empty.customerAddress);
      setPaymentMethodId(empty.paymentMethodId);
      setPaymentBank(empty.paymentBank ?? "");
      setDeliveryType(empty.deliveryType);
      setDriverId(empty.driverId);
      setDeliveryFee(empty.deliveryFee);
      setNotes(empty.notes);
      setItems(empty.items);
      setPaymentAmount(0);
      setSubmitted(false);
      requestAnimationFrame(() => {
        loadingCartRef.current = false;
      });
      return;
    }

    const currentActiveCart = carts.find((c) => c.id === activeCartId);
    if (currentActiveCart) {
      loadCart(currentActiveCart);
    }
  }, [activeCartId, loadCart, carts]);

  // switch to an existing pending cart
  const handleSwitchCart = useCallback(
    (id: string) => {
      switchCart(id);
    },
    [switchCart]
  );

  // create a new pending cart
  const handleNewCart = useCallback(() => {
    newCart();
  }, [newCart]);

  // remove a cart (and switch to another)
  const handleRemoveCart = useCallback(
    (id: string) => {
      removeCart(id);
    },
    [removeCart]
  );

  // When an existing customer is selected, also sync their name into customerName
  const handleSetCustomerId = useCallback(
    (id: string) => {
      setCustomerId(id);
      const found = customers?.find((c) => c.id === id);
      if (found) setCustomerName(found.name);
    },
    [customers]
  );

  // When switching to manual mode, clear the id-derived name
  const handleSetCustomerMode = useCallback(
    (mode: "existing" | "manual") => {
      setCustomerMode(mode);
      if (mode === "manual") {
        setCustomerId("");
        setCustomerName("");
      } else {
        const found = customers?.find((c) => c.id === customerId);
        if (found) setCustomerName(found.name);
        else setCustomerName("");
      }
    },
    [customers, customerId]
  );

  const addItem = useCallback(
    (product: Product) => {
      if (items.find((i) => i.product_id === product.id)) {
        toast({ title: "Produk sudah ditambahkan", variant: "destructive" });
        return;
      }
      const defaultVariant = product.variants?.find((v) => v.name.toLowerCase() === "default") || product.variants?.[0];
      const initialPrice = defaultVariant ? Number(defaultVariant.selling_price) : product.selling_price;
      const initialUnitId = defaultVariant ? defaultVariant.unit_id : null;
      const initialUnitName = defaultVariant?.unit?.name || "";

      setItems((prev) => [
        ...prev,
        {
          product_id: product.id,
          product_name: product.name,
          product_code: product.product_code,
          qty: 1,
          price: initialPrice,
          discount: 0,
          subtotal: initialPrice,
          self_pickup: true,
          product_unit_id: initialUnitId,
          product_unit_name: initialUnitName,
          product_units: null,
          product_variant_id: defaultVariant?.id || null,
          product_variant_name: defaultVariant?.name || null,
          product_variants: product.variants || null,
        },
      ]);
      setProductSearch("");
      setProductSearchOpen(false);
    },
    [items, toast]
  );

  const updateItemPriceFromProduct = useCallback((productId: string, variantId: string, price: number) => {
    setItems((prev) => prev.map((item) => {
      // Loose match for variant ID (e.g. "" vs null vs undefined)
      const itemVarId = item.product_variant_id || "";
      const updateVarId = variantId || "";
      if (item.product_id !== productId || itemVarId !== updateVarId) return item;
      return { ...item, price, subtotal: Math.max(0, item.qty * price - item.discount) };
    }));
  }, []);

  const updateItem = (index: number, field: keyof SalesItem, value: string | number | boolean | null | undefined | import("@/hooks/useProducts").ProductUnit[] | import("@/hooks/useProducts").ProductVariant[]) => {
    setItems((prev) => {
      const updated = [...prev];
      const item = { ...updated[index] };

      if (field === "qty" && typeof value === "number") item.qty = value;
      else if (field === "price" && typeof value === "number") item.price = value;
      else if (field === "discount" && typeof value === "number") item.discount = value;
      else if (field === "subtotal" && typeof value === "number") item.subtotal = value;
      else if (field === "self_pickup" && typeof value === "boolean") item.self_pickup = value;
      else if (field === "product_variant_id" && (typeof value === "string" || value === null)) {
        item.product_variant_id = value as string | null;
        const selectedVariant = item.product_variants?.find((v) => v.id === value);
        if (selectedVariant) {
          item.product_variant_name = selectedVariant.name;
          item.price = Number(selectedVariant.selling_price);
          item.product_unit_name = selectedVariant.unit?.name || "";
          item.product_unit_id = selectedVariant.unit_id;
        } else {
          item.product_variant_name = null;
        }
      }

      updated[index] = item;
      updated[index].subtotal =
        updated[index].qty * updated[index].price - updated[index].discount;
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

  const totalAmount = items.reduce((sum, i) => sum + i.qty * i.price, 0);
  const totalDiscount = items.reduce((sum, i) => sum + i.discount, 0);
  const grandTotal = items.reduce((sum, i) => sum + i.subtotal, 0) + deliveryFee;

  const handleSubmit = async () => {
    if (!paymentMethodId) {
      toast({ title: "Metode bayar harus dipilih", variant: "destructive" });
      return;
    }
    if (deliveryType === "driver" && !driverId) {
      toast({ title: "Pilih supir pengiriman", variant: "destructive" });
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
    if (items.some((i) => !i.product_variant_id)) {
      toast({ title: "Pilih varian untuk semua produk", variant: "destructive" });
      return;
    }
    try {
      // If salesDate is unchanged from the cart creation date, we treat it as default
      // and use the current saving time. Otherwise, we respect the user's manual override.
      const isDateOverridden = activeCart && salesDate !== activeCart.salesDate;
      const finalSalesDate = isDateOverridden ? salesDate : getLocalDatetimeString();

      const salesOrder = await createTransaction.mutateAsync({
        p_invoice_number: invoiceNumber,
        p_sales_date: finalSalesDate,
        p_due_date: dueDate || undefined,
        p_customer_id: customerMode === "existing" && customerId ? customerId : undefined,
        p_customer_name: customerMode === "manual" ? customerName : (customerId ? undefined : "Umum (Walk-in)"),
        p_customer_phone: customerMode === "manual" ? customerPhone : undefined,
        p_customer_address: customerMode === "manual" ? customerAddress : undefined,
        p_payment_method_id: paymentMethodId || undefined,
        p_payment_details: paymentBank || undefined,
        p_delivery_types: deliveryType || undefined,
        p_driver_id: deliveryType === "driver" && driverId ? driverId : undefined,
        p_notes: notes || undefined,
        p_delivery_fee: deliveryFee > 0 ? deliveryFee : undefined,
        p_items: items.map((i) => ({
          product_id: i.product_id,
          product_unit_id: i.product_unit_id || undefined,
          product_variant_id: i.product_variant_id || undefined,
          qty: i.qty,
          price: i.price,
          discount: i.discount,
        })),
      });

      // Update state to use the saved database timestamp for receipt views
      if (salesOrder?.sales_date) {
        setSalesDate(salesOrder.sales_date);
      } else {
        setSalesDate(finalSalesDate);
      }

      if (paymentAmount > 0 && salesOrder?.id) {
        await addPaymentLog({
          orderId: salesOrder.id,
          amount: Math.min(paymentAmount, grandTotal),
          paymentMethodId,
          notes: notes || undefined,
        });
      }

      // Mark self_pickup items
      const selfPickupProductIds = items
        .filter((i) => i.self_pickup)
        .map((i) => i.product_id);
      if (selfPickupProductIds.length > 0 && salesOrder?.id) {
        try {
          await markSelfPickup({ orderId: salesOrder.id, productIds: selfPickupProductIds });
        } catch (err) {
          console.warn("Failed to mark self pickup items (endpoint not implemented):", err);
        }
      }

      // Capture submitted data for the SuccessScreen
      const pMethod = paymentMethods?.find((p) => p.id === paymentMethodId);
      const driver = drivers?.find((d) => d.id === driverId);

      const custName = customerMode === "manual" ? customerName : (customers?.find(c => c.id === customerId)?.name || customerName);
      const custPhone = customerMode === "manual" ? customerPhone : (customers?.find(c => c.id === customerId)?.phone || undefined);
      const custAddress = customerMode === "manual" ? customerAddress : (customers?.find(c => c.id === customerId)?.address || undefined);

      submittedDataRef.current = {
        invoice: invoiceNumber,
        salesDate: salesOrder?.sales_date || finalSalesDate,
        customerMode,
        customerName: custName || "Umum (Walk-in)",
        customerPhone: custPhone,
        customerAddress: custAddress,
        paymentMethodName: pMethod?.name || "Cash",
        paymentBank: paymentBank || undefined,
        deliveryType,
        driverName: driver?.driver_name,
        notes,
        items: [...items],
        totalAmount,
        totalDiscount,
        deliveryFee,
        grandTotal,
        paymentAmount,
      };

      // Remove the submitted cart and reset the form
      const submittedId = activeCartId;
      const remaining = carts.filter((c) => c.id !== submittedId);
      justSubmittedRef.current = true;  // prevent sync effect from resetting submitted state
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
        setPaymentBank(empty.paymentBank ?? "");
        setDeliveryType(empty.deliveryType);
        setDriverId(empty.driverId);
        setDeliveryFee(empty.deliveryFee);
        setNotes(empty.notes);
        setItems(empty.items);
        setPaymentAmount(0);
        requestAnimationFrame(() => {
          loadingCartRef.current = false;
        });
      }

      setSubmitted(true);
      setIsModalOpen(false);
      toast({ title: "Transaksi berhasil disimpan!" });
    } catch (error) {
      const err = error as Error;
      toast({
        title: "Gagal menyimpan transaksi",
        description: err.message,
        variant: "destructive",
      });
    }
  };

  const resetForm = useCallback(() => {
    justSubmittedRef.current = false;  // allow cart sync effect to run normally again
    submittedDataRef.current = null;
    setSubmitted(false);
    setIsModalOpen(false);
    setCurrentStep(1);
  }, []);

  const handleOpenChange = useCallback((open: boolean) => {
    setIsModalOpen(open);
    if (!open) {
      if (activeCartId) {
        saveCart(activeCartId, {
          invoiceNumber,
          salesDate,
          dueDate,
          customerMode,
          customerId,
          customerName,
          customerPhone,
          customerAddress,
          paymentMethodId,
          paymentBank,
          deliveryType,
          driverId,
          deliveryFee,
          notes,
          items,
          paymentAmount,
        });
      }
      setCurrentStep(1);
    }
  }, [
    activeCartId,
    invoiceNumber,
    salesDate,
    dueDate,
    customerMode,
    customerId,
    customerName,
    customerPhone,
    customerAddress,
    paymentMethodId,
    paymentBank,
    deliveryType,
    driverId,
    deliveryFee,
    notes,
    items,
    paymentAmount,
    saveCart,
  ]);

  if (submitted && submittedDataRef.current) {
    const data = submittedDataRef.current;
    return (
      <DashboardLayout title="Penjualan">
        <TransactionReceipt
          invoiceNumber={data.invoice}
          salesDate={data.salesDate}
          customerMode={data.customerMode}
          customerName={data.customerName}
          customerPhone={data.customerPhone}
          customerAddress={data.customerAddress}
          paymentMethodName={data.paymentMethodName}
          paymentBank={data.paymentBank}
          deliveryType={data.deliveryType}
          driverName={data.driverName}
          notes={data.notes}
          items={data.items}
          totalAmount={data.totalAmount}
          totalDiscount={data.totalDiscount}
          deliveryFee={data.deliveryFee}
          grandTotal={data.grandTotal}
          paymentAmount={data.paymentAmount}
          onReset={resetForm}
          onClose={resetForm}
        />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Penjualan">
      <div className="space-y-6">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-card border rounded-3xl p-6 shadow-sm">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Transaksi</h1>
            <p className="text-sm text-muted-foreground">Kelola antrean transaksi penjualan toko aktif Anda secara realtime.</p>
          </div>
          <Button
            onClick={() => {
              handleNewCart();
              setCurrentStep(1);
              setIsModalOpen(true);
            }}
            className="rounded-2xl h-11 gap-2 font-semibold shadow-sm bg-gradient-to-r from-primary to-primary/95 shrink-0"
          >
            <Plus className="h-4 w-4" /> Mulai Transaksi Baru
          </Button>
        </div>

        {/* Pending Carts Dashboard */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-primary" />
            <h2 className="font-bold text-lg text-foreground">Antrean Transaksi Pending ({carts.length})</h2>
          </div>

          {carts.length === 0 ? (
            <div className="border border-dashed border-muted/80 rounded-3xl p-12 text-center bg-card/50 flex flex-col items-center justify-center gap-3">
              <div className="p-4 rounded-full bg-muted/60 text-muted-foreground">
                <ShoppingCart className="h-10 w-10" />
              </div>
              <div className="space-y-1">
                <p className="font-semibold text-foreground">Tidak Ada Antrean Transaksi</p>
                <p className="text-xs text-muted-foreground max-w-sm">Semua antrean transaksi kosong. Klik tombol di atas untuk memulai penjualan baru.</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {sortedCarts.map((cart) => {
                const cartTotal = cart.items.reduce((sum, item) => sum + (item.qty * item.price - item.discount), 0) + (cart.deliveryFee || 0);
                const isCurrent = cart.id === activeCartId;
                return (
                  <Card key={cart.id} className={`rounded-3xl border shadow-sm hover:shadow-md transition-all relative overflow-hidden flex flex-col justify-between ${isCurrent ? 'border-primary/50 bg-primary/5' : 'bg-card'}`}>
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start gap-2">
                        <div className="space-y-0.5">
                          <span className="font-mono text-xs font-bold text-muted-foreground block">{cart.invoiceNumber}</span>
                          <CardTitle className="text-base font-bold truncate max-w-[180px]">
                            {cart.customerName || "Umum (Walk-in)"}
                          </CardTitle>
                          <span className="text-[10px] text-muted-foreground font-mono">
                            {new Date(cart.salesDate).toLocaleDateString("id-ID", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                        <Badge variant={isCurrent ? "default" : "secondary"} className="rounded-lg text-[10px] font-mono shrink-0">
                          {cart.items.length} item
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="pb-4">
                      <div className="space-y-3">
                        <div className="flex justify-between items-center text-sm font-semibold">
                          <span className="text-muted-foreground">Grand Total:</span>
                          <span className="text-primary font-bold font-mono">{formatCurrency(cartTotal)}</span>
                        </div>
                        <div className="flex items-center gap-2 pt-2">
                          <Button
                            size="sm"
                            onClick={() => {
                              handleSwitchCart(cart.id);
                              setCurrentStep(1);
                              setIsModalOpen(true);
                            }}
                            className="flex-1 rounded-xl gap-1.5 text-xs font-semibold"
                          >
                            <ArrowRight className="h-3.5 w-3.5" /> Lanjutkan
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleRemoveCart(cart.id)}
                            className="rounded-xl text-destructive hover:bg-destructive/10 hover:text-destructive text-xs"
                          >
                            <Trash2 className="h-3.5 w-3.5" /> Hapus
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Checkout Wizard Dialog */}
      <Dialog open={isModalOpen} onOpenChange={handleOpenChange}>
        <DialogContent 
          id="pos-checkout-dialog"
          className="max-w-[1380px] w-[96vw] max-h-[92dvh] h-auto flex flex-col p-0 gap-0 overflow-hidden rounded-3xl border bg-card"
        >
          {/* Header */}
          <div className="px-4 md:px-6 py-3 md:py-4 border-b border-muted/20 bg-muted/5 flex items-center justify-between">
            <div>
              <DialogTitle className="text-base md:text-lg font-bold flex items-center gap-2">
                <Receipt className="h-4 w-4 md:h-5 md:w-5 text-primary" />
                <span>Proses Transaksi</span>
              </DialogTitle>
              <p className="text-[10px] md:text-xs text-muted-foreground font-mono mt-0.5">Invoice: {invoiceNumber}</p>
            </div>
          </div>

          {/* Grid Container */}
          <div className="flex-1 min-h-0 overflow-hidden flex flex-col md:grid md:grid-cols-[160px_1fr] md:gap-6 p-4 md:p-6">
            
            {/* Steps Tracker */}
            <div className="flex flex-row md:flex-col border-b md:border-b-0 md:border-r pb-4 md:pb-0 mb-4 md:mb-0 md:pr-6 justify-between md:justify-center items-center h-auto md:h-full gap-2 md:gap-8 overflow-x-auto hide-scrollbar shrink-0">
              {/* Step 1 */}
              <button
                type="button"
                disabled={!canNavigateToStep(1)}
                onClick={() => setCurrentStep(1)}
                className={`flex flex-col items-center text-center gap-1.5 md:gap-2 flex-1 md:flex-none transition-all ${
                  currentStep === 1
                    ? 'opacity-100 font-bold'
                    : canNavigateToStep(1)
                    ? 'opacity-60 hover:opacity-100 cursor-pointer active:scale-95'
                    : 'opacity-30 cursor-not-allowed'
                }`}
              >
                <div className={`w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center font-bold text-xs md:text-sm shrink-0 transition-colors ${currentStep === 1 ? 'bg-primary text-primary-foreground shadow-sm' : 'bg-muted text-muted-foreground'}`}>1</div>
                <div className="min-w-0">
                  <h4 className="font-bold md:font-semibold text-[10px] md:text-xs uppercase tracking-wider text-muted-foreground/80 hidden md:block">Pelanggan</h4>
                  <p className="text-[10px] md:text-xs text-foreground font-medium md:mt-0.5 truncate max-w-[80px] md:max-w-[120px]">{customerName || "Umum"}</p>
                </div>
              </button>
              {/* Step 2 */}
              <button
                type="button"
                disabled={!canNavigateToStep(2)}
                onClick={() => setCurrentStep(2)}
                className={`flex flex-col items-center text-center gap-1.5 md:gap-2 flex-1 md:flex-none transition-all ${
                  currentStep === 2
                    ? 'opacity-100 font-bold'
                    : canNavigateToStep(2)
                    ? 'opacity-60 hover:opacity-100 cursor-pointer active:scale-95'
                    : 'opacity-30 cursor-not-allowed'
                }`}
              >
                <div className={`w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center font-bold text-xs md:text-sm shrink-0 transition-colors ${currentStep === 2 ? 'bg-primary text-primary-foreground shadow-sm' : 'bg-muted text-muted-foreground'}`}>2</div>
                <div className="min-w-0">
                  <h4 className="font-bold md:font-semibold text-[10px] md:text-xs uppercase tracking-wider text-muted-foreground/80 hidden md:block">Item</h4>
                  <p className="text-[10px] md:text-xs text-foreground font-medium md:mt-0.5 truncate max-w-[80px] md:max-w-[120px]">{items.length} produk</p>
                </div>
              </button>
              {/* Step 3 */}
              <button
                type="button"
                disabled={!canNavigateToStep(3)}
                onClick={() => setCurrentStep(3)}
                className={`flex flex-col items-center text-center gap-1.5 md:gap-2 flex-1 md:flex-none transition-all ${
                  currentStep === 3
                    ? 'opacity-100 font-bold'
                    : canNavigateToStep(3)
                    ? 'opacity-60 hover:opacity-100 cursor-pointer active:scale-95'
                    : 'opacity-30 cursor-not-allowed'
                }`}
              >
                <div className={`w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center font-bold text-xs md:text-sm shrink-0 transition-colors ${currentStep === 3 ? 'bg-primary text-primary-foreground shadow-sm' : 'bg-muted text-muted-foreground'}`}>3</div>
                <div className="min-w-0">
                  <h4 className="font-bold md:font-semibold text-[10px] md:text-xs uppercase tracking-wider text-muted-foreground/80 hidden md:block">Bayar</h4>
                  <p className="text-[10px] md:text-xs text-foreground font-medium md:mt-0.5 truncate max-w-[80px] md:max-w-[120px]">
                    {paymentMethodId ? (paymentMethods?.find(p => p.id === paymentMethodId)?.name || "Dipilih") : "Pilih metode"}
                  </p>
                </div>
              </button>
            </div>

            {/* Center Content Form (Scrollable) */}

            <div className={`flex-1 min-h-0 overflow-y-auto pr-1 md:pr-2 ${currentStep === 1 ? "space-y-4 md:space-y-6" : "space-y-6"}`}>
              {currentStep === 1 && (
                <div className="space-y-6">
                  <TransactionInfoCard
                    invoiceNumber={invoiceNumber}
                    salesDate={salesDate}
                    setSalesDate={setSalesDate}
                    paymentMethodId={paymentMethodId}
                    setPaymentMethodId={setPaymentMethodId}
                    paymentBank={paymentBank}
                    setPaymentBank={setPaymentBank}
                    dueDate={dueDate}
                    setDueDate={setDueDate}
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
                </div>
              )}

              {currentStep === 2 && (
                <div className="space-y-6">
                  <ItemsTable
                    items={items}
                    addItem={addItem}
                    onEditProduct={handleEditProduct}
                    onProductUpdated={updateItemPriceFromProduct}
                    updateItem={updateItem}
                    toggleItemSelfPickup={toggleItemSelfPickup}
                    removeItem={removeItem}
                    productSearch={productSearch}
                    setProductSearch={setProductSearch}
                    searchProducts={searchProducts}
                    fetchNextPage={fetchNextPage}
                    hasNextPage={hasNextPage}
                    isFetchingNextPage={isFetchingNextPage}
                    productSearchOpen={productSearchOpen}
                    setProductSearchOpen={setProductSearchOpen}
                    totalAmount={totalAmount}
                    totalDiscount={totalDiscount}
                    deliveryFee={deliveryFee}
                    setDeliveryFee={setDeliveryFee}
                    grandTotal={grandTotal}
                    paymentAmount={paymentAmount}
                    setPaymentAmount={setPaymentAmount}
                    onSubmit={handleSubmit}
                    isPending={createTransaction.isPending}
                    showSummary={false}
                  />
                </div>
              )}

              {currentStep === 3 && (
                <div className="space-y-6">
                  <DeliverySelector
                    deliveryType={deliveryType}
                    setDeliveryType={setDeliveryType}
                    driverId={driverId}
                    setDriverId={setDriverId}
                    drivers={drivers}
                  />
                  <Card className="rounded-3xl border shadow-sm">
                    <CardHeader>
                      <CardTitle className="text-base font-bold">Detail Pembayaran &amp; Catatan</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Metode Pembayaran</Label>
                            <select
                              value={paymentMethodId}
                              onChange={(e) => setPaymentMethodId(e.target.value)}
                              className="w-full h-11 px-3 border border-muted-foreground/20 rounded-xl bg-background text-sm font-semibold focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                            >
                              <option value="">Pilih Metode Pembayaran</option>
                              {paymentMethods?.map((pm) => (
                                <option key={pm.id} value={pm.id}>
                                  {pm.name}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="space-y-2">
                            <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Catatan Transaksi</Label>
                            <textarea
                              value={notes}
                              onChange={(e) => setNotes(e.target.value)}
                              placeholder="Tambahkan catatan jika ada..."
                              className="w-full h-11 min-h-[44px] max-h-24 px-3 py-2 border border-muted-foreground/20 rounded-xl bg-background text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none resize-none"
                            />
                          </div>
                        </div>

                        <div className="border-t border-muted/20 pt-4 space-y-3">
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-muted-foreground">Total Harga:</span>
                            <span className="font-semibold font-mono">{formatCurrency(totalAmount)}</span>
                          </div>
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-destructive font-semibold">Total Diskon:</span>
                            <span className="font-semibold font-mono text-destructive">− {formatCurrency(totalDiscount)}</span>
                          </div>
                          {deliveryFee > 0 && (
                            <div className="flex justify-between items-center text-sm">
                              <span className="text-muted-foreground">Biaya Kirim:</span>
                              <span className="font-semibold font-mono">+{formatCurrency(deliveryFee)}</span>
                            </div>
                          )}
                          <div className="flex justify-between items-center text-base font-bold bg-primary/5 px-4 py-3 rounded-2xl border border-primary/10 text-primary">
                            <span>Grand Total:</span>
                            <span className="font-mono text-lg">{formatCurrency(grandTotal)}</span>
                          </div>
                        </div>

                        <div className="border-t border-muted/20 pt-4 space-y-3">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <span className="text-sm font-bold text-foreground">Jumlah Dibayar:</span>
                            <div className="flex flex-wrap items-center justify-end gap-2.5">
                              {paymentAmount === grandTotal ? (
                                <div className="h-10 flex items-center gap-1.5 px-3 rounded-xl border border-emerald-200 bg-emerald-50/70 text-emerald-700 text-xs font-bold shadow-sm animate-in fade-in zoom-in-95 duration-200">
                                  <Check className="h-3.5 w-3.5 text-emerald-600" />
                                  Uang Pas
                                </div>
                              ) : (
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setPaymentAmount(grandTotal)}
                                  className="h-10 gap-1.5 px-3 rounded-xl border-primary/30 hover:border-primary bg-primary/5 hover:bg-primary text-primary hover:text-primary-foreground text-xs font-bold shadow-sm transition-all hover:scale-[1.02] active:scale-[0.98] duration-200 animate-in fade-in zoom-in-95"
                                >
                                  <Coins className="h-3.5 w-3.5" />
                                  Bayar Pas: {formatCurrency(grandTotal)}
                                </Button>
                              )}
                              <CurrencyInput
                                value={paymentAmount}
                                onChange={setPaymentAmount}
                                placeholder="Jumlah bayar..."
                                className="h-10 w-44 text-right text-sm font-bold rounded-xl border-primary/40 focus:border-primary focus:ring-primary/15 bg-background shadow-inner"
                              />
                            </div>
                          </div>
                          {paymentAmount > 0 && (
                            <div className="flex justify-between items-center text-sm font-semibold">
                              <span className={paymentAmount >= grandTotal ? "text-emerald-600" : "text-amber-600"}>
                                {paymentAmount >= grandTotal ? "✓ Kembalian:" : "⚠ Sisa Bayar (Hutang):"}
                              </span>
                              <span className={`font-mono text-base font-bold ${paymentAmount >= grandTotal ? "text-emerald-600" : "text-amber-600"}`}>
                                {paymentAmount >= grandTotal
                                  ? formatCurrency(paymentAmount - grandTotal)
                                  : formatCurrency(grandTotal - paymentAmount)}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>

          </div>

          {/* Footer Navigation Buttons */}
          <div className="px-4 md:px-6 py-3 md:py-4 border-t border-muted/20 bg-muted/5 flex flex-col md:flex-row justify-end items-stretch md:items-center gap-3 shrink-0">
            <div className="mr-auto flex justify-between w-full md:w-auto items-center gap-4 text-xs md:text-sm font-semibold mb-1 md:mb-0">
              <span className="text-muted-foreground">Item: <strong className="text-foreground font-bold font-mono">{items.length}</strong></span>
              <span className="text-muted-foreground">Total: <strong className="text-primary font-bold font-mono">{formatCurrency(grandTotal)}</strong></span>
            </div>
            <div className="flex gap-2 w-full md:w-auto md:min-w-[280px]">
              <Button
                type="button"
                variant="outline"
                onClick={() => setCurrentStep((prev) => Math.max(1, prev - 1))}
                disabled={currentStep === 1}
                className="flex-1 gap-1.5 h-10 rounded-xl text-xs font-semibold"
              >
                <ChevronLeft className="h-4 w-4" /> Kembali
              </Button>
              
              {currentStep < 3 ? (
                <Button
                  type="button"
                  onClick={() => {
                    if (currentStep === 1) {
                      if (customerMode === "manual" && !customerName.trim()) {
                        toast({ title: "Nama pelanggan harus diisi", variant: "destructive" });
                        return;
                      }
                    }
                    if (currentStep === 2) {
                      if (items.length === 0) {
                        toast({ title: "Tambahkan minimal 1 produk", variant: "destructive" });
                        return;
                      }
                    }
                    setCurrentStep((prev) => Math.min(3, prev + 1));
                  }}
                  className="flex-1 gap-1.5 h-10 rounded-xl text-xs font-semibold"
                >
                  Lanjut <ChevronRight className="h-4 w-4" />
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={handleSubmit}
                  disabled={createTransaction.isPending || items.length === 0}
                  className="flex-1 gap-1.5 h-10 rounded-xl bg-gradient-to-r from-primary to-primary/95 shadow-sm font-bold text-xs"
                >
                  {createTransaction.isPending ? "Menyimpan..." : "Simpan Transaksi"}
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
