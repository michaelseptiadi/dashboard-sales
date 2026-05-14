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
import { Plus, Trash2, Search, CheckCircle } from "lucide-react";
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
  const createTransaction = useCreateSalesTransaction();

  const [invoiceNumber, setInvoiceNumber] = useState(generateInvoice);
  const [salesDate, setSalesDate] = useState(new Date().toISOString().split("T")[0]);
  const [customerMode, setCustomerMode] = useState<"existing" | "manual">("existing");
  const [customerId, setCustomerId] = useState<string>("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [paymentMethodId, setPaymentMethodId] = useState("");
  const [shippingMethod, setShippingMethod] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<SalesItem[]>([]);
  const [submitted, setSubmitted] = useState(false);

  // Product search for adding items
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
        p_shipping_method: shippingMethod || undefined,
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
    setShippingMethod("");
    setNotes("");
    setItems([]);
    setSubmitted(false);
  };

  if (submitted) {
    return (
      <DashboardLayout title="Penjualan">
        <Card className="mx-auto max-w-md text-center">
          <CardContent className="pt-8 pb-8 space-y-4">
            <CheckCircle className="mx-auto h-16 w-16 text-success" />
            <h2 className="text-xl font-semibold">Transaksi Berhasil!</h2>
            <p className="text-muted-foreground">Invoice: {invoiceNumber}</p>
            <p className="text-lg font-bold">{formatCurrency(grandTotal)}</p>
            <Button onClick={resetForm} className="mt-4">
              Buat Transaksi Baru
            </Button>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Penjualan">
      <div className="space-y-6">
        {/* Invoice Header */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Informasi Transaksi</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-2">
                <Label>No. Invoice</Label>
                <Input value={invoiceNumber} readOnly className="bg-muted font-mono" />
              </div>
              <div className="space-y-2">
                <Label>Tanggal</Label>
                <Input type="date" value={salesDate} onChange={(e) => setSalesDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Metode Bayar <span className="text-destructive">*</span></Label>
                <Select value={paymentMethodId} onValueChange={setPaymentMethodId}>
                  <SelectTrigger className={!paymentMethodId ? "border-destructive" : ""}><SelectValue placeholder="Pilih metode" /></SelectTrigger>
                  <SelectContent>
                    {paymentMethods?.map((pm) => (
                      <SelectItem key={pm.id} value={pm.id}>{pm.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Metode Kirim (Opsional)</Label>
                <Input value={shippingMethod} onChange={(e) => setShippingMethod(e.target.value)} placeholder="Mis: Antar, Ambil Sendiri" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Customer */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Pelanggan <span className="text-destructive">*</span></CardTitle>
              <div className="flex gap-2">
                <Button
                  variant={customerMode === "existing" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCustomerMode("existing")}
                >
                  Pilih Pelanggan
                </Button>
                <Button
                  variant={customerMode === "manual" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCustomerMode("manual")}
                >
                  Input Manual
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {customerMode === "existing" ? (
              <Select value={customerId} onValueChange={setCustomerId}>
                <SelectTrigger className={!customerId ? "border-destructive" : ""}><SelectValue placeholder="Pilih pelanggan" /></SelectTrigger>
                <SelectContent>
                  {customers?.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name} {c.phone ? `- ${c.phone}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label>Nama <span className="text-destructive">*</span></Label>
                  <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Nama pelanggan" className={customerMode === "manual" && !customerName.trim() ? "border-destructive" : ""} />
                </div>
                <div className="space-y-2">
                  <Label>Telepon</Label>
                  <Input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} placeholder="08xxxxxxxxxx" />
                </div>
                <div className="space-y-2">
                  <Label>Alamat</Label>
                  <Input value={customerAddress} onChange={(e) => setCustomerAddress(e.target.value)} placeholder="Alamat" />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Items */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Daftar Produk <span className="text-destructive">*</span></CardTitle>
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
                <TableRow>
                  <TableHead>Produk</TableHead>
                  <TableHead className="w-40">Harga</TableHead>
                  <TableHead className="w-28">Qty</TableHead>
                  <TableHead className="w-40">Diskon</TableHead>
                  <TableHead className="w-36 text-right">Subtotal</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                      Belum ada produk. Klik "Tambah Produk" untuk memulai.
                    </TableCell>
                  </TableRow>
                ) : (
                  items.map((item, index) => (
                    <TableRow key={item.product_id}>
                      <TableCell>
                        <div className="font-medium">{item.product_name}</div>
                        <div className="text-xs text-muted-foreground">{item.product_code}</div>
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={item.price}
                          onChange={(e) => updateItem(index, "price", Number(e.target.value))}
                          className="h-10 text-base"
                          min={0}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={item.qty}
                          onChange={(e) => updateItem(index, "qty", Number(e.target.value))}
                          className="h-10 text-base"
                          min={1}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={item.discount}
                          onChange={(e) => updateItem(index, "discount", Number(e.target.value))}
                          className="h-10 text-base"
                          min={0}
                        />
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(item.subtotal)}
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => removeItem(index)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>

            {items.length > 0 && (
              <div className="mt-4 flex justify-end">
                <div className="w-64 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total</span>
                    <span>{formatCurrency(totalAmount)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Diskon</span>
                    <span className="text-destructive">-{formatCurrency(totalDiscount)}</span>
                  </div>
                  <div className="flex justify-between border-t pt-2 text-lg font-bold">
                    <span>Grand Total</span>
                    <span>{formatCurrency(grandTotal)}</span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Notes & Submit */}
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Catatan (Opsional)</Label>
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Catatan tambahan..." rows={2} />
              </div>
              <Button
                onClick={handleSubmit}
                disabled={createTransaction.isPending || items.length === 0}
                className="w-full"
                size="lg"
              >
                {createTransaction.isPending ? "Menyimpan..." : "Simpan Transaksi"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
