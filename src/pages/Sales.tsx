import { useState, useCallback } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useCustomers } from "@/hooks/useCustomers";
import { useActiveProducts } from "@/hooks/useProducts";
import { usePaymentMethods, useCreateSalesTransaction } from "@/hooks/useSales";
import { useDrivers } from "@/hooks/useMasterData";
import { Plus, Trash2, Search, CheckCircle, Truck, User, Receipt, Users, Package, ChevronsUpDown, Check } from "lucide-react";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface SalesItem {
  product_id: string;
  product_name: string;
  product_code: string;
  qty: number;
  price: number;
  discount: number;
  subtotal: number;
}

function generateInvoice() {
  const now = new Date();
  const prefix = "INV";
  const date = now.toISOString().slice(0, 10).replace(/-/g, "");
  const rand = Math.floor(Math.random() * 10000).toString().padStart(4, "0");
  return `${prefix}-${date}-${rand}`;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(value);
}

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
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<SalesItem[]>([]);
  const [submitted, setSubmitted] = useState(false);

  // Product search for adding items
  const [customerOpen, setCustomerOpen] = useState(false);

  const [productSearch, setProductSearch] = useState("");
  const { data: searchProducts } = useActiveProducts(productSearch);
  const [productSearchOpen, setProductSearchOpen] = useState(false);

  const addItem = useCallback((product: any) => {
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
  }, [items, toast]);

  const updateItem = (index: number, field: keyof SalesItem, value: number) => {
    setItems((prev) => {
      const updated = [...prev];
      (updated[index] as any)[field] = value;
      updated[index].subtotal = updated[index].qty * updated[index].price - updated[index].discount;
      return updated;
    });
  };

  const removeItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const totalAmount = items.reduce((sum, i) => sum + i.qty * i.price, 0);
  const totalDiscount = items.reduce((sum, i) => sum + i.discount, 0);
  const grandTotal = items.reduce((sum, i) => sum + i.subtotal, 0);

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
      toast({ title: "Gagal menyimpan transaksi", description: error.message, variant: "destructive" });
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
    setNotes("");
    setItems([]);
    setSubmitted(false);
  };

  if (submitted) {
    return (
      <DashboardLayout title="Penjualan">
        <div className="flex min-h-[60vh] items-center justify-center p-4">
          <Card className="w-full max-w-sm shadow-lg">
            <CardContent className="px-8 py-10 space-y-5 text-center">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
                <CheckCircle className="h-10 w-10 text-green-600" />
              </div>
              <div className="space-y-1">
                <h2 className="text-2xl font-bold">Transaksi Berhasil!</h2>
                <p className="font-mono text-sm text-muted-foreground">{invoiceNumber}</p>
              </div>
              <div className="rounded-xl bg-muted/60 px-6 py-4">
                <p className="text-sm text-muted-foreground">Grand Total</p>
                <p className="text-3xl font-bold text-primary">{formatCurrency(grandTotal)}</p>
              </div>
              <Button onClick={resetForm} className="w-full" size="lg">
                Buat Transaksi Baru
              </Button>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Penjualan">
      <div className="grid items-start gap-6 lg:grid-cols-[360px_1fr]">

        {/* LEFT — sticky form panel */}
        <div className="space-y-4 lg:sticky lg:top-6">

          {/* Transaction Info */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                <Receipt className="h-4 w-4 text-primary" /> Transaksi
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs">No. Invoice</Label>
                <Input value={invoiceNumber} readOnly className="bg-muted font-mono text-sm h-9" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Tanggal</Label>
                  <Input type="date" value={salesDate} onChange={(e) => setSalesDate(e.target.value)} className="h-9 text-sm" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Metode Bayar <span className="text-destructive">*</span></Label>
                  <Select value={paymentMethodId} onValueChange={setPaymentMethodId}>
                    <SelectTrigger className={`h-9 text-sm ${!paymentMethodId ? "border-destructive" : ""}`}>
                      <SelectValue placeholder="Pilih" />
                    </SelectTrigger>
                    <SelectContent>
                      {paymentMethods?.map((pm) => (
                        <SelectItem key={pm.id} value={pm.id}>{pm.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Catatan</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Catatan tambahan (opsional)..."
                  rows={2}
                  className="text-sm resize-none"
                />
              </div>
            </CardContent>
          </Card>

          {/* Customer */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  <Users className="h-4 w-4 text-primary" /> Pelanggan <span className="text-destructive normal-case">*</span>
                </CardTitle>
                <div className="flex rounded-lg border p-0.5 gap-0.5">
                  <button
                    type="button"
                    onClick={() => setCustomerMode("existing")}
                    className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                      customerMode === "existing"
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Pilih
                  </button>
                  <button
                    type="button"
                    onClick={() => setCustomerMode("manual")}
                    className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                      customerMode === "manual"
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Manual
                  </button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {customerMode === "existing" ? (
                <Popover open={customerOpen} onOpenChange={setCustomerOpen}>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className={`flex h-9 w-full items-center justify-between rounded-md border px-3 text-sm transition-colors hover:bg-accent/50 ${
                        !customerId ? "border-destructive" : "border-input"
                      }`}
                    >
                      <span className={customerId ? "text-foreground" : "text-muted-foreground"}>
                        {customerId
                          ? `${customers?.find((c) => c.id === customerId)?.name} - ${customers?.find((c) => c.id === customerId)?.phone ?? ""}`
                          : "Pilih pelanggan"}
                      </span>
                      <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-40" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Cari nama / telepon..." />
                      <CommandList>
                        <CommandEmpty>Pelanggan tidak ditemukan.</CommandEmpty>
                        <CommandGroup>
                          {customers?.map((c) => (
                            <CommandItem
                              key={c.id}
                              value={`${c.name} ${c.phone ?? ""}`}
                              onSelect={() => { setCustomerId(c.id); setCustomerOpen(false); }}
                            >
                              <Check className={`mr-2 h-4 w-4 shrink-0 ${
                                customerId === c.id ? "opacity-100" : "opacity-0"
                              }`} />
                              <div>
                                <p className="text-sm font-medium">{c.name}</p>
                                {c.phone && <p className="text-xs text-muted-foreground">{c.phone}</p>}
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              ) : (
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Nama <span className="text-destructive">*</span></Label>
                    <Input
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Nama pelanggan"
                      className={`h-9 text-sm ${customerMode === "manual" && !customerName.trim() ? "border-destructive" : ""}`}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Telepon</Label>
                    <Input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} placeholder="08xxxxxxxxxx" className="h-9 text-sm" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Alamat</Label>
                    <Input value={customerAddress} onChange={(e) => setCustomerAddress(e.target.value)} placeholder="Alamat pengiriman" className="h-9 text-sm" />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Delivery */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                <Truck className="h-4 w-4 text-primary" /> Pengiriman
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => { setDeliveryType("self_delivery"); setDriverId(""); }}
                  className={`flex flex-col items-center gap-1.5 rounded-xl border-2 px-3 py-3 transition-colors ${
                    deliveryType === "self_delivery"
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-border hover:border-muted-foreground/40"
                  }`}
                >
                  <User className="h-5 w-5" />
                  <span className="text-xs font-semibold">Ambil Sendiri</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDeliveryType("driver")}
                  className={`flex flex-col items-center gap-1.5 rounded-xl border-2 px-3 py-3 transition-colors ${
                    deliveryType === "driver"
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-border hover:border-muted-foreground/40"
                  }`}
                >
                  <Truck className="h-5 w-5" />
                  <span className="text-xs font-semibold">Kirim Supir</span>
                </button>
              </div>

              {deliveryType === "driver" && (
                <div className="space-y-1.5">
                  <Label className="text-xs">Pilih Supir <span className="text-destructive">*</span></Label>
                  {!drivers || drivers.length === 0 ? (
                    <p className="text-xs text-muted-foreground">Belum ada supir. Tambahkan di Master Data.</p>
                  ) : (
                    <div className="space-y-1.5">
                      {drivers.map((driver) => (
                        <button
                          key={driver.id}
                          type="button"
                          onClick={() => setDriverId(driver.id)}
                          className={`flex w-full items-center gap-3 rounded-xl border-2 px-3 py-2.5 text-left transition-colors ${
                            driverId === driver.id
                              ? "border-primary bg-primary/5"
                              : "border-border hover:border-muted-foreground/40"
                          }`}
                        >
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100">
                            <Truck className="h-3.5 w-3.5 text-emerald-600" />
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">{driver.driver_name}</p>
                            {driver.phone_number && (
                              <p className="truncate text-xs text-muted-foreground">{driver.phone_number}</p>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

        </div>

        {/* RIGHT — product table */}
        <Card className="min-h-[500px]">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <Package className="h-4 w-4 text-primary" /> Daftar Produk
                <span className="text-destructive">*</span>
              </CardTitle>
              <Popover open={productSearchOpen} onOpenChange={setProductSearchOpen}>
                <PopoverTrigger asChild>
                  <Button size="sm">
                    <Plus className="mr-1 h-4 w-4" /> Tambah Produk
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-2" align="end">
                  <div className="relative mb-2">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Cari produk..."
                      value={productSearch}
                      onChange={(e) => setProductSearch(e.target.value)}
                      className="pl-8"
                      autoFocus
                    />
                  </div>
                  <div className="max-h-60 overflow-auto">
                    {searchProducts?.length === 0 ? (
                      <p className="py-4 text-center text-sm text-muted-foreground">Produk tidak ditemukan</p>
                    ) : (
                      searchProducts?.map((p) => (
                        <button
                          key={p.id}
                          onClick={() => addItem(p)}
                          className="flex w-full items-center justify-between rounded-md px-3 py-2 text-sm hover:bg-accent"
                        >
                          <div className="text-left">
                            <div className="font-medium">{p.name}</div>
                            <div className="text-xs text-muted-foreground">{p.product_code}</div>
                          </div>
                          <span className="text-muted-foreground">{formatCurrency(p.selling_price)}</span>
                        </button>
                      ))
                    )}
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="text-xs">
                  <TableHead>Produk</TableHead>
                  <TableHead className="w-36">Harga</TableHead>
                  <TableHead className="w-24">Qty</TableHead>
                  <TableHead className="w-36">Diskon</TableHead>
                  <TableHead className="w-36 text-right">Subtotal</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-16 text-center">
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <Package className="h-10 w-10 opacity-20" />
                        <p className="text-sm">Belum ada produk.</p>
                        <p className="text-xs">Klik "Tambah Produk" untuk memulai.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  items.map((item, index) => (
                    <TableRow key={item.product_id}>
                      <TableCell>
                        <div className="font-medium text-sm">{item.product_name}</div>
                        <div className="text-xs text-muted-foreground">{item.product_code}</div>
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={item.price}
                          onChange={(e) => updateItem(index, "price", Number(e.target.value))}
                          className="h-9 text-sm"
                          min={0}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={item.qty}
                          onChange={(e) => updateItem(index, "qty", Number(e.target.value))}
                          className="h-9 text-sm"
                          min={1}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={item.discount}
                          onChange={(e) => updateItem(index, "discount", Number(e.target.value))}
                          className="h-9 text-sm"
                          min={0}
                        />
                      </TableCell>
                      <TableCell className="text-right font-medium text-sm">
                        {formatCurrency(item.subtotal)}
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeItem(index)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>

            {/* Totals + Submit */}
            <div className="mt-4 border-t pt-4">
              <div className="flex flex-col gap-6">
                {items.length > 0 ? (
                  <div className="space-y-1">
                    <div className="flex justify-between gap-12 text-xs text-muted-foreground">
                      <span>Total Harga</span>
                      <span>{formatCurrency(totalAmount)}</span>
                    </div>
                    <div className="flex justify-between gap-12 text-xs text-muted-foreground">
                      <span className="text-destructive">Total Diskon</span>
                      <span className="text-destructive">− {formatCurrency(totalDiscount)}</span>
                    </div>
                    <div className="flex justify-between gap-12 pt-1 text-xl font-bold text-foreground">
                      <span>Grand Total</span>
                      <span className="text-primary">{formatCurrency(grandTotal)}</span>
                    </div>
                  </div>
                ) : <div />}
                <Button
                  onClick={handleSubmit}
                  disabled={createTransaction.isPending || items.length === 0}
                  size="lg"
                  className="shrink-0 px-10 h-12 text-base font-semibold shadow-md"
                >
                  {createTransaction.isPending ? "Menyimpan..." : "Simpan Transaksi"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

      </div>
    </DashboardLayout>
  );
}
