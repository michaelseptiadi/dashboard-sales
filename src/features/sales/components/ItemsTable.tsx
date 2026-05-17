import { Plus, Trash2, Search, Package, Truck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { formatCurrency } from "@/lib/format";
import type { SalesItem } from "@/features/sales/types";
import type { Product } from "@/hooks/useProducts";

interface ItemsTableProps {
  items: SalesItem[];
  addItem: (product: Product) => void;
  updateItem: (index: number, field: keyof SalesItem, value: number) => void;
  removeItem: (index: number) => void;
  productSearch: string;
  setProductSearch: (v: string) => void;
  searchProducts?: Product[];
  productSearchOpen: boolean;
  setProductSearchOpen: (v: boolean) => void;
  totalAmount: number;
  totalDiscount: number;
  deliveryFee: number;
  setDeliveryFee: (v: number) => void;
  grandTotal: number;
  paymentAmount: number;
  setPaymentAmount: (v: number) => void;
  onSubmit: () => void;
  isPending: boolean;
}

export function ItemsTable({
  items,
  addItem,
  updateItem,
  removeItem,
  productSearch,
  setProductSearch,
  searchProducts,
  productSearchOpen,
  setProductSearchOpen,
  totalAmount,
  totalDiscount,
  deliveryFee,
  setDeliveryFee,
  grandTotal,
  paymentAmount,
  setPaymentAmount,
  onSubmit,
  isPending,
}: ItemsTableProps) {
  const kembalian = paymentAmount > grandTotal ? paymentAmount - grandTotal : 0;
  return (
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
                  <p className="py-4 text-center text-sm text-muted-foreground">
                    Produk tidak ditemukan
                  </p>
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
                      <span className="text-muted-foreground">
                        {formatCurrency(p.selling_price)}
                      </span>
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
                    <CurrencyInput
                      value={item.price}
                      onChange={(v) => updateItem(index, "price", v)}
                      className="h-9 text-sm"
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
                    <CurrencyInput
                      value={item.discount}
                      onChange={(v) => updateItem(index, "discount", v)}
                      className="h-9 text-sm"
                    />
                  </TableCell>
                  <TableCell className="text-right font-medium text-sm">
                    {formatCurrency(item.subtotal)}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => removeItem(index)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        <div className="mt-4 border-t pt-4">
          <div className="flex flex-col gap-6">
            {items.length > 0 && (
              <div className="space-y-1">
                <div className="flex justify-between gap-12 text-xs text-muted-foreground">
                  <span>Total Harga</span>
                  <span>{formatCurrency(totalAmount)}</span>
                </div>
                <div className="flex justify-between gap-12 text-xs text-muted-foreground">
                  <span className="text-destructive">Total Diskon</span>
                  <span className="text-destructive">− {formatCurrency(totalDiscount)}</span>
                </div>
                <div className="flex items-center justify-between gap-12 text-xs text-muted-foreground">
                  <Label className="flex items-center gap-1 text-xs font-normal text-muted-foreground cursor-pointer">
                    <Truck className="h-3.5 w-3.5" /> Biaya Kirim
                  </Label>
                  <CurrencyInput
                    value={deliveryFee}
                    onChange={setDeliveryFee}
                    className="h-7 w-32 text-right text-xs"
                  />
                </div>
                <div className="flex justify-between gap-12 pt-1 text-xl font-bold text-foreground">
                  <span>Grand Total</span>
                  <span className="text-primary">{formatCurrency(grandTotal)}</span>
                </div>
                <div className="mt-3 border-t pt-3 space-y-1.5">
                  <div className="flex items-center justify-between gap-12">
                    <span className="text-sm font-medium">Dibayar</span>
                    <CurrencyInput
                      value={paymentAmount}
                      onChange={setPaymentAmount}
                      placeholder="Jumlah bayar..."
                      className="h-8 w-40 text-right text-sm font-semibold"
                    />
                  </div>
                  {paymentAmount > 0 && (
                    <div className="flex justify-between gap-12 text-sm">
                      <span className={kembalian > 0 ? "text-emerald-600 font-medium" : "text-amber-600 font-medium"}>
                        {kembalian > 0 ? "Kembalian" : "Sisa Bayar"}
                      </span>
                      <span className={kembalian > 0 ? "text-emerald-600 font-semibold" : "text-amber-600 font-semibold"}>
                        {kembalian > 0
                          ? formatCurrency(kembalian)
                          : formatCurrency(grandTotal - paymentAmount)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
            <Button
              onClick={onSubmit}
              disabled={isPending || items.length === 0}
              size="lg"
              className="shrink-0 px-10 h-12 text-base font-semibold shadow-md"
            >
              {isPending ? "Menyimpan..." : "Simpan Transaksi"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
