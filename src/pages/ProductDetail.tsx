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
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { useAuth } from "@/hooks/useAuth";
import {
  useProductById,
  useInventoryMovements,
  useUpdateProduct,
  useDeleteProduct,
  useAdjustStock,
  useCategories,
  useUnits,
  useProductVariants,
  useCreateVariant,
  useUpdateVariant,
  useDeleteVariant,
  type ProductVariant,
} from "@/hooks/useProducts";
import {
  ArrowLeft, ArrowDownToLine, ArrowUpFromLine, PackagePlus,
  Pencil, ExternalLink, Boxes,
  Plus, Trash2, Layers, ToggleLeft, ToggleRight,
  Folder, Scale, Power, AlertTriangle,
} from "lucide-react";

interface ProductFormData {
  product_code: string;
  name: string;
  category_id: string;
  unit_id: string;
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
  const deleteProduct = useDeleteProduct();
  const adjustStock = useAdjustStock();
  const createVariant = useCreateVariant();
  const updateVariant = useUpdateVariant();
  const deleteVariant = useDeleteVariant();

  const { data: variants, isLoading: variantsLoading } = useProductVariants(
    product?.id ?? null,
    product?.store_id ?? null,
  );

  const currentStock = product?.current_stock ?? 0;
  const isLowStock = product ? currentStock <= Number(product.minimum_stock) : false;

  // Edit dialog
  const [editOpen, setEditOpen] = useState(false);
  const [form, setForm] = useState<ProductFormData>({
    product_code: "",
    name: "",
    category_id: "",
    unit_id: "",
  });

  const openEdit = () => {
    if (!product) return;
    setForm({
      product_code: product.product_code,
      name: product.name,
      category_id: product.category_id || "",
      unit_id: product.unit_id || "",
    });
    setEditOpen(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.product_code) {
      toast({ title: "Nama dan kode produk wajib diisi", variant: "destructive" });
      return;
    }

    try {
      if (!product?.id) {
        throw new Error("Produk tidak ditemukan");
      }

      await updateProduct.mutateAsync({
        id: product.id,
        name: form.name,
        product_code: form.product_code,
        category_id: form.category_id || undefined,
        unit_id: form.unit_id || undefined,
      });
      toast({ title: "Produk berhasil diperbarui" });
      setEditOpen(false);
    } catch (error: unknown) {
      toast({ title: "Gagal menyimpan produk", description: (error as Error).message, variant: "destructive" });
    }
  };

  // Stock adjust dialog
  const [stockOpen, setStockOpen] = useState(false);
  const [selectedVariantId, setSelectedVariantId] = useState<string>("");
  const [adjustQty, setAdjustQty] = useState<number | "">("");
  const [adjustType, setAdjustType] = useState<"in" | "out">("in");
  const [adjustNotes, setAdjustNotes] = useState("");
  const [adjustUnit, setAdjustUnit] = useState<"base" | string>("base");

  const openStock = () => {
    const vars = product?.variants || [];
    setSelectedVariantId(vars[0]?.id || "");
    setAdjustQty("");
    setAdjustType("in");
    setAdjustNotes("");
    setAdjustUnit("base");
    setStockOpen(true);
  };

