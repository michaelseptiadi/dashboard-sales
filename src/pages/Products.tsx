import { useEffect, useState } from "react";
import { TablePagination } from "@/components/TablePagination";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { SearchInput } from "@/components/SearchInput";
import { TableSkeleton } from "@/components/TableSkeleton";
import { DialogFormActions } from "@/components/DialogFormActions";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/format";
import {
  useProducts,
  useUpdateProduct,
  useCategories,
  useAdjustStock,
  useRealtimeStock,
  useLowStockProducts,
} from "@/hooks/useProducts";
import { useDebounce } from "@/hooks/useDebounce";
import { Plus, PackagePlus, AlertTriangle, Eye, TrendingUp } from "lucide-react";
import { AddProductDialog } from "@/components/AddProductDialog";

export default function Products() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 500);
  const [categoryFilter, setCategoryFilter] = useState<string>("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [stockDialogOpen, setStockDialogOpen] = useState(false);
  const [stockProduct, setStockProduct] = useState<{ id: string; name: string; current_stock: number } | null>(null);
  const [adjustQty, setAdjustQty] = useState<number>(0);
  const [adjustType, setAdjustType] = useState<"in" | "out">("in");
  const [adjustNotes, setAdjustNotes] = useState("");

  const { data: productsResponse, isLoading } = useProducts(debouncedSearch, categoryFilter || undefined, page, limit);
  const { data: lowStockItems } = useLowStockProducts();
  const { data: categories } = useCategories();
  const updateProduct = useUpdateProduct();
  const adjustStock = useAdjustStock();
  useRealtimeStock();

  const products = productsResponse?.data ?? [];
  const productsMeta = productsResponse?.meta;

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, categoryFilter, limit]);

  const openCreate = () => {
    setDialogOpen(true);
  };

  const openStockDialog = (product: any) => {
    setStockProduct({ id: product.id, name: product.name, current_stock: product.current_stock ?? 0 });
    setAdjustQty(0);
    setAdjustType("in");
    setAdjustNotes("");
    setStockDialogOpen(true);
  };

  const handleAdjustStock = async () => {
    if (!stockProduct || adjustQty <= 0) {
      toast({ title: "Jumlah penyesuaian harus lebih dari 0", variant: "destructive" });
      return;
    }
    try {
      await adjustStock.mutateAsync({ product_id: stockProduct.id, qty: adjustQty, type: adjustType, notes: adjustNotes || undefined });
      toast({ title: `Stok berhasil ${adjustType === "in" ? "ditambah" : "dikurangi"} sebesar ${adjustQty}` });
      setStockDialogOpen(false);
    } catch (error: any) {
      toast({ title: "Gagal menyesuaikan stok", description: error.message, variant: "destructive" });
    }
  };

  return (
    <DashboardLayout title="Manajemen Produk">
      {/* Low stock alert */}
      {lowStockItems && lowStockItems.length > 0 && (
        <Card className="mb-5 border-red-200 bg-red-50/80 dark:border-red-800 dark:bg-red-950/30">
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
      {/* Products Table */}
      <Card>
        <CardHeader className="px-6 pb-4 pt-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2.5">
              <CardTitle className="text-base">Daftar Produk</CardTitle>
              {productsMeta && (
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                  {productsMeta.total}
                </span>
              )}
            </div>
            <Button size="sm" onClick={openCreate}>
              <Plus className="mr-1.5 h-4 w-4" /> Tambah Produk
            </Button>
          </div>
          <div className="flex flex-wrap gap-3 pt-1">
            <SearchInput
              containerClassName="flex-1 min-w-[200px]"
              placeholder="Cari nama atau kode produk..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Select value={categoryFilter || "all"} onValueChange={(v) => setCategoryFilter(v === "all" ? "" : v)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Semua Kategori" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Kategori</SelectItem>
                {categories?.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

          </div>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          {isLoading ? (
            <div className="px-6 pb-6"><TableSkeleton /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-t bg-muted/30">
                  <TableHead className="pl-6 text-xs font-semibold text-foreground">Produk</TableHead>
                  <TableHead className="text-xs font-semibold text-foreground">Kategori</TableHead>
                  <TableHead className="text-right text-xs font-semibold text-foreground">Harga Modal</TableHead>
                  <TableHead className="text-right text-xs font-semibold text-foreground">Harga Jual</TableHead>
                  <TableHead className="text-right text-xs font-semibold text-foreground">Estimasi Laba / Margin</TableHead>
                  <TableHead className="text-right text-xs font-semibold text-foreground">Stok</TableHead>
                  <TableHead className="w-24 pr-6 text-right text-xs font-semibold text-foreground">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-16 text-center text-muted-foreground">
                      <PackagePlus className="mx-auto mb-2 h-8 w-8 opacity-25" />
                      <p className="text-sm">Tidak ada produk ditemukan</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  products.map((product) => {
                    const isLowStock = product.current_stock !== undefined && product.current_stock <= product.minimum_stock;
                    const profit = product.selling_price - product.capital_price;
                    const marginPercent = product.selling_price > 0 ? Math.round((profit / product.selling_price) * 100) : 0;

                    return (
                      <TableRow
                        key={product.id}
                        className={`group transition-colors ${isLowStock
                          ? "bg-red-100/70 hover:bg-red-100 dark:bg-red-950/10 dark:hover:bg-red-950/20"
                          : "hover:bg-muted/40"
                          }`}
                      >
                        {/* Product Detail */}
                        <TableCell className="pl-6 py-3.5">
                          <div className="flex flex-col gap-0.5">
                            <span className="font-semibold text-sm text-foreground leading-none">{product.name}</span>
                            <div className="flex items-center gap-1.5 mt-1.5">
                              <span className="font-mono text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded leading-none">
                                {product.product_code}
                              </span>
                              {product.units?.name && (
                                <span className="text-[11px] text-muted-foreground leading-none">
                                  per {product.units.name}
                                </span>
                              )}
                            </div>
                          </div>
                        </TableCell>

                        {/* Category Badge */}
                        <TableCell className="py-3.5">
                          <Badge variant="secondary" className="font-normal bg-indigo-50/80 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900 px-2 py-0.5">
                            {product.categories?.name || "Umum"}
                          </Badge>
                        </TableCell>

                        {/* Capital Price */}
                        <TableCell className="text-right py-3.5 text-sm text-muted-foreground">
                          {formatCurrency(product.capital_price)}
                        </TableCell>

                        {/* Selling Price */}
                        <TableCell className="text-right py-3.5 text-sm font-medium">
                          {formatCurrency(product.selling_price)}
                        </TableCell>

                        {/* Estimated Profit Margin */}
                        <TableCell className="text-right py-3.5">
                          <div className="flex flex-col items-end gap-1">
                            <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 leading-none">
                              +{formatCurrency(profit)}
                            </span>
                            <span className="text-[10px] font-medium text-emerald-700 dark:text-emerald-300 flex items-center gap-0.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/60 px-1.5 py-0.5 rounded-full leading-none">
                              <TrendingUp className="h-3 w-3 text-emerald-500" /> {marginPercent}% Margin
                            </span>
                          </div>
                        </TableCell>

                        {/* Stock status */}
                        <TableCell className="text-right py-3.5">
                          <div className="flex items-center justify-end gap-1.5">
                            <Badge
                              className={`font-semibold px-2.5 py-0.5 rounded-full ${isLowStock
                                ? "bg-red-300 text-red-700 border-red-300 hover:bg-red-100"
                                : "bg-green-100 text-green-700 border-green-300 hover:bg-green-100"
                                }`}
                            >
                              {product.current_stock ?? 0}
                            </Badge>
                          </div>
                        </TableCell>

                        {/* Row Actions */}
                        <TableCell className="pr-6 py-3.5">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 hover:bg-muted"
                              title="Sesuaikan Stok"
                              onClick={() => openStockDialog(product)}
                            >
                              <PackagePlus className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 hover:bg-muted"
                              title="Lihat detail"
                              onClick={() => navigate(`/produk/${product.store_product_id}`)}
                            >
                              <Eye className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          )}
          {productsMeta && productsMeta.total > 0 && (
            <TablePagination
              currentPage={productsMeta.page}
              totalPages={productsMeta.totalPages}
              onPageChange={setPage}
              startIndex={(productsMeta.page - 1) * productsMeta.limit + (products.length > 0 ? 1 : 0)}
              endIndex={(productsMeta.page - 1) * productsMeta.limit + products.length}
              totalCount={productsMeta.total}
              pageSize={limit}
              onPageSizeChange={(size) => setLimit(size)}
            />
          )}
        </CardContent>
      </Card>

      {/* Stock Adjustment Dialog */}
      <Dialog open={stockDialogOpen} onOpenChange={setStockDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base">Sesuaikan Stok</DialogTitle>
            <p className="text-sm text-muted-foreground">{stockProduct?.name}</p>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-xl bg-muted/60 px-4 py-3">
              <span className="text-sm text-muted-foreground">Stok saat ini</span>
              <span className="text-2xl font-bold tabular-nums">{stockProduct?.current_stock ?? 0}</span>
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
                onChange={(e) => setAdjustQty(Number(e.target.value))}
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
            {stockProduct && adjustQty > 0 && (
              <div className="flex items-center justify-between rounded-xl bg-muted/60 px-4 py-3">
                <span className="text-sm text-muted-foreground">Stok setelah</span>
                <span className={`text-2xl font-bold tabular-nums ${adjustType === "in" ? "text-green-600" : "text-red-600"
                  }`}>
                  {adjustType === "in"
                    ? stockProduct.current_stock + adjustQty
                    : Math.max(0, stockProduct.current_stock - adjustQty)}
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
      <AddProductDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </DashboardLayout>
  );
}
