import { useState, useCallback, useEffect, useRef } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useToast } from "@/hooks/use-toast";
import { useCustomers } from "@/hooks/useCustomers";
import { useActiveProducts } from "@/hooks/useProducts";
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
} from "lucide-react";
import { formatCurrency } from "@/lib/format";

const getLocalDatetimeString = (date: Date = new Date()) => {
  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - offset * 60 * 1000);
  return localDate.toISOString().slice(0, 16);
};

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
  const [deliveryType, setDeliveryType] = useState<"driver" | "self_delivery" | "">(
    () => activeCart?.deliveryType ?? "driver"
  );
  const [driverId, setDriverId] = useState(() => activeCart?.driverId ?? "");
  const [deliveryFee, setDeliveryFee] = useState(() => activeCart?.deliveryFee ?? 0);
  const [notes, setNotes] = useState(() => activeCart?.notes ?? "");
  const [items, setItems] = useState<SalesItem[]>(() => activeCart?.items ?? []);
  const [paymentAmount, setPaymentAmount] = useState(() => activeCart?.paymentAmount ?? 0);
  const [submitted, setSubmitted] = useState(false);
  const submittedDataRef = useRef<{ invoice: string; total: number } | null>(null);

  const [productSearch, setProductSearch] = useState("");
  const { data: searchProducts } = useActiveProducts(productSearch);
  const [productSearchOpen, setProductSearchOpen] = useState(false);

  // Modal and Step states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);

  // prevent auto-save from firing when we're loading a different cart
  const loadingCartRef = useRef(false);

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

  // switch to an existing pending cart
  const handleSwitchCart = useCallback(
    (id: string) => {
      if (id === activeCartId) return;
      const target = carts.find((c) => c.id === id);
      if (!target) return;
      switchCart(id);
      loadCart(target);
    },
    [activeCartId, carts, switchCart, loadCart]
  );

  // create a new pending cart
  const handleNewCart = useCallback(() => {
    const cart = newCart();
    loadCart(cart);
  }, [newCart, loadCart]);

  // remove a cart (and switch to another)
  const handleRemoveCart = useCallback(
    (id: string) => {
      const remaining = carts.filter((c) => c.id !== id);
      removeCart(id);
      if (id === activeCartId) {
        if (remaining.length > 0) {
          loadCart(remaining[0]);
        } else {
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
        }
      }
    },
    [activeCartId, carts, removeCart, loadCart]
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
      setItems((prev) => [
        ...prev,
        {
          product_id: product.id,
          product_name: product.name,
          product_code: product.product_code,
          qty: 1,
          price: product.selling_price,
          discount: 0,
          subtotal: product.selling_price,
        },
      ]);
      setProductSearch("");
      setProductSearchOpen(false);
    },
    [items, toast]
  );

  const updateItem = (index: number, field: keyof SalesItem, value: number) => {
    setItems((prev) => {
      const updated = [...prev];
      (updated[index] as any)[field] = value;
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

    try {
      const salesOrder = await createTransaction.mutateAsync({
        p_invoice_number: invoiceNumber,
        p_sales_date: salesDate,
        p_due_date: dueDate || undefined,
        p_customer_id: customerMode === "existing" && customerId ? customerId : undefined,
        p_customer_name: customerMode === "manual" ? customerName : (customerId ? undefined : "Umum (Walk-in)"),
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

      if (paymentAmount > 0 && salesOrder?.id) {
        await addPaymentLog({
          orderId: salesOrder.id,
          amount: Math.min(paymentAmount, grandTotal),
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
      submittedDataRef.current = { invoice: invoiceNumber, total: grandTotal };

      // Remove the submitted cart and reset the form
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
        requestAnimationFrame(() => {
          loadingCartRef.current = false;
        });
      }

      setSubmitted(true);
      setIsModalOpen(false);
      toast({ title: "Transaksi berhasil disimpan!" });
    } catch (error: any) {
      toast({
        title: "Gagal menyimpan transaksi",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const resetForm = useCallback(() => {
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
    deliveryType,
    driverId,
    deliveryFee,
    notes,
    items,
    paymentAmount,
    saveCart,
  ]);

  if (submitted) {
    const pMethod = paymentMethods?.find((p) => p.id === paymentMethodId);
    const driver = drivers?.find((d) => d.id === driverId);

    const custName = customerMode === "manual" ? customerName : (customers?.find(c => c.id === customerId)?.name || customerName);
    const custPhone = customerMode === "manual" ? customerPhone : (customers?.find(c => c.id === customerId)?.phone || undefined);
    const custAddress = customerMode === "manual" ? customerAddress : (customers?.find(c => c.id === customerId)?.address || undefined);

    return (
      <DashboardLayout title="Penjualan">
        <TransactionReceipt
          invoiceNumber={submittedDataRef.current?.invoice ?? invoiceNumber}
          salesDate={salesDate}
          customerMode={customerMode}
          customerName={custName || "Umum (Walk-in)"}
          customerPhone={custPhone}
          customerAddress={custAddress}
          paymentMethodName={pMethod?.name || "Cash"}
          deliveryType={deliveryType}
          driverName={driver?.driver_name}
          notes={notes}
          items={items}
          totalAmount={totalAmount}
          totalDiscount={totalDiscount}
          deliveryFee={deliveryFee}
          grandTotal={submittedDataRef.current?.total ?? grandTotal}
          paymentAmount={paymentAmount}
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
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Point of Sale (POS)</h1>
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
              {carts.map((cart) => {
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
          className="max-w-[1380px] w-[96vw] h-[90vh] md:h-[85vh] flex flex-col p-0 gap-0 overflow-hidden rounded-3xl border bg-card"
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-muted/20 bg-muted/5 flex items-center justify-between">
            <div>
              <DialogTitle className="text-lg font-bold flex items-center gap-2">
                <Receipt className="h-5 w-5 text-primary" />
                <span>Proses Transaksi POS</span>
              </DialogTitle>
              <p className="text-xs text-muted-foreground font-mono mt-0.5">Invoice: {invoiceNumber}</p>
            </div>
          </div>

          {/* Grid Container */}
          <div className="flex-1 min-h-0 overflow-hidden grid grid-cols-1 md:grid-cols-[240px_1fr_320px] gap-6 p-6">
            
            {/* Left Sidebar Steps Tracker */}
            <div className="flex flex-col gap-6 border-r pr-6 justify-between h-full">
              <div className="space-y-6">
                <div className="flex gap-3 items-start">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shrink-0 transition-colors ${currentStep === 1 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>1</div>
                  <div className="min-w-0">
                    <h4 className="font-semibold text-sm">Pelanggan</h4>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">{customerName || "Umum (Walk-in)"}</p>
                  </div>
                </div>
                <div className="flex gap-3 items-start">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shrink-0 transition-colors ${currentStep === 2 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>2</div>
                  <div className="min-w-0">
                    <h4 className="font-semibold text-sm">Daftar Item</h4>
                    <p className="text-xs text-muted-foreground mt-0.5">{items.length} produk</p>
                  </div>
                </div>
                <div className="flex gap-3 items-start">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shrink-0 transition-colors ${currentStep === 3 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>3</div>
                  <div className="min-w-0">
                    <h4 className="font-semibold text-sm">Pembayaran</h4>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">
                      {paymentMethodId ? (paymentMethods?.find(p => p.id === paymentMethodId)?.name || "Dipilih") : "Pilih metode"}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Center Content Form (Scrollable) */}
            <div className="min-h-0 overflow-y-auto pr-2 space-y-6">
              {currentStep === 1 && (
                <div className="space-y-6">
                  <TransactionInfoCard
                    invoiceNumber={invoiceNumber}
                    salesDate={salesDate}
                    setSalesDate={setSalesDate}
                    paymentMethodId={paymentMethodId}
                    setPaymentMethodId={setPaymentMethodId}
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
                    updateItem={updateItem}
                    toggleItemSelfPickup={toggleItemSelfPickup}
                    removeItem={removeItem}
                    productSearch={productSearch}
                    setProductSearch={setProductSearch}
                    searchProducts={searchProducts}
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
                          <div className="flex items-center justify-between gap-4">
                            <span className="text-sm font-bold text-foreground">Jumlah Dibayar:</span>
                            <div className="flex items-center gap-2">
                              {paymentAmount !== grandTotal && (
                                <button
                                  type="button"
                                  onClick={() => setPaymentAmount(grandTotal)}
                                  className="text-xs font-semibold text-primary hover:bg-primary/5 px-2 py-1 rounded-lg transition-colors"
                                >
                                  Bayar Pas
                                </button>
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

            {/* Right Sidebar Live Summary */}
            <div className="border-l pl-6 flex flex-col justify-between h-full min-h-0">
              <div className="space-y-6 overflow-y-auto pr-1 flex-1">
                <div>
                  <h3 className="font-bold text-sm text-foreground mb-3 flex items-center gap-1.5 uppercase tracking-wider">
                    <ShoppingCart className="h-4 w-4 text-primary" /> Ringkasan Transaksi
                  </h3>
                  <div className="space-y-3 text-xs bg-muted/30 p-3.5 rounded-2xl border border-muted/20">
                    <div>
                      <span className="text-muted-foreground block">Pelanggan:</span>
                      <span className="font-bold text-foreground">{customerName || "Umum (Walk-in)"}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block">Tanggal:</span>
                      <span className="font-semibold text-foreground">
                        {new Date(salesDate).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-bold text-xs text-muted-foreground uppercase tracking-wider mb-2">Item Belanja ({items.length})</h4>
                  <div className="max-h-[160px] overflow-y-auto space-y-2 pr-1 font-sans text-xs">
                    {items.length === 0 ? (
                      <p className="text-muted-foreground italic text-xs">Belum ada item</p>
                    ) : (
                      items.map((item) => (
                        <div key={item.product_id} className="flex justify-between items-start py-1 border-b border-dashed border-muted/40">
                          <div className="min-w-0 pr-2 flex flex-col gap-0.5">
                            <p className="font-semibold text-foreground truncate leading-normal">{item.product_name}</p>
                            <p className="text-[10px] text-muted-foreground font-mono">{item.qty}x {formatCurrency(item.price)}</p>
                          </div>
                          <span className="font-bold font-mono text-foreground shrink-0">{formatCurrency(item.subtotal)}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="space-y-2 border-t border-muted/20 pt-4">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Total Harga:</span>
                    <span className="font-semibold font-mono text-foreground">{formatCurrency(totalAmount)}</span>
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Total Diskon:</span>
                    <span className="font-semibold font-mono text-destructive">− {formatCurrency(totalDiscount)}</span>
                  </div>
                  {deliveryFee > 0 && (
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Biaya Kirim:</span>
                      <span className="font-semibold font-mono text-foreground">+ {formatCurrency(deliveryFee)}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center text-sm font-bold text-primary bg-primary/5 px-3 py-2.5 rounded-xl border border-primary/10">
                    <span>Grand Total:</span>
                    <span className="font-mono text-base">{formatCurrency(grandTotal)}</span>
                  </div>
                  {paymentAmount > 0 && (
                    <div className="flex justify-between text-xs pt-1 border-t border-dashed">
                      <span className="text-muted-foreground">Jumlah Dibayar:</span>
                      <span className="font-bold font-mono text-foreground">{formatCurrency(paymentAmount)}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Footer Navigation Buttons */}
              <div className="border-t border-muted/20 pt-4 mt-4 flex flex-col gap-2 shrink-0">
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setCurrentStep((prev) => Math.max(1, prev - 1))}
                    disabled={currentStep === 1}
                    className="flex-1 gap-1.5 h-11 rounded-xl"
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
                      className="flex-1 gap-1.5 h-11 rounded-xl"
                    >
                      Lanjut <ChevronRight className="h-4 w-4" />
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      onClick={handleSubmit}
                      disabled={createTransaction.isPending || items.length === 0}
                      className="flex-1 gap-1.5 h-11 rounded-xl bg-gradient-to-r from-primary to-primary/95 shadow-sm font-bold"
                    >
                      {createTransaction.isPending ? "Menyimpan..." : "Simpan"}
                    </Button>
                  )}
                </div>
              </div>
            </div>

          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
