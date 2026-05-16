import { useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { SearchInput } from "@/components/SearchInput";
import { TableSkeleton } from "@/components/TableSkeleton";
import { DialogFormActions } from "@/components/DialogFormActions";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/format";
import { useProducts, useCreateProduct, useUpdateProduct, useCategories, useUnits, useAdjustStock, useRealtimeStock } from "@/hooks/useProducts";
import { Plus, Pencil, PackagePlus } from "lucide-react";

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
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<ProductFormData>(emptyForm);
  const [stockDialogOpen, setStockDialogOpen] = useState(false);
  const [stockProduct, setStockProduct] = useState<{ id: string; name: string; current_stock: number } | null>(null);
  const [adjustQty, setAdjustQty] = useState<number>(0);
  const [adjustType, setAdjustType] = useState<"in" | "out">("in");

  const { data: products, isLoading } = useProducts(search, categoryFilter || undefined);
  const { data: categories } = useCategories();
  const { data: units } = useUnits();
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const adjustStock = useAdjustStock();
  useRealtimeStock();

  const openCreate = () => {
    setEditId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (product: any) => {
    setEditId(product.id);
    setForm({
      product_code: product.product_code,
      name: product.name,
      category_id: product.category_id || "",
      unit_id: product.unit_id || "",
      selling_price: product.selling_price,
      capital_price: product.capital_price,
      minimum_stock: product.minimum_stock,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.product_code || !form.name) {
      toast({ title: "Kode dan nama produk wajib diisi", variant: "destructive" });
      return;
    }
    try {
      if (editId) {
        await updateProduct.mutateAsync({
          id: editId,
          ...form,
          category_id: form.category_id || null,
          unit_id: form.unit_id || null,
        });
        toast({ title: "Produk berhasil diperbarui" });
      } else {
        await createProduct.mutateAsync({
          ...form,
          category_id: form.category_id || null,
          unit_id: form.unit_id || null,
        });
        toast({ title: "Produk berhasil ditambahkan" });
      }
      setDialogOpen(false);
    } catch (error: any) {
      toast({ title: "Gagal menyimpan produk", description: error.message, variant: "destructive" });
    }
  };

  const openStockDialog = (product: any) => {
    setStockProduct({ id: product.id, name: product.name, current_stock: product.current_stock ?? 0 });
    setAdjustQty(0);
    setAdjustType("in");
    setStockDialogOpen(true);
  };

  const handleAdjustStock = async () => {
    if (!stockProduct || adjustQty <= 0) {
      toast({ title: "Jumlah penyesuaian harus lebih dari 0", variant: "destructive" });
      return;
    }
    try {
      await adjustStock.mutateAsync({ product_id: stockProduct.id, qty: adjustQty, type: adjustType });
      toast({ title: `Stok berhasil ${adjustType === "in" ? "ditambah" : "dikurangi"} sebesar ${adjustQty}` });
      setStockDialogOpen(false);
    } catch (error: any) {
      toast({ title: "Gagal menyesuaikan stok", description: error.message, variant: "destructive" });
    }
  };

  const handleToggleActive = async (id: string, currentActive: boolean) => {
    try {
      await updateProduct.mutateAsync({ id, is_active: !currentActive });
    } catch (error: any) {
      toast({ title: "Gagal mengubah status", description: error.message, variant: "destructive" });
    }
  };

  return (
    <DashboardLayout title="Manajemen Produk">
      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
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
            <Button onClick={openCreate}>
              <Plus className="mr-1 h-4 w-4" /> Tambah Produk
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Products Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Daftar Produk</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <TableSkeleton />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Kode</TableHead>
                  <TableHead>Nama</TableHead>
                  <TableHead>Kategori</TableHead>
                  <TableHead>Satuan</TableHead>
                  <TableHead className="text-right">Harga Modal</TableHead>
                  <TableHead className="text-right">Harga Jual</TableHead>
                  <TableHead className="text-right">Stok</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                      Tidak ada produk ditemukan
                    </TableCell>
                  </TableRow>
                ) : (
                  products?.map((product) => {
                    const isLowStock = product.current_stock !== undefined && product.current_stock <= product.minimum_stock;
                    return (
                      <TableRow key={product.id}>
                        <TableCell className="font-mono text-sm">{product.product_code}</TableCell>
                        <TableCell className="font-medium">{product.name}</TableCell>
                        <TableCell>{product.categories?.name || "-"}</TableCell>
                        <TableCell>{product.units?.name || "-"}</TableCell>
                        <TableCell className="text-right">{formatCurrency(product.capital_price)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(product.selling_price)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Badge
                              variant={product.current_stock !== undefined && product.current_stock <= 0 ? "destructive" : isLowStock ? "outline" : "secondary"}
                              className={isLowStock && product.current_stock !== undefined && product.current_stock > 0 ? "border-success text-success" : ""}
                            >
                              {product.current_stock ?? 0}
                            </Badge>
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openStockDialog(product)}>
                              <PackagePlus className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Switch
                            checked={product.is_active}
                            onCheckedChange={() => handleToggleActive(product.id, product.is_active)}
                          />
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" onClick={() => openEdit(product)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Stock Adjustment Dialog */}
      <Dialog open={stockDialogOpen} onOpenChange={setStockDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sesuaikan Stok — {stockProduct?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-md bg-muted px-4 py-3 text-sm">
              Stok saat ini: <span className="font-semibold">{stockProduct?.current_stock ?? 0}</span>
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
            {stockProduct && adjustQty > 0 && (
              <p className="text-sm text-muted-foreground">
                Stok setelah penyesuaian:{" "}
                <span className="font-semibold">
                  {adjustType === "in"
                    ? stockProduct.current_stock + adjustQty
                    : Math.max(0, stockProduct.current_stock - adjustQty)}
                </span>
              </p>
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editId ? "Edit Produk" : "Tambah Produk"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Kode Produk *</Label>
                <Input value={form.product_code} onChange={(e) => setForm({ ...form, product_code: e.target.value })} placeholder="PRD-001" />
              </div>
              <div className="space-y-2">
                <Label>Nama Produk *</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nama produk" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Kategori</Label>
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
                <Label>Satuan</Label>
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
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Harga Jual</Label>
                <Input type="number" value={form.selling_price} onChange={(e) => setForm({ ...form, selling_price: Number(e.target.value) })} min={0} />
              </div>
              <div className="space-y-2">
                <Label>Harga Modal</Label>
                <Input type="number" value={form.capital_price} onChange={(e) => setForm({ ...form, capital_price: Number(e.target.value) })} min={0} />
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