  const handleAdjustStock = async () => {
    const qty = Number(adjustQty);
    if (!selectedVariantId || isNaN(qty) || qty <= 0) {
      toast({ title: "Jumlah penyesuaian harus lebih dari 0", variant: "destructive" });
      return;
    }
    try {
      if (!product) return;
      await adjustStock.mutateAsync({
        product_id: product.id,
        productVariantId: selectedVariantId,
        qty: qty,
        type: adjustType,
        useVariantUnit: adjustUnit !== "base",
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

  // ── Variant management ──────────────────────────────────────────────────────
  const [variantDialogOpen, setVariantDialogOpen] = useState(false);
  const [editingVariant, setEditingVariant] = useState<ProductVariant | null>(null);
  const [variantForm, setVariantForm] = useState({
    name: "",
    skuSuffix: "",
    unitId: "",
    conversionFactor: 1,
    sellingPrice: 0,
    capitalPrice: 0,
    capitalPriceVerified: false,
  });

  const openCreateVariant = () => {
    setEditingVariant(null);
    setVariantForm({
      name: "",
      skuSuffix: "",
      unitId: product?.unit_id || "",
      conversionFactor: 1,
      sellingPrice: 0,
      capitalPrice: 0,
      capitalPriceVerified: false
    });
    setVariantDialogOpen(true);
  };

  const openEditVariant = (v: ProductVariant) => {
    setEditingVariant(v);
    setVariantForm({
      name: v.name,
      skuSuffix: v.sku_suffix ?? "",
      unitId: v.unit_id,
      conversionFactor: Number(v.conversion_factor),
      sellingPrice: Number(v.selling_price),
      capitalPrice: Number(v.capital_price),
      capitalPriceVerified: v.capital_price_verified,
    });
    setVariantDialogOpen(true);
  };

  const handleSaveVariant = async () => {
    if (!variantForm.name.trim()) {
      toast({ title: "Nama varian wajib diisi", variant: "destructive" });
      return;
    }
    if (!product) return;
    try {
      const isDefault = variantForm.name.toLowerCase() === "default" || 
        (variantForm.unitId === product.unit_id && variantForm.name.toLowerCase() === (product.units?.name || "").toLowerCase());
        
      if (editingVariant) {
        await updateVariant.mutateAsync({
          id: editingVariant.id,
          productId: product.id,
          name: variantForm.name,
          skuSuffix: variantForm.skuSuffix || undefined,
          unitId: variantForm.unitId || undefined,
          conversionFactor: variantForm.conversionFactor,
          sellingPrice: variantForm.sellingPrice,
          capitalPrice: variantForm.capitalPrice,
          capitalPriceVerified: variantForm.capitalPriceVerified,
        });
        toast({ title: "Varian berhasil diperbarui" });
      } else {
        await createVariant.mutateAsync({
          productId: product.id,
          name: variantForm.name,
          skuSuffix: variantForm.skuSuffix || undefined,
          unitId: variantForm.unitId,
          conversionFactor: variantForm.conversionFactor,
          sellingPrice: variantForm.sellingPrice,
          capitalPrice: variantForm.capitalPrice,
          capitalPriceVerified: variantForm.capitalPriceVerified,
          stock: 0,
        });
        toast({ title: "Varian berhasil ditambahkan" });
      }
      setVariantDialogOpen(false);
    } catch (err: unknown) {
      toast({ title: "Gagal menyimpan varian", description: (err as Error).message, variant: "destructive" });
    }
  };

  const handleToggleVariant = async (v: ProductVariant) => {
    if (!product) return;
    try {
      if (v.is_active) {
        await updateVariant.mutateAsync({ id: v.id, productId: product.id, isActive: false });
        toast({ title: `Varian "${v.name}" dinonaktifkan` });
      } else {
        await updateVariant.mutateAsync({ id: v.id, productId: product.id, isActive: true });
        toast({ title: `Varian "${v.name}" diaktifkan kembali` });
      }
    } catch (err: unknown) {
      toast({ title: "Gagal memperbarui varian", description: (err as Error).message, variant: "destructive" });
    }
  };

  const handleDeleteVariant = async (v: ProductVariant) => {
    if (!product) return;
    if (!confirm(`Apakah Anda yakin ingin menghapus varian "${v.name}"?`)) {
      return;
    }
    try {
      await deleteVariant.mutateAsync({ id: v.id, productId: product.id });
      toast({ title: `Varian "${v.name}" berhasil dihapus` });
    } catch (err: unknown) {
      toast({ title: "Gagal menghapus varian", description: (err as Error).message, variant: "destructive" });
    }
  };

  const handleToggleCapitalPrice = async (v: ProductVariant) => {
    if (!product) return;
    try {
      await updateVariant.mutateAsync({
        id: v.id,
        productId: product.id,
        capitalPriceVerified: !v.capital_price_verified,
      });
      toast({ title: !v.capital_price_verified ? "Harga modal dikonfirmasi" : "Harga modal ditandai perlu dicek" });
    } catch (err: unknown) {
      toast({ title: "Gagal memperbarui status harga modal", description: (err as Error).message, variant: "destructive" });
    }
  };
  const handleToggleProductActive = async (newVal: boolean) => {
    if (!product?.id) return;
    try {
      await updateProduct.mutateAsync({ id: product.id, is_active: newVal });
      toast({ title: `Produk berhasil ${newVal ? "diaktifkan" : "dinonaktifkan"}` });
    } catch (err: unknown) {
      toast({ title: `Gagal ${newVal ? "mengaktifkan" : "menonaktifkan"} produk`, description: (err as Error).message, variant: "destructive" });
    }
  };

  const handleDeleteProduct = async () => {
    if (!product) return;
    if (!confirm(`Apakah Anda yakin ingin menghapus produk "${product.name}"?`)) {
      return;
    }
    try {
      await deleteProduct.mutateAsync(product.id);
      toast({ title: `Produk "${product.name}" berhasil dihapus` });
      navigate("/produk");
    } catch (err: unknown) {
      toast({ title: "Gagal menghapus produk", description: (err as Error).message, variant: "destructive" });
    }
  };

  const activeVariant = product?.variants?.find((v) => v.id === selectedVariantId);
  const activeStock = product?.current_stock ?? 0;

  const isDefaultVariant = variantForm.name.toLowerCase() === "default" || 
    (product && variantForm.unitId === product.unit_id && variantForm.name.toLowerCase() === (product.units?.name || "").toLowerCase());

  return (
    <DashboardLayout title="Detail Produk">
      <div className="space-y-5">
        {/* Header row */}
        <div className="flex items-center justify-between gap-4">
          <Button variant="ghost" size="sm" className="gap-1.5 -ml-1" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
            Kembali
          </Button>
          {!productLoading && product && isAdmin && (
            <div className="flex max-w-full flex-wrap items-center justify-end gap-2">
              {!product.is_active && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 gap-1.5 border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
                  onClick={handleDeleteProduct}
                  disabled={deleteProduct.isPending}
                >
                  <Trash2 className="h-4 w-4" />
                  <span className="hidden sm:inline">Hapus Produk</span>
                </Button>
              )}
              <Button variant="outline" size="sm" className="h-9 gap-1.5 whitespace-nowrap" onClick={openStock}>
                <PackagePlus className="h-4 w-4 shrink-0" />
                <span className="hidden sm:inline">Sesuaikan Stok</span>
              </Button>
              <Button size="sm" className="h-9 gap-1.5 whitespace-nowrap" onClick={openEdit}>
                <Pencil className="h-4 w-4 shrink-0" />
                <span className="hidden sm:inline">Edit Produk</span>
              </Button>
            </div>
          )}
        </div>

        {!productLoading && product && isLowStock && (
          <Card className="border-red-200 bg-red-50/80 dark:border-red-800 dark:bg-red-950/30">
            <CardContent className="px-5 py-3 flex items-center gap-2 text-sm font-semibold text-red-700 dark:text-red-400">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>Perhatian: Satu atau lebih varian dari produk ini memiliki stok di bawah batas minimum!</span>
            </CardContent>
          </Card>
        )}

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
              </div>
            ) : product ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div className="rounded-xl px-4 py-3 border bg-muted/50">
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
                      <Boxes className="h-3.5 w-3.5" /> Product Pool Stock
                    </p>
                    <p className={`text-sm font-bold mt-1 ${isLowStock ? "text-amber-600" : "text-foreground"}`}>
                      {product.current_stock} {product.units?.name ?? "unit"}
                    </p>
                    <p className="mt-0.5 text-[10px] text-muted-foreground">Minimum: {product.minimum_stock} {product.units?.name ?? "unit"}</p>
                  </div>
                  <div className="rounded-xl px-4 py-3 border bg-muted/50">
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
                      <Folder className="h-3.5 w-3.5" /> Kategori
                    </p>
                    <p className="text-sm font-semibold truncate mt-1">{product.categories?.name ?? "—"}</p>
                  </div>
                  <div className="rounded-xl px-4 py-3 border bg-muted/50">
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
                      <Scale className="h-3.5 w-3.5" /> Satuan Dasar
                    </p>
                    <p className="text-sm font-semibold truncate mt-1">{product.units?.name ?? "—"}</p>
                  </div>
                  <div className="rounded-xl px-4 py-3 border bg-muted/50 flex flex-col justify-between">
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Power className="h-3.5 w-3.5" /> Status Aktif
                    </p>
                    <div className="flex items-center mt-1">
                      <Switch
                        checked={product.is_active}
                        onCheckedChange={handleToggleProductActive}
                        disabled={updateProduct.isPending}
                      />
                      <span className="text-xs font-semibold ml-2">
                        {product.is_active ? "Aktif" : "Nonaktif"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>



        {/* Product Variants Card */}
        {!productLoading && product && isAdmin && (
          <Card className="border-muted/30 shadow-sm overflow-hidden bg-card/65 backdrop-blur-xl">
            <CardHeader className="px-6 pb-4 pt-6 border-b border-muted/20 bg-muted/5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Layers className="h-5 w-5 text-violet-500" />
                  Varian Produk
                  {variants && variants.length > 0 && (
                    <span className="rounded-full bg-violet-100 dark:bg-violet-950/50 text-violet-700 dark:text-violet-400 text-xs font-semibold px-2 py-0.5">
                      {variants.length}
                    </span>
                  )}
                </CardTitle>
                <Button size="sm" variant="outline" className="gap-1.5 rounded-xl" onClick={openCreateVariant}>
                  <Plus className="h-3.5 w-3.5" /> Tambah Varian
                </Button>
              </div>
            </CardHeader>
            <CardContent className="px-6 pb-5">
            {variantsLoading ? (
              <div className="space-y-2 px-4 pb-4 sm:px-6">
                {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-xl" />)}
              </div>
            ) : !variants || variants.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <Layers className="h-8 w-8 text-muted-foreground/25 mb-2" />
                  <p className="text-sm text-muted-foreground">Belum ada varian.</p>
                  <p className="text-xs text-muted-foreground/70 mt-0.5">Tambahkan varian seperti ukuran, warna, atau kemasan.</p>
                </div>
              ) : (
                <> 
                <div className="md:hidden space-y-3">
                  {variants.map((v) => (
                    <article key={v.id} className="rounded-3xl border bg-white/60 dark:bg-black/40 border-white/20 dark:border-white/10 shadow-sm backdrop-blur-xl p-4">                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2"><h3 className="truncate text-sm font-bold">{v.name}</h3><Badge variant="outline" className={`text-[10px] ${v.is_active ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-zinc-300 bg-zinc-100 text-zinc-600"}`}>{v.is_active ? "Aktif" : "Nonaktif"}</Badge></div>
                            <p className="mt-1 font-mono text-[10px] text-muted-foreground">SKU {v.sku_suffix || "—"} · Faktor {Number(v.conversion_factor)}</p>
                          </div>
                          <div className="flex shrink-0 gap-1"><Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={() => openEditVariant(v)} aria-label={`Edit varian ${v.name}`}><Pencil className="h-3.5 w-3.5" /></Button>{variants.length > 1 && <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-destructive" onClick={() => handleDeleteVariant(v)} aria-label={`Hapus varian ${v.name}`}><Trash2 className="h-3.5 w-3.5" /></Button>}</div>
                        </div>
                        <div className="mt-3 grid grid-cols-2 gap-2">
                          <div className="rounded-xl bg-muted/50 px-3 py-2"><p className="text-[10px] text-muted-foreground">Harga jual</p><p className="text-xs font-bold text-primary">{formatCurrency(Number(v.selling_price))}</p></div>
                          <div className="rounded-xl bg-muted/50 px-3 py-2"><p className="text-[10px] text-muted-foreground">Margin</p><p className="text-xs font-bold text-violet-700 dark:text-violet-400">{formatCurrency(Number(v.selling_price) - Number(v.capital_price))}</p></div>
                        </div>
                        <div className="mt-3 grid grid-cols-2 gap-2 border-t pt-3">
                          <div className={`flex min-w-0 items-center justify-between gap-2 rounded-xl border px-3 py-2.5 ${v.capital_price_verified ? "border-emerald-200/80 bg-emerald-50/60 dark:border-emerald-900/60 dark:bg-emerald-950/20" : "border-amber-200/80 bg-amber-50/60 dark:border-amber-900/60 dark:bg-amber-950/20"}`}>
                            <div className="min-w-0"><p className="text-[10px] font-bold text-foreground">Modal</p><p className={`truncate text-[10px] ${v.capital_price_verified ? "text-emerald-700" : "text-amber-700"}`}>{v.capital_price_verified ? "Terkonfirmasi" : "Perlu dicek"}</p></div>
                            <Switch checked={v.capital_price_verified} onCheckedChange={() => handleToggleCapitalPrice(v)} aria-label={`Tandai modal ${v.capital_price_verified ? "perlu dicek" : "terkonfirmasi"} untuk ${v.name}`} className="h-5 w-9 shrink-0 data-[state=checked]:bg-emerald-500 data-[state=unchecked]:bg-amber-200 dark:data-[state=unchecked]:bg-amber-900/70" />
                          </div>
                          <div className="flex min-w-0 items-center justify-between gap-2 rounded-xl border border-border/60 bg-muted/30 px-3 py-2.5">
                            <div className="min-w-0"><p className="text-[10px] font-bold text-foreground">Status</p><p className="text-[10px] text-muted-foreground">{v.is_active ? "Aktif" : "Nonaktif"}</p></div>
                            <Switch checked={v.is_active} onCheckedChange={() => handleToggleVariant(v)} aria-label={`${v.is_active ? "Nonaktifkan" : "Aktifkan"} varian ${v.name}`} className="h-5 w-9 shrink-0 data-[state=checked]:bg-primary" />
                          </div>
                        </div>
                      </article>
                  ))}
                </div>
                <div className="hidden overflow-x-auto md:block">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/30">
                        <TableHead className="text-xs">Nama Varian</TableHead>
                        <TableHead className="text-xs">SKU Suffix</TableHead>
                        <TableHead className="text-xs">Atribut</TableHead>
                        <TableHead className="text-xs text-right">Faktor Konversi</TableHead>
                        <TableHead className="text-xs text-right">Harga Jual</TableHead>
                        {isAdmin && (
                          <>
                            <TableHead className="text-xs text-right">Harga Modal</TableHead>
                            <TableHead className="text-xs text-right text-violet-700 dark:text-violet-400">Margin</TableHead>
                          </>
                        )}
                        <TableHead className="text-xs text-center">Status</TableHead>
                        <TableHead className="text-xs w-20" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {variants.map((v) => {
                        const isVariantLowStock = product.current_stock <= Number(product.minimum_stock);
                        return (
                          <TableRow
                            key={v.id}
                            className={`border-b border-muted/10 transition-colors ${
                              !v.is_active
                                ? "opacity-50"
                                : isVariantLowStock
                                ? "bg-red-50/60 hover:bg-red-100/60 dark:bg-red-950/25 dark:hover:bg-red-950/35 border-l-2 border-l-red-500"
                                : ""
                            }`}
                          >
                            <TableCell className="font-semibold text-sm">{v.name}</TableCell>
                            <TableCell className="font-mono text-xs text-muted-foreground">{v.sku_suffix ?? "—"}</TableCell>
                            <TableCell className="text-xs text-muted-foreground">{Number(v.conversion_factor)}</TableCell>
                            <TableCell className="text-right text-sm tabular-nums">
                              {Number(v.conversion_factor)}
                            </TableCell>
                            <TableCell className="text-right text-sm font-bold text-primary">
                              {formatCurrency(Number(v.selling_price))}
                            </TableCell>
                            {isAdmin && (
                              <>
                                <TableCell className="text-center">
                              <div className="flex items-center justify-center gap-2">
                                <span className={`text-[10px] font-semibold ${v.capital_price_verified ? "text-emerald-700" : "text-amber-700"}`}>{v.capital_price_verified ? "Terkonfirmasi" : "Perlu dicek"}</span>
                                <Switch checked={v.capital_price_verified} onCheckedChange={() => handleToggleCapitalPrice(v)} aria-label={`Tandai modal ${v.capital_price_verified ? "perlu dicek" : "terkonfirmasi"} untuk ${v.name}`} />
                              </div>
                            </TableCell>
                                <TableCell className="text-right text-sm font-semibold text-violet-700 dark:text-violet-400">
                                  {formatCurrency(Number(v.selling_price) - Number(v.capital_price))}
                                </TableCell>
                              </>
                            )}
                            <TableCell className="text-center">
                              <Badge
                                variant="outline"
                                className={`text-xs cursor-pointer select-none ${
                                  v.is_active
                                    ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 hover:text-emerald-800"
                                    : "bg-red-50 text-red-700 border-red-200 hover:bg-red-100 hover:text-red-800"
                                } transition-colors`}
                                onClick={() => handleToggleVariant(v)}
                                title={v.is_active ? "Klik untuk nonaktifkan" : "Klik untuk aktifkan"}
                              >
                                {v.is_active ? (
                                  <><ToggleRight className="h-3 w-3 mr-1" />Aktif</>
                                ) : (
                                  <><ToggleLeft className="h-3 w-3 mr-1" />Nonaktif</>
                                )}
                              </Badge>
                            </TableCell>
                            <TableCell className="flex items-center gap-1 justify-end">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => openEditVariant(v)}
                                title="Edit varian"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              {variants.length > 1 && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                                  onClick={() => handleDeleteVariant(v)}
                                  title="Hapus varian"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* Inventory movements table */}
        <Card className="border-muted/30 shadow-sm overflow-hidden bg-card/65 backdrop-blur-xl mb-6">
          <CardHeader className="px-6 pb-4 pt-6 border-b border-muted/20 bg-muted/5">
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
              <>
                <div className="space-y-3 px-4 md:hidden pb-4">
                  {movements.map((m) => (
                    <article key={m.id} className={`rounded-3xl border shadow-sm backdrop-blur-xl p-4 ${m.qty_in > 0 ? "border-emerald-200/50 bg-emerald-50/60 dark:border-emerald-900/50 dark:bg-emerald-950/40" : "border-rose-200/50 bg-rose-50/60 dark:border-rose-900/50 dark:bg-rose-950/40"}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div><MovementTypeBadge type={m.movement_type} /><p className="mt-1 text-xs text-muted-foreground">{formatDateTime(m.created_at)}</p></div>
                        <span className="text-sm font-bold">Stok {m.stockAfter}</span>
                      </div>
                      <div className="mt-2 flex items-center justify-between text-xs"><span className="truncate text-muted-foreground">{m.notes || m.reference_id || "Tanpa catatan"}</span><span className={m.qty_in > 0 ? "font-bold text-emerald-600" : "font-bold text-rose-600"}>{m.qty_in > 0 ? `+${m.qty_in}` : `-${m.qty_out}`}</span></div>
                    </article>
                  ))}
                </div>
                <div className="hidden overflow-x-auto md:block">
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
              </>
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
              <span className="text-sm text-muted-foreground">Stok pool saat ini</span>
              <span className="text-2xl font-bold tabular-nums">{activeStock}</span>
            </div>
            <div className="space-y-2">
              <Label>Unit penyesuaian</Label>
              <Select value={adjustUnit} onValueChange={(value) => { setAdjustUnit(value); setSelectedVariantId(value === "base" ? (product?.variants?.[0]?.id || "") : value); setAdjustQty(""); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent className="max-h-60 overflow-y-auto">
                  <SelectItem value="base">{product?.units?.name || "Unit dasar"} — langsung ke pool</SelectItem>
                  {product?.variants?.filter((v) => v.is_active).map((v) => <SelectItem key={v.id} value={v.id}>{v.name} — 1 unit = ×{Number(v.conversion_factor)} {product?.units?.name || "dasar"}</SelectItem>)}
                </SelectContent>
              </Select>
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
              <Label>Jumlah ({adjustUnit === "base" ? (product?.units?.name || "unit dasar") : product?.variants?.find((v) => v.id === adjustUnit)?.name})</Label>
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
              <div className="space-y-2 rounded-xl bg-muted/60 px-4 py-3">
                <div className="flex items-center justify-between text-sm"><span className="text-muted-foreground">Konversi ke pool</span><span className="font-bold">{adjustQty} × {adjustUnit === "base" ? 1 : Number(product?.variants?.find((v) => v.id === adjustUnit)?.conversion_factor || 1)} = {adjustQty * (adjustUnit === "base" ? 1 : Number(product?.variants?.find((v) => v.id === adjustUnit)?.conversion_factor || 1))} {product?.units?.name || "unit"}</span></div>
                <div className="flex items-center justify-between border-t pt-2"><span className="text-sm text-muted-foreground">Stok setelah</span><span className={`text-2xl font-bold tabular-nums ${adjustType === "in" ? "text-green-600" : "text-red-600"}`}>{adjustType === "in" ? activeStock + adjustQty * (adjustUnit === "base" ? 1 : Number(product?.variants?.find((v) => v.id === adjustUnit)?.conversion_factor || 1)) : Math.max(0, activeStock - adjustQty * (adjustUnit === "base" ? 1 : Number(product?.variants?.find((v) => v.id === adjustUnit)?.conversion_factor || 1)))}</span></div>
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
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Produk</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Kode Produk</Label>
              <Input value={form.product_code} onChange={(e) => setForm({ ...form, product_code: e.target.value })} placeholder="Kode produk" disabled />
            </div>
            <div className="space-y-2">
              <Label>Nama Produk <span className="text-destructive">*</span></Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nama produk" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Kategori <span className="text-destructive">*</span></Label>
                <Select value={form.category_id} onValueChange={(v) => setForm({ ...form, category_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Pilih kategori" /></SelectTrigger>
                  <SelectContent className="max-h-60 overflow-y-auto">
                    {categories?.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Satuan Dasar <span className="text-destructive">*</span></Label>
                <Select value={form.unit_id} onValueChange={(v) => setForm({ ...form, unit_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Pilih satuan dasar" /></SelectTrigger>
                  <SelectContent className="max-h-60 overflow-y-auto">
                    {units?.map((u) => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
                  </SelectContent>
                </Select>
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

      {/* Create / Edit Variant Dialog */}
      <Dialog open={variantDialogOpen} onOpenChange={setVariantDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingVariant ? "Edit Varian" : "Tambah Varian Baru"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nama Varian <span className="text-destructive">*</span></Label>
                <Input
                  value={variantForm.name}
                  onChange={(e) => setVariantForm({ ...variantForm, name: e.target.value })}
                  placeholder="cth: Small, Merah, 500ml"
                />
              </div>
              <div className="space-y-2">
                <Label>SKU Suffix <span className="text-muted-foreground font-normal">(opsional)</span></Label>
                <Input
                  value={variantForm.skuSuffix}
                  onChange={(e) => setVariantForm({ ...variantForm, skuSuffix: e.target.value })}
                  placeholder="cth: -SM"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Satuan mengikuti produk</Label>
                <Input value={product?.units?.name || ""} readOnly className="bg-muted" />
              </div>
              <div className="space-y-2">
                <Label>Faktor Konversi <span className="text-destructive">*</span></Label>
                <Input
                  type="number"
                  min={1}
                  value={variantForm.conversionFactor === 0 ? "" : variantForm.conversionFactor}
                  onChange={(e) => setVariantForm({ ...variantForm, conversionFactor: e.target.value === "" ? 0 : Number(e.target.value) })}
                  placeholder="1"
                />
              </div>
            </div>
            <Separator />
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Harga Varian</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Harga Jual</Label>
                <CurrencyInput value={variantForm.sellingPrice} onChange={(v) => setVariantForm({ ...variantForm, sellingPrice: v })} />
              </div>
              <div className="space-y-2">
                <Label>Harga Modal</Label>
                <CurrencyInput value={variantForm.capitalPrice} onChange={(v) => setVariantForm({ ...variantForm, capitalPrice: v })} />
              </div>
            </div>
            <DialogFormActions
              onCancel={() => setVariantDialogOpen(false)}
              onSave={handleSaveVariant}
              isPending={createVariant.isPending || updateVariant.isPending}
            />
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
