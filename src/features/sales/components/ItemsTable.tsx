import { useState } from "react";
import { Plus, Trash2, Search, Package, Truck, User, ChevronDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/format";
import type { SalesItem } from "@/features/sales/types";
import { useCategories } from "@/hooks/useProducts";
import type { Product } from "@/hooks/useProducts";

interface ItemsTableProps {
  items: SalesItem[];
  addItem: (product: Product) => void;
  decrementItem?: (productId: string) => void;
  updateItem: (index: number, field: keyof SalesItem, value: number) => void;
  toggleItemSelfPickup: (index: number) => void;
  removeItem: (index: number) => void;
  productSearch: string;
  setProductSearch: (v: string) => void;
  searchProducts?: Product[];
  productSearchOpen: boolean;
  setProductSearchOpen: (v: boolean) => void;
  selectedCategory: string;
  setSelectedCategory: (v: string) => void;
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
  decrementItem,
  updateItem,
  toggleItemSelfPickup,
  removeItem,
  productSearch,
  setProductSearch,
  searchProducts,
  productSearchOpen,
  setProductSearchOpen,
  selectedCategory,
  setSelectedCategory,
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
  const { data: categories } = useCategories();
  const kembalian = paymentAmount > grandTotal ? paymentAmount - grandTotal : 0;

  const filteredProducts = searchProducts ?? [];

  return (
    <Card className="min-h-[500px]">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Package className="h-4 w-4 text-primary" /> Daftar Produk
            <span className="text-destructive">*</span>
          </CardTitle>
          <Button size="sm" onClick={() => setProductSearchOpen(true)}>
            <Plus className="mr-1 h-4 w-4" /> Tambah Produk
          </Button>

          <Dialog open={productSearchOpen} onOpenChange={setProductSearchOpen}>
            <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col p-6">
              <DialogHeader>
                <DialogTitle className="text-lg font-semibold flex items-center gap-2">
                  <Package className="h-5 w-5 text-primary" /> Pilih Produk
                </DialogTitle>
              </DialogHeader>

              <div className="relative my-3">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Cari nama atau kode produk..."
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  className="pl-9 h-9"
                  autoFocus
                />
              </div>

              {/* Category tabs */}
              <div className="mb-4">
                <Tabs value={selectedCategory} onValueChange={setSelectedCategory} className="w-full">
                  <TabsList className="w-full justify-start overflow-x-auto h-9 bg-muted/50 p-0.5">
                    <TabsTrigger value="all" className="text-xs px-3 py-1">Semua</TabsTrigger>
                    {categories?.map((c) => (
                      <TabsTrigger key={c.id} value={c.id} className="text-xs px-3 py-1">
                        {c.name}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </Tabs>
              </div>

              <div className="flex-1 max-h-[55vh] pr-1 overflow-scroll">
                <div className="space-y-2">
                  {filteredProducts.length === 0 ? (
                    <p className="py-8 text-center text-sm text-muted-foreground">
                      Produk tidak ditemukan
                    </p>
                  ) : (
                    filteredProducts.map((p) => {
                      const stock = p.current_stock ?? 0;
                      const isLow = stock <= p.minimum_stock;
                      const cartItem = items.find((item) => item.product_id === p.store_product_id);
                      const qtyInCart = cartItem?.qty ?? 0;
                      const isOutOfStock = stock <= 0;

                      return (
                        <div
                          key={p.id}
                          className="flex items-center justify-between rounded-xl border border-border/80 px-4 py-3 hover:bg-muted/10 transition-colors"
                        >
                          <div className="space-y-1 pr-4">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="font-semibold text-sm">{p.name}</span>
                              <Badge variant="outline" className="text-[10px] py-0 px-1.5 font-normal text-muted-foreground bg-muted/20">
                                {p.categories?.name || p.category?.name || "Kategori"}
                              </Badge>
                              <Badge variant="outline" className="text-[10px] py-0 px-1.5 font-normal text-muted-foreground bg-muted/20">
                                {p.units?.name || p.unit?.name || "Satuan"}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                              <span className="font-mono">{p.product_code}</span>
                              <span>•</span>
                              <span>Harga: <span className="font-medium text-foreground">{formatCurrency(p.selling_price)}</span></span>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 shrink-0">
                            {/* Stock status badge */}
                            {stock <= 0 ? (
                              <Badge variant="destructive" className="bg-red-50 text-red-700 border-red-200 hover:bg-red-50 text-[10px] font-medium rounded-full px-2 py-0.5">Habis</Badge>
                            ) : isLow ? (
                              <Badge className="bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-50 text-[10px] font-medium rounded-full px-2 py-0.5">Menipis ({stock})</Badge>
                            ) : (
                              <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-50 text-[10px] font-medium rounded-full px-2 py-0.5">Stok: {stock}</Badge>
                            )}

                            {/* Qty controller */}
                            {qtyInCart === 0 ? (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => addItem(p)}
                                disabled={isOutOfStock}
                                className="h-8 w-20 px-0 gap-1"
                              >
                                <Plus className="h-3.5 w-3.5" /> Tambah
                              </Button>
                            ) : (
                              <div className="flex items-center gap-1.5 bg-muted/60 rounded-lg p-0.5 border border-border">
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => decrementItem?.(p.store_product_id)}
                                  className="h-7 w-7 rounded-md p-0"
                                >
                                  <span className="text-base font-semibold leading-none">-</span>
                                </Button>
                                <span className="w-6 text-center text-xs font-bold font-mono">
                                  {qtyInCart}
                                </span>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => addItem(p)}
                                  disabled={qtyInCart >= stock}
                                  className="h-7 w-7 rounded-md p-0"
                                >
                                  <Plus className="h-3 w-3" />
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="mt-4 border-t pt-4 flex justify-between items-center">
                <span className="text-xs text-muted-foreground">
                  {items.length} produk di keranjang ({items.reduce((acc, curr) => acc + curr.qty, 0)} item)
                </span>
                <Button size="sm" onClick={() => setProductSearchOpen(false)}>
                  Selesai
                </Button>
              </div>
            </DialogContent>
          </Dialog>
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
              <TableHead className="w-40">Pengiriman</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-16 text-center">
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
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button type="button" className="flex items-center gap-1 focus:outline-none">
                          {item.self_pickup ? (
                            <Badge variant="outline" className="gap-1 border-blue-200 bg-blue-50 text-blue-700 font-normal cursor-pointer hover:bg-blue-100">
                              <User className="h-3 w-3" /> Ambil Sendiri
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="gap-1 border-emerald-200 bg-emerald-50 text-emerald-700 font-normal cursor-pointer hover:bg-emerald-100">
                              <Truck className="h-3 w-3" /> Dikirim
                            </Badge>
                          )}
                          <ChevronDown className="h-3 w-3 text-muted-foreground" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start">
                        <DropdownMenuItem
                          onClick={() => item.self_pickup && toggleItemSelfPickup(index)}
                          className="gap-2"
                        >
                          <Badge variant="outline" className="gap-1 border-emerald-200 bg-emerald-50 text-emerald-700 font-normal">
                            <Truck className="h-3 w-3" /> Dikirim
                          </Badge>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => !item.self_pickup && toggleItemSelfPickup(index)}
                          className="gap-2"
                        >
                          <Badge variant="outline" className="gap-1 border-blue-200 bg-blue-50 text-blue-700 font-normal">
                            <User className="h-3 w-3" /> Ambil Sendiri
                          </Badge>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
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
