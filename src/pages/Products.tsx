import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { SearchInput } from "@/components/SearchInput";
import { TableSkeleton } from "@/components/TableSkeleton";
import { DialogFormActions } from "@/components/DialogFormActions";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useProducts, useCreateProduct, useUpdateProduct, useCategories, useUnits, useAdjustStock, useRealtimeStock, useLowStockProducts } from "@/hooks/useProducts";
import { Plus, PackagePlus, AlertTriangle, Eye, ChevronRight, Boxes, SlidersHorizontal } from "lucide-react";
import { formatCurrency } from "@/lib/format";

interface ProductFormData {
  product_code: string;
  name: string;
  category_id: string;
  unit_id: string;
  selling_price: number;
  capital_price: number;
  minimum_stock: number;
}

const emptyForm: ProductFormData = {
  product_code: "",
  name: "",
  category_id: "",
  unit_id: "",
  selling_price: 0,
  capital_price: 0,
  minimum_stock: 0,
};

export default function Products() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { currentRole, isSuperAdmin } = useAuth();
  const isAdmin = isSuperAdmin || currentRole === "admin";

  const [searchParams, setSearchParams] = useSearchParams();
  const search = searchParams.get("q") ?? "";
  const categoryFilter = searchParams.get("cat") ?? "";
  const page = Number(searchParams.get("page") ?? "1");
  const limit = Number(searchParams.get("limit") ?? "10");

  const setSearch = (value: string) =>
    setSearchParams((prev) => { const p = new URLSearchParams(prev); p.set("q", value); p.set("page", "1"); return p; }, { replace: true });
  const setCategoryFilter = (value: string) =>
    setSearchParams((prev) => { const p = new URLSearchParams(prev); p.set("cat", value); p.set("page", "1"); return p; }, { replace: true });
  const setPage = (value: number) =>
    setSearchParams((prev) => { const p = new URLSearchParams(prev); p.set("page", String(value)); return p; }, { replace: true });
  const setLimit = (value: number) =>
    setSearchParams((prev) => { const p = new URLSearchParams(prev); p.set("limit", String(value)); p.set("page", "1"); return p; }, { replace: true });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [stockFilter, setStockFilter] = useState<"all" | "low" | "out">("all");
  const [form, setForm] = useState<ProductFormData>(emptyForm);
  const [stockDialogOpen, setStockDialogOpen] = useState(false);
  const [stockProduct, setStockProduct] = useState<{ id: string; name: string; current_stock: number; store_product_id?: string; variants: import("@/hooks/useProducts").ProductVariant[] } | null>(null);
  const [selectedVariantId, setSelectedVariantId] = useState<string>("");
  const [adjustQty, setAdjustQty] = useState<number | "">("");
  const [adjustType, setAdjustType] = useState<"in" | "out">("in");
  const [adjustNotes, setAdjustNotes] = useState("");

  const { data: productsResponse, isLoading } = useProducts(search, categoryFilter || undefined, page, limit);
  const { data: lowStockItems } = useLowStockProducts();
  const { data: categories } = useCategories();
  const { data: units } = useUnits();
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const adjustStock = useAdjustStock();
  useRealtimeStock();

  const products = productsResponse?.data ?? [];
  const productsMeta = productsResponse?.meta;
  const stockOf = (product: import("@/hooks/useProducts").Product) =>
    product.variants?.length
      ? product.variants.filter((variant) => variant.is_active).reduce((sum, variant) => sum + Number(variant.stock), 0)
      : Number(product.current_stock || 0);
  const isLow = (product: import("@/hooks/useProducts").Product) =>
    product.variants?.length
      ? product.variants.some((variant) => variant.is_active && Number(variant.stock) <= Number(variant.minimum_stock))
      : stockOf(product) <= Number(product.minimum_stock);
  // ponytail: Stock chips filter the fetched page; move filters server-side when the API supports stock status.
  const mobileProducts = products.filter((product) => {
    const stock = stockOf(product);
    if (stockFilter === "out") return stock <= 0;
    if (stockFilter === "low") return stock > 0 && isLow(product);
    return true;
  });



  const nextProductCode = () => {
    const existing = (products ?? [])
      .map((p) => p.product_code)
      .filter((code) => /^BRG-\d+$/.test(code))
      .map((code) => parseInt(code.replace("BRG-", ""), 10));
    const max = existing.length > 0 ? Math.max(...existing) : 0;
    return `BRG-${String(max + 1).padStart(4, "0")}`;
  };

  const openCreate = () => {
    setForm({ ...emptyForm, product_code: nextProductCode() });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.product_code || !form.name || !form.category_id || !form.unit_id || !form.selling_price || !form.capital_price) {
      toast({ title: "Semua field wajib diisi", variant: "destructive" });
      return;
    }
    try {
      await createProduct.mutateAsync({
        ...form,
        category_id: form.category_id || null,
        unit_id: form.unit_id || null,
      });
      toast({ title: "Produk berhasil ditambahkan" });
      setDialogOpen(false);
    } catch (error: unknown) {
      toast({ title: "Gagal menyimpan produk", description: (error as Error).message, variant: "destructive" });
    }
  };

  const openStockDialog = (product: import("@/hooks/useProducts").Product) => {
    const fullProduct = products.find((p) => p.id === product.id);
    const vars = fullProduct?.variants || product.variants || [];
    setStockProduct({
      id: product.id,
      name: product.name,
      current_stock: product.current_stock ?? 0,
      store_product_id: product.store_product_id || fullProduct?.store_product_id,
      variants: vars
    });
    setSelectedVariantId((product as import("@/hooks/useProducts").Product & { variant_id?: string }).variant_id || vars[0]?.id || "");
    setAdjustQty("");
    setAdjustType("in");
    setAdjustNotes("");
    setStockDialogOpen(true);
  };

  const handleAdjustStock = async () => {
    const qty = Number(adjustQty);
    if (!stockProduct || !selectedVariantId || isNaN(qty) || qty <= 0) {
      toast({ title: "Jumlah penyesuaian harus lebih dari 0", variant: "destructive" });
      return;
    }
    try {
      await adjustStock.mutateAsync({
        product_id: stockProduct.id,
        productVariantId: selectedVariantId,
        qty: qty,
        type: adjustType,
        notes: adjustNotes || undefined,
        storeProductId: stockProduct.store_product_id,
      });
      toast({ title: `Stok berhasil ${adjustType === "in" ? "ditambah" : "dikurangi"} sebesar ${qty}` });
      setStockDialogOpen(false);
    } catch (error: unknown) {
      toast({ title: "Gagal menyesuaikan stok", description: (error as Error).message, variant: "destructive" });
    }
  };

  const handleToggleActive = async (id: string, currentActive: boolean) => {
    try {
      // Store-products API doesn't expose is_active toggling; keep current behavior by blocking this action.
      throw new Error("Ubah status aktif produk belum tersedia di endpoint store-products");
    } catch (error: unknown) {
      toast({ title: "Gagal mengubah status", description: (error as Error).message, variant: "destructive" });
    }
  };

  const activeVariant = stockProduct?.variants?.find((v) => v.id === selectedVariantId);
  const activeStock = activeVariant ? Number(activeVariant.stock) : (stockProduct?.current_stock ?? 0);

  return (
    <DashboardLayout title="Manajemen Produk">
      <div className="mb-5 md:hidden">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">Katalog toko</p>
        <div className="mt-1 flex items-end justify-between gap-3">
          <div><h1 className="text-2xl font-extrabold">Produk</h1><p className="mt-1 text-sm text-muted-foreground">Cari barang dan pantau stok dengan cepat.</p></div>
          <div className="flex h-11 min-w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary"><Boxes className="h-5 w-5" /></div>
        </div>
      </div>
      {/* Low stock alert */}
      {lowStockItems && lowStockItems.length > 0 && (
        <Card className="mb-5 hidden border-red-200 bg-red-50/80 dark:border-red-800 dark:bg-red-950/30 md:block">
          <CardHeader className="px-5 pb-2 pt-4">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold text-red-700 dark:text-red-400">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                Peringatan Stok Menipis
              </CardTitle>
              <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-600 dark:bg-red-900/60 dark:text-red-400">
                {lowStockItems.length} produk
              </span>
            </div>
            <p className="mt-0.5 text-xs text-red-400/80 dark:text-red-500/70">Klik kartu untuk menyesuaikan stok</p>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            <div className="flex gap-3 overflow-x-auto pb-1 [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-red-300 [&::-webkit-scrollbar-track]:bg-transparent">
              {lowStockItems.map((p) => (
                <div
                  key={p.id}
                  onClick={() => openStockDialog(p)}
                  className="group shrink-0 w-44 cursor-pointer rounded-xl border border-red-200 bg-white px-3.5 py-3 shadow-sm transition-all hover:border-red-400 hover:shadow-md dark:border-red-700 dark:bg-red-950/60 dark:hover:border-red-500"
                >
                  <p className="truncate text-sm font-semibold text-red-800 dark:text-red-200">{p.name}</p>
                  <p className="mb-3 font-mono text-[11px] text-red-400 dark:text-red-500">{p.product_code}</p>
                  <div className="flex items-end justify-between">
                    <div>
                      <p className="text-[10px] tracking-wide text-red-400/70">Stok Sekarang</p>
                      <p className="text-2xl font-bold leading-none text-red-700 dark:text-red-300">{p.current_stock}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] tracking-wide text-red-400/70">Min. Stok</p>
                      <p className="text-base font-semibold text-red-400 dark:text-red-500">{p.minimum_stock}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
      {/* Products */}
      <Card className="border-0 bg-transparent shadow-none md:border md:bg-card md:shadow-sm">
        <CardHeader className="px-0 pb-4 pt-0 md:px-6 md:pt-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2.5">
              <CardTitle className="hidden text-base md:block">Daftar Produk</CardTitle>
              {productsMeta && (
                <span className="hidden rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground md:inline-flex">
                  {productsMeta.total}
                </span>
              )}
            </div>
            {isAdmin && (
              <Button size="sm" onClick={openCreate} className="h-11 rounded-full px-4 shadow-sm md:h-9 md:rounded-md md:px-3">
                <Plus className="mr-1.5 h-4 w-4" /> Tambah Produk
              </Button>
            )}
          </div>
          <div className="flex flex-wrap gap-3 pt-1">
            <SearchInput
              aria-label="Cari produk"
              containerClassName="w-full flex-1 min-w-[200px] [&_svg]:top-4 md:[&_svg]:top-2.5"
              className="h-12 rounded-2xl border-slate-300 bg-card pl-10 shadow-sm md:h-10 md:rounded-md md:shadow-none"
              placeholder="Cari nama atau kode produk..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Select value={categoryFilter || "all"} onValueChange={(v) => setCategoryFilter(v === "all" ? "" : v)}>
              <SelectTrigger aria-label="Filter kategori" className="h-11 flex-1 rounded-xl bg-card md:h-10 md:w-[180px] md:flex-none md:rounded-md">
                <SelectValue placeholder="Semua Kategori" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Kategori</SelectItem>
                {categories?.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={String(limit)} onValueChange={(v) => setLimit(Number(v))}>
              <SelectTrigger aria-label="Jumlah per halaman" className="hidden w-[110px] md:flex">
                <SelectValue placeholder="Limit" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="30">30</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 pt-1 md:hidden" aria-label="Filter stok">
            {([['all', 'Semua'], ['low', 'Stok rendah'], ['out', 'Stok habis']] as const).map(([value, label]) => (
              <button key={value} type="button" onClick={() => setStockFilter(value)} aria-pressed={stockFilter === value} className={`min-h-11 shrink-0 rounded-full px-4 text-sm font-bold transition active:scale-95 ${stockFilter === value ? 'bg-foreground text-background shadow-sm' : 'border bg-card text-muted-foreground'}`}>{label}</button>
            ))}
          </div>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          <section aria-label="Daftar produk mobile" className="space-y-3 md:hidden">
            {isLoading ? (
              Array.from({ length: 4 }, (_, index) => <div key={index} className="h-36 animate-pulse rounded-2xl border bg-card" />)
            ) : mobileProducts.length === 0 ? (
              <div className="rounded-2xl border bg-card px-5 py-10 text-center shadow-sm">
                <PackagePlus className="mx-auto mb-3 h-9 w-9 text-muted-foreground/40" />
                <p className="font-bold">Tidak ada produk ditemukan</p>
                <p className="mt-1 text-sm text-muted-foreground">Coba ubah pencarian atau filter stok.</p>
              </div>
            ) : mobileProducts.map((product) => {
              const stock = stockOf(product);
              const lowStock = isLow(product);
              const status = stock <= 0 ? "Stok habis" : lowStock ? "Stok rendah" : "Stok aman";
              return (
                <article key={product.id} className="overflow-hidden rounded-2xl border bg-card shadow-sm transition active:scale-[0.995]">
                  <div className="flex gap-3 p-4">
                    <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${stock <= 0 ? 'bg-rose-100 text-rose-700' : lowStock ? 'bg-amber-100 text-amber-700' : 'bg-primary/10 text-primary'}`}>
                      <Boxes className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate font-extrabold">{product.name}</p>
                          <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">{product.product_code}</p>
                        </div>
                        <Badge variant="outline" className={`shrink-0 text-[10px] ${stock <= 0 ? 'border-rose-200 bg-rose-50 text-rose-700' : lowStock ? 'border-amber-200 bg-amber-50 text-amber-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>{status}</Badge>
                      </div>
                      <div className="mt-3 flex items-end justify-between gap-3">
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Harga jual</p>
                          <p className="mt-0.5 text-sm font-extrabold">{formatCurrency(Number(product.selling_price || 0))}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Stok</p>
                          <p className={`mt-0.5 text-xl font-black tabular-nums ${stock <= 0 ? 'text-rose-600' : lowStock ? 'text-amber-700' : ''}`}>{stock} <span className="text-xs font-semibold text-muted-foreground">{product.units?.name || product.unit?.name || ''}</span></p>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex border-t bg-muted/20">
                    {isAdmin && product.variants?.length ? <button type="button" onClick={() => openStockDialog(product)} className="flex min-h-12 flex-1 items-center justify-center gap-2 border-r text-xs font-bold text-primary active:bg-primary/5"><SlidersHorizontal className="h-4 w-4" /> Sesuaikan stok</button> : null}
                    <button type="button" aria-label={`Lihat detail ${product.name}`} onClick={() => navigate(`/produk/${product.id}`)} className="flex min-h-12 flex-1 items-center justify-center gap-1 text-xs font-bold active:bg-muted">Lihat detail <ChevronRight className="h-4 w-4" /></button>
                  </div>
                </article>
              );
            })}
          </section>
          <div className="hidden md:block">
          {isLoading ? (
            <div className="px-6 pb-6"><TableSkeleton /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-t bg-muted/30">
                  <TableHead className="pl-6 text-xs">Kode</TableHead>
                  <TableHead className="text-xs">Nama</TableHead>
                  <TableHead className="text-xs">Kategori</TableHead>
                  <TableHead className="text-xs">Satuan Dasar</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                  <TableHead className="w-10 pr-6"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-16 text-center text-muted-foreground">
                      <PackagePlus className="mx-auto mb-2 h-8 w-8 opacity-25" />
                      <p className="text-sm">Tidak ada produk ditemukan</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  products.map((product) => {
                    const isLowStock = product.variants?.some((v) => v.is_active && Number(v.stock) <= Number(v.minimum_stock));
                    return (
                      <TableRow
                        key={product.id}
                        className={`group transition-colors ${
                          isLowStock
                            ? "bg-red-50/60 hover:bg-red-100/60 dark:bg-red-950/25 dark:hover:bg-red-950/35 border-l-2 border-l-red-500"
                            : ""
                        }`}
                      >
                        <TableCell className="pl-6 font-mono text-xs text-muted-foreground">{product.product_code}</TableCell>
                        <TableCell className="font-medium">{product.name}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{product.categories?.name || "—"}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{product.units?.name || "—"}</TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={`text-xs ${
                              product.is_active
                                ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                                : "bg-slate-100 text-slate-500 border-slate-200"
                            }`}
                          >
                            {product.is_active ? "Aktif" : "Nonaktif"}
                          </Badge>
                        </TableCell>
                        <TableCell className="pr-6">
                          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={() => navigate(`/produk/${product.id}`)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          )}
          </div>
          {productsMeta && productsMeta.totalPages > 1 && (
            <div className="mt-4 flex flex-col gap-3 rounded-2xl border bg-card px-4 py-3 md:mt-0 md:flex-row md:items-center md:justify-between md:rounded-none md:border-x-0 md:border-b-0 md:px-6 md:py-4">
              <div className="text-center text-xs text-muted-foreground md:text-left">
                Menampilkan {(page - 1) * limit + 1} - {Math.min(page * limit, productsMeta.total)} dari {productsMeta.total} produk
              </div>
              <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-11 rounded-xl md:h-9 md:rounded-md"
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page <= 1}
                >
                  Sebelumnya
                </Button>
                <div className="min-w-24 text-center text-sm text-muted-foreground">
                  Halaman {productsMeta.page} / {productsMeta.totalPages}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-11 rounded-xl md:h-9 md:rounded-md"
                  onClick={() => setPage(Math.min(productsMeta.totalPages, page + 1))}
                  disabled={page >= productsMeta.totalPages}
                >
                  Berikutnya
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stock Adjustment Dialog */}
      <Dialog open={stockDialogOpen} onOpenChange={setStockDialogOpen}>
        <DialogContent className="max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] overflow-y-auto rounded-2xl sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base">Sesuaikan Stok</DialogTitle>
            <p className="text-sm text-muted-foreground">{stockProduct?.name}</p>
          </DialogHeader>
          <div className="space-y-4">
            {stockProduct && stockProduct.variants.length > 1 && (
              <div className="space-y-2">
                <Label>Varian</Label>
                <Select value={selectedVariantId} onValueChange={setSelectedVariantId}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {stockProduct.variants.map((v) => (
                      <SelectItem key={v.id} value={v.id}>
                        {v.name} (Stok: {v.stock})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="flex items-center justify-between rounded-xl bg-muted/60 px-4 py-3">
              <span className="text-sm text-muted-foreground">Stok saat ini</span>
              <span className="text-2xl font-bold tabular-nums">{activeStock}</span>
            </div>
            <div className="space-y-2">
              <Label>Jenis Penyesuaian</Label>
              <Select value={adjustType} onValueChange={(v) => setAdjustType(v as "in" | "out")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="in">Tambah Stok (Masuk)</SelectItem>
                  <SelectItem value="out">Kurangi Stok (Keluar)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Jumlah</Label>
              <Input
                type="number"
                min={1}
                value={adjustQty}
                onChange={(e) => setAdjustQty(e.target.value === "" ? "" : Number(e.target.value))}
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <Label>Catatan <span className="text-muted-foreground font-normal">(opsional)</span></Label>
              <Textarea
                value={adjustNotes}
                onChange={(e) => setAdjustNotes(e.target.value)}
                placeholder="Contoh: Stok opname, retur dari pelanggan..."
                rows={2}
                className="resize-none"
              />
            </div>
            {stockProduct && typeof adjustQty === "number" && adjustQty > 0 && (
              <div className="flex items-center justify-between rounded-xl bg-muted/60 px-4 py-3">
                <span className="text-sm text-muted-foreground">Stok setelah</span>
                <span className={`text-2xl font-bold tabular-nums ${
                  adjustType === "in" ? "text-green-600" : "text-red-600"
                }`}>
                  {adjustType === "in"
                    ? activeStock + adjustQty
                    : Math.max(0, activeStock - adjustQty)}
                </span>
              </div>
            )}
            <DialogFormActions
              onCancel={() => setStockDialogOpen(false)}
              onSave={handleAdjustStock}
              isPending={adjustStock.isPending}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] overflow-y-auto rounded-2xl sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Tambah Produk</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Kode Produk</Label>
                <Input value={form.product_code} onChange={(e) => setForm({ ...form, product_code: e.target.value })} placeholder="PRD-001" disabled/>
              </div>
              <div className="space-y-2">
                <Label>Nama Produk <span className="text-destructive">*</span></Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nama produk" />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Kategori <span className="text-destructive">*</span></Label>
                <Select value={form.category_id} onValueChange={(v) => setForm({ ...form, category_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Pilih kategori" /></SelectTrigger>
                  <SelectContent>
                    {categories?.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Satuan <span className="text-destructive">*</span></Label>
                <Select value={form.unit_id} onValueChange={(v) => setForm({ ...form, unit_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Pilih satuan" /></SelectTrigger>
                  <SelectContent>
                    {units?.map((u) => (
                      <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label>Harga Jual <span className="text-destructive">*</span></Label>
                <CurrencyInput value={form.selling_price} onChange={(v) => setForm({ ...form, selling_price: v })} />
              </div>
              <div className="space-y-2">
                <Label>Harga Modal <span className="text-destructive">*</span></Label>
                <CurrencyInput value={form.capital_price} onChange={(v) => setForm({ ...form, capital_price: v })} />
              </div>
              <div className="space-y-2">
                <Label>Stok Minimum</Label>
                <Input type="number" value={form.minimum_stock} onChange={(e) => setForm({ ...form, minimum_stock: Number(e.target.value) })} min={0} />
              </div>
            </div>
            <DialogFormActions
              onCancel={() => setDialogOpen(false)}
              onSave={handleSave}
              isPending={createProduct.isPending || updateProduct.isPending}
            />
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
