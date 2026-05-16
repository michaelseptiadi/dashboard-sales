import { useState, useCallback } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useToast } from "@/hooks/use-toast";
import { useCustomers } from "@/hooks/useCustomers";
import { useActiveProducts } from "@/hooks/useProducts";
import { usePaymentMethods, useCreateSalesTransaction } from "@/hooks/useSales";
import { useDrivers } from "@/hooks/useMasterData";
import { generateInvoice } from "@/lib/format";
import { TransactionInfoCard } from "@/features/sales/components/TransactionInfoCard";
import { CustomerSelector } from "@/features/sales/components/CustomerSelector";
import { DeliverySelector } from "@/features/sales/components/DeliverySelector";
import { ItemsTable } from "@/features/sales/components/ItemsTable";
import { SuccessScreen } from "@/features/sales/components/SuccessScreen";
import type { SalesItem } from "@/features/sales/types";
import type { Product } from "@/hooks/useProducts";

export default function Sales() {
  const { toast } = useToast();
  const { data: customers } = useCustomers();
  const { data: paymentMethods } = usePaymentMethods();
  const { data: drivers } = useDrivers();
  const createTransaction = useCreateSalesTransaction();

  const [invoiceNumber, setInvoiceNumber] = useState(generateInvoice);
  const [salesDate, setSalesDate] = useState(new Date().toISOString().split("T")[0]);
  const [customerMode, setCustomerMode] = useState<"existing" | "manual">("existing");
  const [customerId, setCustomerId] = useState<string>("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [paymentMethodId, setPaymentMethodId] = useState("");
  const [deliveryType, setDeliveryType] = useState<"driver" | "self_delivery" | "">("self_delivery");
  const [driverId, setDriverId] = useState("");
  const [deliveryFee, setDeliveryFee] = useState(0);
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<SalesItem[]>([]);
  const [submitted, setSubmitted] = useState(false);

  const [productSearch, setProductSearch] = useState("");
  const { data: searchProducts } = useActiveProducts(productSearch);
  const [productSearchOpen, setProductSearchOpen] = useState(false);

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
    [items, toast],
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
      await createTransaction.mutateAsync({
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

  const resetForm = () => {
    setInvoiceNumber(generateInvoice());
    setSalesDate(new Date().toISOString().split("T")[0]);
    setCustomerMode("existing");
    setCustomerId("");
    setCustomerName("");
    setCustomerPhone("");
    setCustomerAddress("");
    setPaymentMethodId("");
    setDeliveryType("self_delivery");
    setDriverId("");
    setDeliveryFee(0);
    setNotes("");
    setItems([]);
    setSubmitted(false);
  };

  if (submitted) {
    return (
      <DashboardLayout title="Penjualan">
        <SuccessScreen invoiceNumber={invoiceNumber} grandTotal={grandTotal} onReset={resetForm} />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Penjualan">
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
            setCustomerMode={setCustomerMode}
            customerId={customerId}
            setCustomerId={setCustomerId}
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
          updateItem={updateItem}
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
          onSubmit={handleSubmit}
          isPending={createTransaction.isPending}
        />
      </div>
    </DashboardLayout>
  );
}

