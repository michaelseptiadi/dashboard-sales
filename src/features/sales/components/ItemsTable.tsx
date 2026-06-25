import { Plus, Trash2, Search, Package, Truck, User, ChevronDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/format";
import type { SalesItem } from "@/features/sales/types";
import type { Product } from "@/hooks/useProducts";

interface ItemsTableProps {
  items: SalesItem[];
  addItem: (product: Product) => void;
  updateItem: (index: number, field: keyof SalesItem, value: number) => void;
  toggleItemSelfPickup: (index: number) => void;
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
  showSummary?: boolean;
}

export function ItemsTable({
  items,
  addItem,
  updateItem,
  toggleItemSelfPickup,
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
  showSummary = true,
}: ItemsTableProps) {
  const kembalian = paymentAmount > grandTotal ? paymentAmount - grandTotal : 0;
  return (
    <Card className="min-h-[500px] border-muted/50 shadow-sm hover:shadow-md/40 transition-all duration-300 rounded-2xl overflow-hidden bg-card/65 backdrop-blur-md flex flex-col justify-between">
      <div>
        <CardHeader className="pb-4 border-b border-muted/20 bg-muted/10">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2.5 text-xs font-bold text-muted-foreground uppercase tracking-wider">
              <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                <Package className="h-4 w-4" />
              </div>
              <span>Daftar Produk</span>
              <span className="text-destructive font-bold">*</span>
            </CardTitle>
            <Popover open={productSearchOpen} onOpenChange={setProductSearchOpen}>
              <PopoverTrigger asChild>
                <Button size="sm" className="rounded-xl font-semibold hover:scale-[1.02] active:scale-[0.98] transition-all duration-200">
                  <Plus className="mr-1 h-4 w-4" /> Tambah Produk
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-2.5 rounded-xl shadow-lg border-muted/40" align="end">
                <div className="relative mb-2">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground/60" />
                  <Input
                    placeholder="Cari produk..."
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    className="pl-8.5 h-9 rounded-lg hover:border-muted-foreground/35"
                    autoFocus
                  />
                </div>
                <div className="max-h-60 overflow-auto space-y-1 pr-1">
                  {searchProducts?.length === 0 ? (
                    <p className="py-6 text-center text-sm text-muted-foreground">
                      Produk tidak ditemukan
                    </p>
                  ) : (
                    searchProducts?.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => addItem(p)}
                        className="flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-sm hover:bg-accent/60 transition-colors text-left"
                      >
                        <div className="min-w-0 pr-2 flex flex-col gap-0.5">
                          <div className="font-semibold truncate leading-normal">{p.name}</div>
                          <div className="text-xs text-muted-foreground font-mono truncate">{p.product_code}</div>
                        </div>
                        <span className="text-sm font-semibold shrink-0 text-primary">
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
        <CardContent className="pt-4 overflow-x-auto">
          <Table className="min-w-[650px]">
            <TableHeader>
              <TableRow className="text-xs border-b border-muted/20 hover:bg-transparent">
                <TableHead className="font-semibold text-muted-foreground">Produk</TableHead>
                <TableHead className="w-20 font-semibold text-muted-foreground">Qty</TableHead>
                <TableHead className="w-28 font-semibold text-muted-foreground">Diskon</TableHead>
                <TableHead className="w-28 text-right font-semibold text-muted-foreground">Subtotal</TableHead>
                <TableHead className="w-32 font-semibold text-muted-foreground">Pengiriman</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={6} className="py-24 text-center">
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <div className="p-4 rounded-full bg-muted/40 text-muted-foreground/40 mb-1">
                        <Package className="h-10 w-10" />
                      </div>
                      <p className="text-sm font-semibold">Belum ada produk</p>
                      <p className="text-xs">Klik "Tambah Produk" di atas untuk menambahkan item belanja.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                items.map((item, index) => (
                  <TableRow key={item.product_id} className="border-b border-muted/15 hover:bg-accent/5">
                    <TableCell className="py-3">
                      <div className="flex flex-col gap-0.5">
                        <div className="font-bold text-sm text-foreground leading-normal">{item.product_name}</div>
                        <div className="text-xs text-muted-foreground font-mono">{item.product_code}</div>
                      </div>
                    </TableCell>
                    <TableCell className="py-3">
                      <Input
                        type="number"
                        value={item.qty === 0 ? "" : item.qty}
                        onChange={(e) => {
                          const val = e.target.value === "" ? 0 : Number(e.target.value);
                          updateItem(index, "qty", val);
                        }}
                        onBlur={() => {
                          if (item.qty <= 0) {
                            updateItem(index, "qty", 1);
                          }
                        }}
                        className="h-9 rounded-lg text-sm text-center hover:border-muted-foreground/35 transition-colors focus:ring-primary/20"
                        min={1}
                      />
                    </TableCell>
                    <TableCell className="py-3">
                      <CurrencyInput
                        value={item.discount}
                        onChange={(v) => updateItem(index, "discount", v)}
                        className="h-9 rounded-lg text-sm hover:border-muted-foreground/35 transition-colors focus:ring-primary/20"
                      />
                    </TableCell>
                    <TableCell className="py-3 text-right font-bold text-sm text-foreground">
                      {formatCurrency(item.subtotal)}
                    </TableCell>
                    <TableCell className="py-3">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button type="button" className="flex items-center gap-1.5 focus:outline-none hover:opacity-85 transition-opacity py-1">
                            {item.self_pickup ? (
                              <Badge variant="outline" className="gap-1 border-blue-200 bg-blue-50/70 text-blue-700 font-semibold cursor-pointer hover:bg-blue-100/80 rounded-lg py-1 px-2.5 text-[11px]">
                                <User className="h-3 w-3" /> Ambil Sendiri
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="gap-1 border-emerald-200 bg-emerald-50/70 text-emerald-700 font-semibold cursor-pointer hover:bg-emerald-100/80 rounded-lg py-1 px-2.5 text-[11px]">
                                <Truck className="h-3 w-3" /> Dikirim
                              </Badge>
                            )}
                            <ChevronDown className="h-3 w-3 text-muted-foreground/60" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="rounded-xl shadow-md border-muted/40">
                          <DropdownMenuItem
                            onClick={() => item.self_pickup && toggleItemSelfPickup(index)}
                            className="gap-2 rounded-lg"
                          >
                            <Badge variant="outline" className="gap-1 border-emerald-200 bg-emerald-50 text-emerald-700 font-semibold text-[11px] rounded-lg">
                              <Truck className="h-3 w-3" /> Dikirim
                            </Badge>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => !item.self_pickup && toggleItemSelfPickup(index)}
                            className="gap-2 rounded-lg"
                          >
                            <Badge variant="outline" className="gap-1 border-blue-200 bg-blue-50 text-blue-700 font-semibold text-[11px] rounded-lg">
                              <User className="h-3 w-3" /> Ambil Sendiri
                            </Badge>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                    <TableCell className="py-3">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-lg hover:bg-destructive/10 hover:text-destructive text-muted-foreground transition-all active:scale-95"
                        onClick={() => removeItem(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </div>

      {items.length > 0 && showSummary && (
        <div className="p-6 border-t border-muted/20 bg-muted/10 space-y-4">
          <div className="bg-card/75 backdrop-blur-sm border border-muted/40 rounded-2xl p-5 shadow-sm space-y-3">
            <div className="flex justify-between items-center text-sm text-muted-foreground">
              <span className="font-medium">Total Harga</span>
              <span className="font-semibold font-mono">{formatCurrency(totalAmount)}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="font-medium text-destructive">Total Diskon</span>
              <span className="font-semibold font-mono text-destructive">− {formatCurrency(totalDiscount)}</span>
            </div>
            <div className="flex items-center justify-between gap-12 text-sm text-muted-foreground">
              <Label className="flex items-center gap-1.5 font-medium text-muted-foreground cursor-pointer">
                <Truck className="h-4 w-4 text-primary/75" />
                <span>Biaya Kirim</span>
              </Label>
              <CurrencyInput
                value={deliveryFee}
                onChange={setDeliveryFee}
                className="h-8 w-36 text-right text-sm font-semibold rounded-lg hover:border-muted-foreground/35"
              />
            </div>
            <div className="border-t border-muted/20 my-2 pt-3 flex justify-between items-center text-lg font-bold text-foreground">
              <span>Grand Total</span>
              <span className="text-xl font-bold font-mono text-primary">{formatCurrency(grandTotal)}</span>
            </div>
            <div className="border-t border-muted/20 pt-3 space-y-2.5">
              <div className="flex items-center justify-between gap-12">
                <span className="text-sm font-bold text-foreground">Jumlah Dibayar</span>
                <div className="flex items-center gap-2">
                  {paymentAmount !== grandTotal && (
                    <button
                      type="button"
                      onClick={() => setPaymentAmount(grandTotal)}
                      className="text-xs font-semibold text-primary hover:bg-primary/5 px-2 py-1 rounded-lg transition-all active:scale-95 duration-200 animate-in fade-in"
                    >
                      Bayar Pas
                    </button>
                  )}
                  <CurrencyInput
                    value={paymentAmount}
                    onChange={setPaymentAmount}
                    placeholder="Jumlah bayar..."
                    className="h-9 w-44 text-right text-sm font-bold rounded-xl hover:border-muted-foreground/35 border-primary/40 focus:border-primary focus:ring-primary/15 bg-background shadow-inner"
                  />
                </div>
              </div>
              {paymentAmount > 0 && (
                <div className="flex justify-between items-center text-sm pt-1 animate-in fade-in duration-200">
                  <span className={kembalian > 0 ? "text-emerald-600 font-bold flex items-center gap-1" : "text-amber-600 font-bold flex items-center gap-1"}>
                    {kembalian > 0 ? "✓ Kembalian" : "⚠ Sisa Bayar (Hutang)"}
                  </span>
                  <span className={kembalian > 0 ? "text-emerald-600 font-bold font-mono text-base" : "text-amber-600 font-bold font-mono text-base"}>
                    {kembalian > 0
                      ? formatCurrency(kembalian)
                      : formatCurrency(grandTotal - paymentAmount)}
                  </span>
                </div>
              )}
            </div>
          </div>
          <Button
            onClick={onSubmit}
            disabled={isPending || items.length === 0}
            size="lg"
            className="w-full h-12 text-sm font-bold rounded-2xl shadow-md bg-gradient-to-r from-primary to-primary/90 hover:from-primary/95 hover:to-primary active:scale-[0.99] transition-all duration-200 uppercase tracking-wider"
          >
            {isPending ? "Sedang Menyimpan..." : "Simpan Transaksi"}
          </Button>
        </div>
      )}
    </Card>
  );
}
