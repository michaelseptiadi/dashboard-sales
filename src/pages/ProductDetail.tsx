import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { CurrencyInput } from "@/components/ui/currency-input";
import { DialogFormActions } from "@/components/DialogFormActions";
import { SalesOrderDetailDialog } from "@/components/SalesOrderDetailDialog";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { useAuth } from "@/hooks/useAuth";
import {
  useProductById,
  useInventoryMovements,
  useUpdateProduct,
  useAdjustStock,
  useCategories,
  useUnits,
} from "@/hooks/useProducts";
import {
  ArrowLeft, ArrowDownToLine, ArrowUpFromLine, PackagePlus,
  Pencil, ExternalLink, Tag, Boxes, TrendingUp, Package2,
} from "lucide-react";

interface ProductFormData {
  product_code: string;
  name: string;
  category_id: string;
  unit_id: string;
  selling_price: number;
  capital_price: number;
  minimum_stock: number;
}

const MOVEMENT_TYPE_CONFIG: Record<string, { label: string; className: string }> = {
  sale:       { label: "Penjualan",    className: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-400" },
  adjustment: { label: "Penyesuaian", className: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-400" },
};

function MovementTypeBadge({ type }: { type: string }) {
  const cfg = MOVEMENT_TYPE_CONFIG[type] ?? { label: type, className: "bg-slate-100 text-slate-600 border-slate-200" };
  return (
    <Badge variant="outline" className={`text-xs font-medium ${cfg.className}`}>
      {cfg.label}
    </Badge>
  );
}

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { currentRole, isSuperAdmin } = useAuth();
  const isAdmin = isSuperAdmin || currentRole === "admin";

  const { data: product, isLoading: productLoading } = useProductById(id ?? null);
  const { data: movements, isLoading: movementsLoading } = useInventoryMovements(id ?? null);
  const { data: categories } = useCategories();
  const { data: units } = useUnits();
  const updateProduct = useUpdateProduct();
  const adjustStock = useAdjustStock();

  const currentStock = product?.current_stock ?? 0;
  const isLowStock = product ? currentStock <= (product.minimum_stock ?? 0) : false;

  // Edit dialog
  const [editOpen, setEditOpen] = useState(false);
  const [form, setForm] = useState<ProductFormData>({
    product_code: "", name: "", category_id: "", unit_id: "",
    selling_price: 0, capital_price: 0, minimum_stock: 0,
  });

  const openEdit = () => {
    if (!product) return;
    setForm({
      product_code: product.product_code,
      name: product.name,
      category_id: product.category_id || "",
      unit_id: product.unit_id || "",
      selling_price: product.selling_price,
      capital_price: product.capital_price,
      minimum_stock: product.minimum_stock,
    });
    setEditOpen(true);
  };

  const handleSave = async () => {
    if (!form.selling_price || !form.capital_price) {
      toast({ title: "Semua field wajib diisi", variant: "destructive" });
      return;
    }
    try {
      if (!product?.store_product_id) {
        throw new Error("Store product tidak ditemukan");
      }

      await updateProduct.mutateAsync({
        id: product.store_product_id,
        selling_price: form.selling_price,
        capital_price: form.capital_price,
        minimum_stock: form.minimum_stock,
      });
      toast({ title: "Produk berhasil diperbarui" });
      setEditOpen(false);
    } catch (error: unknown) {
      toast({ title: "Gagal menyimpan produk", description: (error as Error).message, variant: "destructive" });
    }
  };

  // Stock adjust dialog
  const [stockOpen, setStockOpen] = useState(false);
  const [adjustQty, setAdjustQty] = useState<number | "">("");
  const [adjustType, setAdjustType] = useState<"in" | "out">("in");
  const [adjustNotes, setAdjustNotes] = useState("");

  const openStock = () => {
    setAdjustQty("");
    setAdjustType("in");
    setAdjustNotes("");
    setStockOpen(true);
  };

  const handleAdjustStock = async () => {
    const qty = Number(adjustQty);
    if (isNaN(qty) || qty <= 0) {
      toast({ title: "Jumlah penyesuaian harus lebih dari 0", variant: "destructive" });
      return;
    }
    try {
      if (!product) return;
      await adjustStock.mutateAsync({
        product_id: product.id,
        qty: qty,
        type: adjustType,
        notes: adjustNotes || undefined,
        storeProductId: id,
      });
      toast({ title: `Stok berhasil ${adjustType === "in" ? "ditambah" : "dikurangi"} sebesar ${qty}` });
      setStockOpen(false);
    } catch (error: unknown) {
      toast({ title: "Gagal menyesuaikan stok", description: (error as Error).message, variant: "destructive" });
    }
  };

  // Transaction detail
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  return (
    <DashboardLayout title="Detail Produk">
      <div className="space-y-5">
        {/* Header row */}
        <div className="flex items-center justify-between gap-4">
          <Button variant="ghost" size="sm" className="gap-1.5 -ml-1" onClick={() => navigate("/produk")}>
            <ArrowLeft className="h-4 w-4" />
            Kembali ke Produk
          </Button>
          {!productLoading && product && isAdmin && (
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="gap-1.5" onClick={openStock}>
                <PackagePlus className="h-4 w-4" />
                Sesuaikan Stok
              </Button>
              <Button size="sm" className="gap-1.5" onClick={openEdit}>
                <Pencil className="h-4 w-4" />
                Edit Produk
              </Button>
            </div>
          )}
        </div>

        {/* Product info card */}
        <Card>
          <CardHeader className="px-6 pb-3 pt-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                {productLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-5 w-48" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                ) : (
                  <>
                    <CardTitle className="text-lg">{product?.name}</CardTitle>
                    <p className="mt-0.5 font-mono text-sm text-muted-foreground">{product?.product_code}</p>
                  </>
                )}
              </div>
              {!productLoading && product && (
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
              )}
            </div>
          </CardHeader>
          <CardContent className="px-6 pb-5">
            {productLoading ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-20 w-full rounded-xl" />
                  ))}
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-8 w-full" />
                  ))}
                </div>
              </div>
            ) : product ? (
              <div className="space-y-4">
                {/* Key metric tiles */}
                <div className={`grid grid-cols-2 gap-3 ${isAdmin ? "sm:grid-cols-4" : "sm:grid-cols-2"}`}>
                  <div className={`rounded-xl px-4 py-3 border ${
                    isLowStock
                      ? "bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-800"
                      : "bg-green-50 border-green-200 dark:bg-green-950/30 dark:border-green-800"
                  }`}>
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
                      <Boxes className="h-3 w-3" /> Stok Sekarang
                    </p>
                    <p className={`text-2xl font-bold tabular-nums ${
                      isLowStock ? "text-red-700 dark:text-red-400" : "text-green-700 dark:text-green-400"
                    }`}>{currentStock}</p>
                    {isLowStock && (
                      <p className="text-[10px] text-red-500 dark:text-red-400 mt-0.5">Min. {product.minimum_stock}</p>
                    )}
                  </div>
                  <div className="rounded-xl px-4 py-3 border bg-muted/50">
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
                      <Tag className="h-3 w-3" /> Harga Jual
                    </p>
                    <p className="text-base font-bold leading-tight">{formatCurrency(product.selling_price)}</p>
                  </div>
                  {isAdmin && (
                    <>
                      <div className="rounded-xl px-4 py-3 border bg-muted/50">
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
                          <TrendingUp className="h-3 w-3" /> Harga Modal
                        </p>
                        <p className="text-base font-bold leading-tight">{formatCurrency(product.capital_price)}</p>
                      </div>
                      <div className="rounded-xl px-4 py-3 border bg-violet-50 border-violet-200 dark:bg-violet-950/30 dark:border-violet-800">
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
                          <Package2 className="h-3 w-3" /> Margin
                        </p>
                        <p className="text-base font-bold leading-tight text-violet-700 dark:text-violet-400">
                          {formatCurrency(product.selling_price - product.capital_price)}
                        </p>
                      </div>
                    </>
                  )}
                </div>
                <Separator />
                {/* Secondary details */}
                <div className="grid grid-cols-3 gap-x-6 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Kategori</p>
                    <p className="font-medium">{product.categories?.name ?? "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Satuan</p>
                    <p className="font-medium">{product.units?.name ?? "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Stok Minimum</p>
                    <p className="font-medium">{product.minimum_stock}</p>
                  </div>
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>

        {/* Inventory movements table */}
        <Card>
          <CardHeader className="px-6 pb-3 pt-5">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Riwayat Pergerakan Stok</CardTitle>
              {movements && movements.length > 0 && (
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1 text-xs font-medium text-green-600 dark:text-green-400">
                    <ArrowDownToLine className="h-3 w-3" />
                    {movements.reduce((s, m) => s + m.qty_in, 0)} masuk
                  </span>
                  <span className="flex items-center gap-1 text-xs font-medium text-red-600 dark:text-red-400">
                    <ArrowUpFromLine className="h-3 w-3" />
                    {movements.reduce((s, m) => s + m.qty_out, 0)} keluar
                  </span>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                    {movements.length} entri
                  </span>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="px-0 pb-0">
            {movementsLoading ? (
              <div className="space-y-2 px-6 pb-6">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : !movements || movements.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <PackagePlus className="h-10 w-10 text-muted-foreground/30 mb-3" />
                <p className="text-sm font-medium text-muted-foreground">Belum ada pergerakan stok</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-t bg-muted/30">
                      <TableHead className="pl-6 text-xs">Tanggal & Waktu</TableHead>
                      <TableHead className="text-xs">Tipe</TableHead>
                      <TableHead className="text-xs">Catatan</TableHead>
                      <TableHead className="text-xs text-right text-green-700 dark:text-green-400">Masuk</TableHead>
                      <TableHead className="text-xs text-right text-red-600 dark:text-red-400">Keluar</TableHead>
                      <TableHead className="text-xs text-right">Stok</TableHead>
                      <TableHead className="pr-6 text-xs">Referensi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {movements.map((m) => (
                      <TableRow
                        key={m.id}
                        className={m.qty_in > 0 ? "bg-green-50/40 dark:bg-green-950/10" : "bg-red-50/40 dark:bg-red-950/10"}
                      >
                        <TableCell className="pl-6 text-sm text-muted-foreground whitespace-nowrap">
                          {formatDateTime(m.created_at)}
                        </TableCell>
                        <TableCell>
                          <MovementTypeBadge type={m.movement_type} />
                        </TableCell>
                        <TableCell className="max-w-[180px]">
                          {m.notes ? (
                            <p className="text-xs text-muted-foreground leading-snug truncate" title={m.notes}>{m.notes}</p>
                          ) : (
                            <span className="text-xs text-muted-foreground/30">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {m.qty_in > 0 ? (
                            <span className="flex items-center justify-end gap-1 text-sm font-medium text-green-600 dark:text-green-400">
                              <ArrowDownToLine className="h-3.5 w-3.5" />
                              {m.qty_in}
                            </span>
                          ) : (
                            <span className="text-sm text-muted-foreground/40">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {m.qty_out > 0 ? (
                            <span className="flex items-center justify-end gap-1 text-sm font-medium text-red-600 dark:text-red-400">
                              <ArrowUpFromLine className="h-3.5 w-3.5" />
                              {m.qty_out}
                            </span>
                          ) : (
                            <span className="text-sm text-muted-foreground/40">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="text-sm font-semibold tabular-nums">{m.stockAfter}</span>
                        </TableCell>
                        <TableCell className="pr-6">
                          {m.invoiceNumber ? (
                            <button
                              onClick={() => setSelectedOrderId(m.reference_id!)}
                              className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 hover:underline dark:text-blue-400 font-medium"
                            >
                              {m.invoiceNumber}
                              <ExternalLink className="h-3 w-3 shrink-0" />
                            </button>
                          ) : m.reference_id ? (
                            <span className="font-mono text-xs text-muted-foreground">{m.reference_id.slice(0, 8)}…</span>
                          ) : (
                            <span className="text-sm text-muted-foreground/40">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Transaction Detail Dialog */}
      <SalesOrderDetailDialog orderId={selectedOrderId} onClose={() => setSelectedOrderId(null)} />

      {/* Stock Adjustment Dialog */}
      <Dialog open={stockOpen} onOpenChange={setStockOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base">Sesuaikan Stok</DialogTitle>
            <p className="text-sm text-muted-foreground">{product?.name}</p>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-xl bg-muted/60 px-4 py-3">
              <span className="text-sm text-muted-foreground">Stok saat ini</span>
              <span className="text-2xl font-bold tabular-nums">{currentStock}</span>
            </div>
            <div className="space-y-2">
              <Label>Jenis Penyesuaian</Label>
              <Select value={adjustType} onValueChange={(v) => setAdjustType(v as "in" | "out")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
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
            {typeof adjustQty === "number" && adjustQty > 0 && (
              <div className="flex items-center justify-between rounded-xl bg-muted/60 px-4 py-3">
                <span className="text-sm text-muted-foreground">Stok setelah</span>
                <span className={`text-2xl font-bold tabular-nums ${adjustType === "in" ? "text-green-600" : "text-red-600"}`}>
                  {adjustType === "in" ? currentStock + adjustQty : Math.max(0, currentStock - adjustQty)}
                </span>
              </div>
            )}
            <DialogFormActions
              onCancel={() => setStockOpen(false)}
              onSave={handleAdjustStock}
              isPending={adjustStock.isPending}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Product Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Produk</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Kode Produk</Label>
                <Input value={form.product_code} disabled />
              </div>
              <div className="space-y-2">
                <Label>Nama Produk <span className="text-destructive">*</span></Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nama produk" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Kategori <span className="text-destructive">*</span></Label>
                <Select value={form.category_id} onValueChange={(v) => setForm({ ...form, category_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Pilih kategori" /></SelectTrigger>
                  <SelectContent>
                    {categories?.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Satuan <span className="text-destructive">*</span></Label>
                <Select value={form.unit_id} onValueChange={(v) => setForm({ ...form, unit_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Pilih satuan" /></SelectTrigger>
                  <SelectContent>
                    {units?.map((u) => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
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
              onCancel={() => setEditOpen(false)}
              onSave={handleSave}
              isPending={updateProduct.isPending}
            />
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
