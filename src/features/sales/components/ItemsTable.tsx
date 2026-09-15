import { Plus, Trash2, Search, Package, Truck, User, ChevronDown, Coins, Check, Loader2, Pencil, Layers } from "lucide-react";
import { useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/format";
import type { SalesItem } from "@/features/sales/types";
import type { Product } from "@/hooks/useProducts";

interface ItemsTableProps {
  items: SalesItem[];
  addItem: (product: Product) => void;
  onEditProduct?: (product: Product) => void;
  updateItem: (index: number, field: keyof SalesItem, value: string | number | boolean | null | undefined | import("@/hooks/useProducts").ProductUnit[] | import("@/hooks/useProducts").ProductVariant[]) => void;
  toggleItemSelfPickup: (index: number) => void;
  removeItem: (index: number) => void;
  productSearch: string;
  setProductSearch: (v: string) => void;
  searchProducts?: Product[];
  fetchNextPage?: () => void;
  hasNextPage?: boolean;
  isFetchingNextPage?: boolean;
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
  onEditProduct,
  updateItem,
  toggleItemSelfPickup,
  removeItem,
  productSearch,
  setProductSearch,
  searchProducts,
  fetchNextPage,
  hasNextPage,
  isFetchingNextPage,
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
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!productSearchOpen) return;
    const sentinel = loadMoreRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasNextPage && !isFetchingNextPage && fetchNextPage) {
          fetchNextPage();
        }
      },
      { root: scrollContainerRef.current, threshold: 0.05, rootMargin: "200px" }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [productSearchOpen, hasNextPage, isFetchingNextPage, fetchNextPage, searchProducts?.length]);

  const handleContainerScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - scrollTop - clientHeight < 250 && hasNextPage && !isFetchingNextPage && fetchNextPage) {
      fetchNextPage();
    }
  };

  return (
    <Card className="md:min-h-[500px] border-muted/50 shadow-sm hover:shadow-md/40 transition-all duration-300 rounded-2xl overflow-hidden bg-card/65 backdrop-blur-md flex flex-col justify-between">
      <div>
        {/* Mobile Header: compact — no Card chrome */}
        <div className="flex items-center justify-between pb-3 md:pb-4 border-b border-muted/20 md:bg-muted/10 px-0 md:px-0">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary/10 text-primary hidden md:flex">
              <Package className="h-4 w-4" />
            </div>
            <span className="text-[10px] md:text-xs font-bold text-muted-foreground uppercase tracking-wider">Daftar Produk</span>
            <span className="text-destructive font-bold hidden md:inline">*</span>
            {items.length > 0 && (
              <span className="text-[10px] font-bold text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded-full md:hidden">{items.length}</span>
            )}
          </div>
          <Dialog open={productSearchOpen} onOpenChange={setProductSearchOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="rounded-xl font-semibold hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 h-8 md:h-9 text-xs px-3">
                <Plus className="mr-1 h-3.5 w-3.5 md:h-4 md:w-4" /> <span className="hidden sm:inline">Tambah </span>Produk
              </Button>
            </DialogTrigger>
              <DialogContent 
                className="w-full h-[100dvh] sm:h-auto sm:max-w-md p-4 sm:p-5 rounded-none sm:rounded-2xl shadow-xl border-muted/40 z-[100] flex flex-col gap-0"
              >
                <DialogHeader className="mb-4 text-left">
                  <DialogTitle className="text-lg font-bold flex items-center gap-2">
                    <Search className="h-5 w-5 text-muted-foreground" />
                    Cari Produk
                  </DialogTitle>
                </DialogHeader>

                <div className="relative mb-3 flex-shrink-0">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
                  <Input
                    placeholder="Ketik nama atau kode produk..."
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    className="pl-9 h-11 rounded-xl bg-muted/20 border-muted/40 hover:border-muted-foreground/35 focus:ring-primary/20 text-[16px] shadow-sm"
                  />
                </div>
                
                <div 
                  ref={scrollContainerRef} 
                  onScroll={handleContainerScroll}
                  className="flex-1 overflow-y-auto overscroll-contain touch-pan-y space-y-1.5 pr-1 -mx-1 px-1"
                >
                  {searchProducts?.length === 0 ? (
                    <p className="py-12 text-center text-sm text-muted-foreground">
                      Produk tidak ditemukan
                    </p>
                  ) : (
                    <>
                      {searchProducts?.map((p) => (
                        <div key={p.id} className="rounded-xl border border-transparent hover:border-border/50 hover:bg-accent/40 transition-colors">
                          <div className="flex items-center gap-2 px-3 py-2.5">
                            <button
                              type="button"
                              onClick={() => { addItem(p); setProductSearchOpen(false); }}
                              className="min-w-0 flex-1 text-left"
                            >
                              <div className="font-semibold truncate leading-tight">{p.name}</div>
                              <div className="text-xs text-muted-foreground font-mono truncate">{p.product_code}</div>
                            </button>
                            {onEditProduct && (
                              <button type="button" onClick={() => onEditProduct(p)} className="shrink-0 rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground" title="Edit produk">
                                <Pencil className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                          {p.variants?.length === 1 ? (
                            <button
                              type="button"
                              onClick={() => { addItem({ ...p, variants: [p.variants![0]], selling_price: Number(p.variants![0].selling_price) }); setProductSearchOpen(false); }}
                              className="mt-1 w-full rounded-lg border border-primary/20 bg-primary/5 px-2 py-1.5 text-left text-xs font-semibold text-primary hover:bg-primary/10"
                            >
                              {p.variants[0].name} · {formatCurrency(Number(p.variants[0].selling_price))}
                            </button>
                          ) : p.variants?.length ? (
                            <div className="border-t border-border/30 px-3 py-1.5">
                              <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                                <Layers className="h-3 w-3" /> Pilih varian & harga
                              </div>
                              <select
                                defaultValue=""
                                onChange={(e) => {
                                  const selected = p.variants?.find((v) => v.id === e.target.value);
                                  if (selected) {
                                    addItem({ ...p, variants: [selected], selling_price: Number(selected.selling_price) });
                                    setProductSearchOpen(false);
                                  }
                                }}
                                className="w-full rounded-lg border border-primary/20 bg-primary/5 px-2 py-1.5 text-xs font-semibold text-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                              >
                                <option value="">Pilih varian untuk menambahkan...</option>
                                {p.variants.filter((v) => v.is_active).map((v) => (
                                  <option key={v.id} value={v.id}>{v.name} · {formatCurrency(Number(v.selling_price))}</option>
                                ))}
                              </select>
                            </div>
                          ) : null}
                        </div>
                      ))}
                      {/* Infinite Scroll Sentinel & Status */}
                      <div ref={loadMoreRef} className="py-3 flex flex-col items-center justify-center min-h-[44px]">
                        {isFetchingNextPage ? (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Loader2 className="h-4 w-4 animate-spin text-primary" />
                            <span>Memuat produk lainnya...</span>
                          </div>
                        ) : hasNextPage ? (
                          <button
                            type="button"
                            onClick={() => fetchNextPage?.()}
                            className="text-xs font-semibold text-primary hover:underline py-1.5 px-3 rounded-lg hover:bg-primary/5 transition-colors"
                          >
                            Muat lebih banyak...
                          </button>
                        ) : searchProducts.length > 20 ? (
                          <span className="text-[11px] text-muted-foreground/60 py-1">
                            Semua produk telah ditampilkan
                          </span>
                        ) : null}
                      </div>
                    </>
                  )}
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
        <div className="pt-3 md:pt-4">
          <div className="hidden md:block overflow-x-auto">
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
                        <div className="text-xs text-muted-foreground font-mono flex flex-wrap items-center gap-1.5 mt-0.5">
                          <span>{item.product_code}</span>
                          {item.product_unit_name && (
                            <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-1.5 py-0.5 rounded font-normal font-sans">
                              {item.product_unit_name}
                            </span>
                          )}
                        </div>
                        {item.product_variants && item.product_variants.length > 1 && (
                          <div className="mt-1">
                            <select
                              value={item.product_variant_id || ""}
                              onChange={(e) => updateItem(index, "product_variant_id", e.target.value || null)}
                              className="text-xs bg-violet-50/80 hover:bg-violet-100/70 border border-violet-200 rounded px-1.5 py-0.5 font-medium cursor-pointer text-violet-700 dark:bg-violet-950/30 dark:border-violet-800 dark:text-violet-400 focus:outline-none"
                            >
                              {item.product_variants
                                .filter((v) => v.is_active)
                                .map((v) => (
                                  <option key={v.id} value={v.id}>
                                    {v.name} ({formatCurrency(Number(v.selling_price))})
                                  </option>
                                ))}
                            </select>
                          </div>
                        )}
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
                    <TableCell className="py-3 text-right font-semibold text-sm">
                      {item.qty * item.price > item.subtotal ? (
                        <div className="flex flex-col items-end">
                          <span className="text-xs text-muted-foreground line-through font-normal">
                            {formatCurrency(item.qty * item.price)}
                          </span>
                          <span className="text-foreground font-bold">
                            {formatCurrency(item.subtotal)}
                          </span>
                        </div>
                      ) : (
                        <span className="text-foreground font-bold">{formatCurrency(item.subtotal)}</span>
                      )}
                    </TableCell>
                    <TableCell className="py-3">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button type="button" className="flex items-center gap-1.5 focus:outline-none hover:opacity-85 transition-opacity py-1">
                            {item.self_pickup ? (
                              <Badge variant="outline" className="gap-1 border-blue-200 bg-blue-50/70 text-blue-700 font-semibold cursor-pointer hover:bg-blue-100/80 rounded-lg py-1 px-2.5 text-[11px] whitespace-nowrap">
                                <User className="h-3 w-3" /> Ambil Sendiri
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="gap-1 border-emerald-200 bg-emerald-50/70 text-emerald-700 font-semibold cursor-pointer hover:bg-emerald-100/80 rounded-lg py-1 px-2.5 text-[11px] whitespace-nowrap">
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
                            <Badge variant="outline" className="gap-1 border-emerald-200 bg-emerald-50 text-emerald-700 font-semibold text-[11px] rounded-lg whitespace-nowrap">
                              <Truck className="h-3 w-3" /> Dikirim
                            </Badge>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => !item.self_pickup && toggleItemSelfPickup(index)}
                            className="gap-2 rounded-lg"
                          >
                            <Badge variant="outline" className="gap-1 border-blue-200 bg-blue-50 text-blue-700 font-semibold text-[11px] rounded-lg whitespace-nowrap">
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
          </div>

          {/* Mobile View */}
          <div className="md:hidden space-y-3">
            {items.length === 0 ? (
              <div className="py-12 text-center flex flex-col items-center gap-2 text-muted-foreground border rounded-xl border-dashed">
                <div className="p-3 rounded-full bg-muted/40 text-muted-foreground/40 mb-1">
                  <Package className="h-8 w-8" />
                </div>
                <p className="text-sm font-semibold">Belum ada produk</p>
                <p className="text-xs">Klik "Tambah Produk" di atas.</p>
              </div>
            ) : (
              items.map((item, index) => (
                <div key={`${item.product_id}-${index}`} className="flex flex-col gap-2 p-3 border rounded-xl bg-card shadow-sm">
                  {/* Row 1: Header / Title */}
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex flex-col gap-0.5">
                      <div className="font-bold text-sm text-foreground leading-tight">{item.product_name}</div>
                      <div className="text-xs text-muted-foreground font-mono flex flex-wrap items-center gap-1.5 mt-0.5">
                        <span>{item.product_code}</span>
                        {item.product_unit_name && (
                          <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-1.5 py-0.5 rounded font-normal font-sans">
                            {item.product_unit_name}
                          </span>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all flex-shrink-0"
                      onClick={() => removeItem(index)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>

                  {/* Row 2: Variant selector (if any) */}
                  {item.product_variants && item.product_variants.length > 1 && (
                    <div>
                      <select
                        value={item.product_variant_id || ""}
                        onChange={(e) => updateItem(index, "product_variant_id", e.target.value || null)}
                        className="w-full text-[10px] bg-violet-50/80 hover:bg-violet-100/70 border border-violet-200 rounded px-2 py-1 font-medium text-violet-700 dark:bg-violet-950/30 dark:border-violet-800 dark:text-violet-400 focus:outline-none"
                      >
                        {item.product_variants
                          .filter((v) => v.is_active)
                          .map((v) => (
                            <option key={v.id} value={v.id}>
                              {v.name} ({formatCurrency(Number(v.selling_price))})
                            </option>
                          ))}
                      </select>
                    </div>
                  )}

                  {/* Row 3: Qty + Diskon + Subtotal — all in one line */}
                  <div className="flex items-end gap-2">
                    <div className="w-20">
                      <Label className="text-[9px] text-muted-foreground uppercase tracking-wider mb-0.5 block">Qty</Label>
                      <Input
                        type="number"
                        value={item.qty === 0 ? "" : item.qty}
                        onChange={(e) => {
                          const val = e.target.value === "" ? 0 : Number(e.target.value);
                          updateItem(index, "qty", val);
                        }}
                        onBlur={() => {
                          if (item.qty <= 0) updateItem(index, "qty", 1);
                        }}
                        className="h-7 rounded-lg text-[11px] text-center px-1"
                        min={1}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <Label className="text-[9px] text-muted-foreground uppercase tracking-wider mb-0.5 block">Diskon</Label>
                      <CurrencyInput
                        value={item.discount}
                        onChange={(v) => updateItem(index, "discount", v)}
                        className="h-7 rounded-lg text-[11px] px-2"
                      />
                    </div>
                    <div className="text-right shrink-0">
                      <Label className="text-[9px] text-muted-foreground uppercase tracking-wider mb-0.5 block">Subtotal</Label>
                      {item.qty * item.price > item.subtotal ? (
                        <div className="flex flex-col items-end leading-tight">
                          <span className="text-[9px] text-muted-foreground line-through">
                            {formatCurrency(item.qty * item.price)}
                          </span>
                          <span className="text-xs text-foreground font-bold font-mono">
                            {formatCurrency(item.subtotal)}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-foreground font-bold font-mono leading-tight">{formatCurrency(item.subtotal)}</span>
                      )}
                    </div>
                  </div>

                  {/* Row 4: Self Pickup Toggle */}
                  <div className="flex items-center justify-end border-t pt-1.5">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button type="button" className="flex items-center gap-1.5 focus:outline-none hover:opacity-85 transition-opacity py-1">
                          {item.self_pickup ? (
                            <Badge variant="outline" className="gap-1 border-blue-200 bg-blue-50/70 text-blue-700 font-semibold cursor-pointer hover:bg-blue-100/80 rounded py-1 px-2 text-[10px] whitespace-nowrap">
                              <User className="h-3 w-3" /> Ambil Sendiri
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="gap-1 border-emerald-200 bg-emerald-50/70 text-emerald-700 font-semibold cursor-pointer hover:bg-emerald-100/80 rounded py-1 px-2 text-[10px] whitespace-nowrap">
                              <Truck className="h-3 w-3" /> Dikirim
                            </Badge>
                          )}
                          <ChevronDown className="h-3 w-3 text-muted-foreground/60" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="rounded-xl shadow-md border-muted/40">
                        <DropdownMenuItem onClick={() => item.self_pickup && toggleItemSelfPickup(index)} className="gap-2 rounded-lg text-xs">
                          <Truck className="h-3.5 w-3.5 text-emerald-600" /> Dikirim
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => !item.self_pickup && toggleItemSelfPickup(index)} className="gap-2 rounded-lg text-xs">
                          <User className="h-3.5 w-3.5 text-blue-600" /> Ambil Sendiri
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))
            )}
          </div>
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
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <span className="text-sm font-bold text-foreground">Jumlah Dibayar</span>
                <div className="flex flex-wrap items-center justify-end gap-2.5">
                  {paymentAmount === grandTotal ? (
                    <div className="h-9 flex items-center gap-1.5 px-3 rounded-xl border border-emerald-200 bg-emerald-50/70 text-emerald-700 text-xs font-bold shadow-sm animate-in fade-in zoom-in-95 duration-200">
                      <Check className="h-3.5 w-3.5 text-emerald-600" />
                      Uang Pas
                    </div>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setPaymentAmount(grandTotal)}
                      className="h-9 gap-1.5 px-3 rounded-xl border-primary/30 hover:border-primary bg-primary/5 hover:bg-primary text-primary hover:text-primary-foreground text-xs font-bold shadow-sm transition-all hover:scale-[1.02] active:scale-[0.98] duration-200 animate-in fade-in zoom-in-95"
                    >
                      <Coins className="h-3.5 w-3.5" />
                      Bayar Pas: {formatCurrency(grandTotal)}
                    </Button>
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
