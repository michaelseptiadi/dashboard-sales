import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SearchInput } from "@/components/SearchInput";
import { CurrencyInput } from "@/components/ui/currency-input";
import { DialogFormActions } from "@/components/DialogFormActions";
import { TablePagination } from "@/components/TablePagination";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useDebounce } from "@/hooks/useDebounce";
import {
  useGlobalProducts,
  useAddStoreProduct,
  useCreateProduct,
  useCategories,
  useUnits,
  useCreateCategory,
  useCreateUnit,
  GlobalProduct
} from "@/hooks/useProducts";
import { Plus, Check, ArrowLeft } from "lucide-react";

interface AddProductDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ProductFormData {
  product_code: string;
  name: string;
  category_id: string;
  unit_id: string;
  selling_price: number;
  capital_price: number;
  minimum_stock: number;
  stock: number;
}

const emptyForm: ProductFormData = {
  product_code: "",
  name: "",
  category_id: "",
  unit_id: "",
  selling_price: 0,
  capital_price: 0,
  minimum_stock: 0,
  stock: 0,
};

export function AddProductDialog({ open, onOpenChange }: AddProductDialogProps) {
  const { toast } = useToast();
  const { selectedStore } = useAuth();
  const storeId = selectedStore?.id;

  // Step states: "list" | "select-existing" | "create-new"
  const [step, setStep] = useState<"list" | "select-existing" | "create-new">("list");
  const [selectedProduct, setSelectedProduct] = useState<GlobalProduct | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 500);

  // Pagination states for global products list
  const [globalPage, setGlobalPage] = useState(1);
  const [globalLimit, setGlobalLimit] = useState(10);

  // Forms
  const [existingForm, setExistingForm] = useState({
    selling_price: 0,
    capital_price: 0,
    minimum_stock: 0,
    stock: 0,
  });
  const [newProductForm, setNewProductForm] = useState<ProductFormData>(emptyForm);

  // Sub-dialog states for inline Category/Unit creation
  const [subDialogType, setSubDialogType] = useState<"category" | "unit" | null>(null);
  const [subInputValue, setSubInputValue] = useState("");

  // Queries & mutations
  const { data: paginatedGlobals, isLoading: loadingGlobals } = useGlobalProducts(
    debouncedSearch,
    globalPage,
    globalLimit
  );
  const { data: categories } = useCategories();
  const { data: units } = useUnits();

  const addStoreProduct = useAddStoreProduct();
  const createProduct = useCreateProduct();
  const createCategory = useCreateCategory();
  const createUnit = useCreateUnit();

  // Reset page on search change
  useEffect(() => {
    setGlobalPage(1);
  }, [debouncedSearch]);

  // Reset state on dialog open/close
  useEffect(() => {
    if (open) {
      setStep("list");
      setSelectedProduct(null);
      setSearchQuery("");
      setGlobalPage(1);
      setExistingForm({ selling_price: 0, capital_price: 0, minimum_stock: 0, stock: 0 });
      setNewProductForm({ ...emptyForm, product_code: "" });
    }
  }, [open]);

  const handleSaveExisting = async () => {
    if (!selectedProduct) return;
    if (!existingForm.selling_price || !existingForm.capital_price) {
      toast({ title: "Harga jual dan harga modal wajib diisi", variant: "destructive" });
      return;
    }
    try {
      await addStoreProduct.mutateAsync({
        productId: selectedProduct.id,
        sellingPrice: existingForm.selling_price,
        capitalPrice: existingForm.capital_price,
        minStock: existingForm.minimum_stock,
        stock: existingForm.stock,
      });
      toast({ title: "Produk berhasil ditambahkan ke toko" });
      onOpenChange(false);
    } catch (error: any) {
      toast({ title: "Gagal menambahkan produk", description: error.message, variant: "destructive" });
    }
  };

  const handleCreateNew = async () => {
    if (!newProductForm.name || !newProductForm.category_id || !newProductForm.unit_id || !newProductForm.selling_price || !newProductForm.capital_price) {
      toast({ title: "Semua field wajib diisi", variant: "destructive" });
      return;
    }
    try {
      await createProduct.mutateAsync({
        ...newProductForm,
        category_id: newProductForm.category_id || null,
        unit_id: newProductForm.unit_id || null,
        current_stock: newProductForm.stock,
      });
      toast({ title: "Produk baru berhasil ditambahkan" });
      onOpenChange(false);
    } catch (error: any) {
      toast({ title: "Gagal menyimpan produk baru", description: error.message, variant: "destructive" });
    }
  };

  const handleSaveSubInput = async () => {
    if (!subInputValue.trim()) {
      toast({ title: "Nama wajib diisi", variant: "destructive" });
      return;
    }
    try {
      if (subDialogType === "category") {
        const result = await createCategory.mutateAsync(subInputValue.trim());
        setNewProductForm((prev) => ({ ...prev, category_id: result.id }));
        toast({ title: "Kategori baru berhasil ditambahkan" });
      } else if (subDialogType === "unit") {
        const result = await createUnit.mutateAsync(subInputValue.trim());
        setNewProductForm((prev) => ({ ...prev, unit_id: result.id }));
        toast({ title: "Satuan baru berhasil ditambahkan" });
      }
      setSubDialogType(null);
    } catch (error: any) {
      toast({ title: "Gagal menyimpan", description: error.message, variant: "destructive" });
    }
  };

  const handleOpenAddCategory = () => {
    setSubDialogType("category");
    setSubInputValue("");
  };

  const handleOpenAddUnit = () => {
    setSubDialogType("unit");
    setSubInputValue("");
  };

  const globalProducts = paginatedGlobals?.data ?? [];
  const globalMeta = paginatedGlobals?.meta;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className={step === "list" ? "sm:max-w-4xl max-h-[90vh] min-w-[800px] flex flex-col" : "sm:max-w-4xl min-w-[800px]"}>
          <DialogHeader>
            <DialogTitle>
              {step === "list" && "Tambah Produk ke Toko"}
              {step === "select-existing" && "Konfigurasi Produk Toko"}
              {step === "create-new" && "Tambah Produk Baru (Global & Toko)"}
            </DialogTitle>
          </DialogHeader>

          {step === "list" && (
            <div className="space-y-4 overflow-hidden flex flex-col flex-1">
              <div className="flex items-center justify-between gap-3">
                <SearchInput
                  placeholder="Cari produk global..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="focus-visible:ring-1 focus-visible:ring-primary focus-visible:ring-offset-0"
                  containerClassName="flex-1"
                />
                <Button size="sm" onClick={() => setStep("create-new")} className="shrink-0">
                  <Plus className="mr-1.5 h-4 w-4" /> Buat Produk Baru
                </Button>
              </div>

              <div className="border rounded-lg overflow-y-auto max-h-[45vh] flex-1">
                <Table>
                  <TableHeader className="sticky top-0 bg-background z-10 border-b">
                    <TableRow>
                      <TableHead className="w-[120px]">Kode</TableHead>
                      <TableHead>Nama</TableHead>
                      <TableHead>Kategori</TableHead>
                      <TableHead>Satuan</TableHead>
                      <TableHead className="w-[150px] text-right"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loadingGlobals ? (
                      <TableRow>
                        <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                          Memuat data produk...
                        </TableCell>
                      </TableRow>
                    ) : globalProducts.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                          Tidak ada produk global ditemukan. Silakan buat baru.
                        </TableCell>
                      </TableRow>
                    ) : (
                      globalProducts.map((gp) => {
                        const linked = gp.store_products?.some((sp) => sp.store_id === storeId);
                        return (
                          <TableRow key={gp.id}>
                            <TableCell className="font-mono text-xs">{gp.product_code}</TableCell>
                            <TableCell className="font-medium">{gp.name}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">{gp.category?.name || "—"}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">{gp.unit?.name || "—"}</TableCell>
                            <TableCell className="text-right">
                              {linked ? (
                                <Badge variant="secondary" className="bg-green-50 text-green-700 border-green-200 gap-1">
                                  <Check className="h-3 w-3" /> Sudah Ada
                                </Badge>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setSelectedProduct(gp);
                                    setStep("select-existing");
                                  }}
                                >
                                  Pilih
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>

              {globalMeta && globalMeta.total > 0 && (
                <TablePagination
                  currentPage={globalMeta.page}
                  totalPages={globalMeta.totalPages}
                  onPageChange={setGlobalPage}
                  startIndex={(globalMeta.page - 1) * globalMeta.limit + (globalProducts.length > 0 ? 1 : 0)}
                  endIndex={(globalMeta.page - 1) * globalMeta.limit + globalProducts.length}
                  totalCount={globalMeta.total}
                  pageSize={globalLimit}
                  onPageSizeChange={(size) => setGlobalLimit(size)}
                />
              )}
            </div>
          )}

          {step === "select-existing" && (
            <div className="space-y-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setStep("list")}
                className="h-8 px-2 -ml-2 text-muted-foreground hover:text-foreground gap-1.5"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Kembali ke Daftar
              </Button>

              <div className="rounded-xl border bg-muted/30 p-3.5 space-y-1.5">
                <div className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Produk Global Terpilih</div>
                <div className="font-semibold text-foreground">{selectedProduct?.name}</div>
                <div className="flex gap-2 text-xs font-mono text-muted-foreground">
                  <span>{selectedProduct?.product_code}</span>
                  <span>•</span>
                  <span>{selectedProduct?.category?.name || "Tanpa Kategori"}</span>
                  <span>•</span>
                  <span>{selectedProduct?.unit?.name || "Tanpa Satuan"}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Harga Jual <span className="text-destructive">*</span></Label>
                  <CurrencyInput
                    value={existingForm.selling_price}
                    onChange={(v) => setExistingForm({ ...existingForm, selling_price: v })}
                    className="focus-visible:ring-1 focus-visible:ring-primary focus-visible:ring-offset-0"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Harga Modal <span className="text-destructive">*</span></Label>
                  <CurrencyInput
                    value={existingForm.capital_price}
                    onChange={(v) => setExistingForm({ ...existingForm, capital_price: v })}
                    className="focus-visible:ring-1 focus-visible:ring-primary focus-visible:ring-offset-0"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Stok Awal</Label>
                  <Input
                    type="number"
                    value={existingForm.stock}
                    onChange={(e) => setExistingForm({ ...existingForm, stock: Number(e.target.value) })}
                    min={0}
                    className="focus-visible:ring-1 focus-visible:ring-primary focus-visible:ring-offset-0"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Stok Minimum</Label>
                  <Input
                    type="number"
                    value={existingForm.minimum_stock}
                    onChange={(e) => setExistingForm({ ...existingForm, minimum_stock: Number(e.target.value) })}
                    min={0}
                    className="focus-visible:ring-1 focus-visible:ring-primary focus-visible:ring-offset-0"
                  />
                </div>
              </div>

              <DialogFormActions
                onCancel={() => onOpenChange(false)}
                onSave={handleSaveExisting}
                isPending={addStoreProduct.isPending}
              />
            </div>
          )}

          {step === "create-new" && (
            <div className="space-y-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setStep("list")}
                className="h-8 px-2 -ml-2 text-muted-foreground hover:text-foreground gap-1.5"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Kembali ke Daftar
              </Button>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Kode Produk <span className="text-muted-foreground font-normal">(Otomatis)</span></Label>
                  <Input value={newProductForm.product_code || "(Otomatis dibuat)"} placeholder="Otomatis" disabled className="bg-muted" />
                </div>
                <div className="space-y-2">
                  <Label>Nama Produk <span className="text-destructive">*</span></Label>
                  <Input value={newProductForm.name} onChange={(e) => setNewProductForm({ ...newProductForm, name: e.target.value })} placeholder="Nama produk" className="focus-visible:ring-1 focus-visible:ring-primary focus-visible:ring-offset-0" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex gap-2 items-end">
                  <div className="flex-1 space-y-2">
                    <Label>Kategori <span className="text-destructive">*</span></Label>
                    <Select value={newProductForm.category_id} onValueChange={(v) => setNewProductForm({ ...newProductForm, category_id: v })}>
                      <SelectTrigger className="focus:ring-1 focus:ring-primary focus:ring-offset-0"><SelectValue placeholder="Pilih kategori" /></SelectTrigger>
                      <SelectContent>
                        {categories?.map((c) => (
                          <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button type="button" size="icon" variant="outline" className="h-10 w-10 shrink-0 focus-visible:ring-1 focus-visible:ring-primary focus-visible:ring-offset-0" onClick={handleOpenAddCategory} title="Tambah kategori baru">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>

                <div className="flex gap-2 items-end">
                  <div className="flex-1 space-y-2">
                    <Label>Satuan <span className="text-destructive">*</span></Label>
                    <Select value={newProductForm.unit_id} onValueChange={(v) => setNewProductForm({ ...newProductForm, unit_id: v })}>
                      <SelectTrigger className="focus:ring-1 focus:ring-primary focus:ring-offset-0"><SelectValue placeholder="Pilih satuan" /></SelectTrigger>
                      <SelectContent>
                        {units?.map((u) => (
                          <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button type="button" size="icon" variant="outline" className="h-10 w-10 shrink-0 focus-visible:ring-1 focus-visible:ring-primary focus-visible:ring-offset-0" onClick={handleOpenAddUnit} title="Tambah satuan baru">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Harga Jual <span className="text-destructive">*</span></Label>
                  <CurrencyInput value={newProductForm.selling_price} onChange={(v) => setNewProductForm({ ...newProductForm, selling_price: v })} className="focus-visible:ring-1 focus-visible:ring-primary focus-visible:ring-offset-0" />
                </div>
                <div className="space-y-2">
                  <Label>Harga Modal <span className="text-destructive">*</span></Label>
                  <CurrencyInput value={newProductForm.capital_price} onChange={(v) => setNewProductForm({ ...newProductForm, capital_price: v })} className="focus-visible:ring-1 focus-visible:ring-primary focus-visible:ring-offset-0" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Stok Awal</Label>
                  <Input type="number" value={newProductForm.stock} onChange={(e) => setNewProductForm({ ...newProductForm, stock: Number(e.target.value) })} min={0} className="focus-visible:ring-1 focus-visible:ring-primary focus-visible:ring-offset-0" />
                </div>
                <div className="space-y-2">
                  <Label>Stok Minimum</Label>
                  <Input type="number" value={newProductForm.minimum_stock} onChange={(e) => setNewProductForm({ ...newProductForm, minimum_stock: Number(e.target.value) })} min={0} className="focus-visible:ring-1 focus-visible:ring-primary focus-visible:ring-offset-0" />
                </div>
              </div>

              <DialogFormActions
                onCancel={() => onOpenChange(false)}
                onSave={handleCreateNew}
                isPending={createProduct.isPending}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Nested Category/Unit Sub-Dialog */}
      <Dialog open={subDialogType !== null} onOpenChange={(open) => !open && setSubDialogType(null)}>
        <DialogContent className="sm:max-w-xs">
          <DialogHeader>
            <DialogTitle>
              Tambah {subDialogType === "category" ? "Kategori" : "Satuan"} Baru
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Nama {subDialogType === "category" ? "Kategori" : "Satuan"}</Label>
              <Input
                value={subInputValue}
                onChange={(e) => setSubInputValue(e.target.value)}
                placeholder={subDialogType === "category" ? "Contoh: Semen" : "Contoh: kg"}
                className="focus-visible:ring-1 focus-visible:ring-primary focus-visible:ring-offset-0"
              />
            </div>
            <DialogFormActions
              onCancel={() => setSubDialogType(null)}
              onSave={handleSaveSubInput}
              isPending={createCategory.isPending || createUnit.isPending}
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
