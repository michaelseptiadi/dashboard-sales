import { useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useSimpleTable, useCreateRow, useUpdateRow, useDeleteRow, useDrivers, useCreateDriver, useUpdateDriver, useDeleteDriver, type SimpleRow, type MasterTableName, type Driver } from "@/hooks/useMasterData";
import { Plus, Pencil, Trash2, Tag, Ruler, Truck, Phone, MapPin } from "lucide-react";

// ── Sub-component ─────────────────────────────────────────────────────────────

interface MasterTableProps {
  title: string;
  description: string;
  table: MasterTableName;
  singularLabel: string;
  icon: React.ReactNode;
  accentClass: string;
  iconBgClass: string;
}

function MasterTable({ title, description, table, singularLabel, icon, accentClass, iconBgClass }: MasterTableProps) {
  const { toast } = useToast();
  const { data: rows, isLoading } = useSimpleTable(table);
  const createRow = useCreateRow(table);
  const updateRow = useUpdateRow(table);
  const deleteRow = useDeleteRow(table);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<SimpleRow | null>(null);

  const openCreate = () => {
    setEditId(null);
    setName("");
    setDialogOpen(true);
  };

  const openEdit = (row: SimpleRow) => {
    setEditId(row.id);
    setName(row.name);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast({ title: `Nama ${singularLabel} wajib diisi`, variant: "destructive" });
      return;
    }
    try {
      if (editId) {
        await updateRow.mutateAsync({ id: editId, name: name.trim() });
        toast({ title: `${singularLabel} berhasil diperbarui` });
      } else {
        await createRow.mutateAsync(name.trim());
        toast({ title: `${singularLabel} berhasil ditambahkan` });
      }
      setDialogOpen(false);
    } catch (error: any) {
      toast({ title: `Gagal menyimpan ${singularLabel}`, description: error.message, variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteRow.mutateAsync(deleteTarget.id);
      toast({ title: `${singularLabel} berhasil dihapus` });
    } catch (error: any) {
      toast({ title: `Gagal menghapus ${singularLabel}`, description: error.message, variant: "destructive" });
    } finally {
      setDeleteTarget(null);
    }
  };

  return (
    <>
      <Card className="shadow-sm border-0 ring-1 ring-border/60 flex flex-col">
        {/* Card header */}
        <CardHeader className="pb-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${iconBgClass}`}>
                {icon}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <CardTitle className="text-base font-semibold">{title}</CardTitle>
                  {!isLoading && (
                    <Badge variant="secondary" className="rounded-full px-2 py-0 text-xs font-medium">
                      {rows?.length ?? 0}
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
              </div>
            </div>
            <Button size="sm" onClick={openCreate} className={`shrink-0 ${accentClass}`}>
              <Plus className="mr-1.5 h-3.5 w-3.5" /> Tambah
            </Button>
          </div>
        </CardHeader>

        <CardContent className="pt-0 flex-1">
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full rounded-lg" />
              ))}
            </div>
          ) : rows?.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-12 text-center">
              <div className={`mb-3 flex h-12 w-12 items-center justify-center rounded-xl ${iconBgClass} opacity-60`}>
                {icon}
              </div>
              <p className="text-sm font-medium text-muted-foreground">Belum ada {singularLabel.toLowerCase()}</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Klik "Tambah" untuk menambah data baru</p>
            </div>
          ) : (
            <div className="rounded-xl border border-border/60 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Nama</TableHead>
                    <TableHead className="w-20 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows?.map((row, idx) => (
                    <TableRow key={row.id} className={idx % 2 === 0 ? "bg-white hover:bg-muted/30" : "bg-muted/10 hover:bg-muted/30"}>
                      <TableCell className="font-medium text-sm py-2.5">{row.name}</TableCell>
                      <TableCell className="text-right py-2.5">
                        <div className="flex justify-end gap-0.5">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-foreground"
                            onClick={() => openEdit(row)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-destructive"
                            onClick={() => setDeleteTarget(row)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create / Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{editId ? `Edit ${singularLabel}` : `Tambah ${singularLabel}`}</DialogTitle>
            <DialogDescription>
              {editId ? `Ubah nama ${singularLabel.toLowerCase()} yang sudah ada.` : `Masukkan nama ${singularLabel.toLowerCase()} baru.`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-1">
            <div className="space-y-2">
              <Label>Nama {singularLabel} <span className="text-destructive">*</span></Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={`Contoh: ${singularLabel === "Kategori" ? "Semen & Beton" : "Kilogram"}`}
                onKeyDown={(e) => e.key === "Enter" && handleSave()}
                autoFocus
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Batal</Button>
              <Button onClick={handleSave} disabled={createRow.isPending || updateRow.isPending}>
                {createRow.isPending || updateRow.isPending ? "Menyimpan..." : "Simpan"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus {singularLabel}?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong className="text-foreground">{deleteTarget?.name}</strong> akan dihapus secara permanen.{" "}
              Pastikan tidak ada produk yang masih menggunakan data ini.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDelete}
              disabled={deleteRow.isPending}
            >
              {deleteRow.isPending ? "Menghapus..." : "Hapus"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// ── Driver Table ──────────────────────────────────────────────────────────────

const emptyDriverForm = { driver_name: "", phone_number: "", address: "" };

function DriverTable() {
  const { toast } = useToast();
  const { data: drivers, isLoading } = useDrivers();
  const createDriver = useCreateDriver();
  const updateDriver = useUpdateDriver();
  const deleteDriver = useDeleteDriver();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyDriverForm);
  const [deleteTarget, setDeleteTarget] = useState<Driver | null>(null);

  const openCreate = () => {
    setEditId(null);
    setForm(emptyDriverForm);
    setDialogOpen(true);
  };

  const openEdit = (d: Driver) => {
    setEditId(d.id);
    setForm({ driver_name: d.driver_name, phone_number: d.phone_number ?? "", address: d.address ?? "" });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.driver_name.trim()) {
      toast({ title: "Nama supir wajib diisi", variant: "destructive" });
      return;
    }
    const payload = {
      driver_name: form.driver_name.trim(),
      phone_number: form.phone_number.trim() || null,
      address: form.address.trim() || null,
    };
    try {
      if (editId) {
        await updateDriver.mutateAsync({ id: editId, ...payload });
        toast({ title: "Supir berhasil diperbarui" });
      } else {
        await createDriver.mutateAsync(payload);
        toast({ title: "Supir berhasil ditambahkan" });
      }
      setDialogOpen(false);
    } catch (error: any) {
      toast({ title: "Gagal menyimpan supir", description: error.message, variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteDriver.mutateAsync(deleteTarget.id);
      toast({ title: "Supir berhasil dihapus" });
    } catch (error: any) {
      toast({ title: "Gagal menghapus supir", description: error.message, variant: "destructive" });
    } finally {
      setDeleteTarget(null);
    }
  };

  return (
    <>
      <Card className="shadow-sm border-0 ring-1 ring-border/60">
        <CardHeader className="pb-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50">
                <Truck className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <CardTitle className="text-base font-semibold">Supir</CardTitle>
                  {!isLoading && (
                    <Badge variant="secondary" className="rounded-full px-2 py-0 text-xs font-medium">
                      {drivers?.length ?? 0}
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">Daftar supir pengiriman barang</p>
              </div>
            </div>
            <Button size="sm" onClick={openCreate} className="shrink-0">
              <Plus className="mr-1.5 h-3.5 w-3.5" /> Tambah
            </Button>
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full rounded-lg" />
              ))}
            </div>
          ) : drivers?.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-12 text-center">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 opacity-60">
                <Truck className="h-6 w-6 text-emerald-600" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">Belum ada supir</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Klik "Tambah" untuk menambah supir baru</p>
            </div>
          ) : (
            <div className="rounded-xl border border-border/60 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Nama Supir</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">No. Telepon</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground hidden md:table-cell">Alamat</TableHead>
                    <TableHead className="w-20 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {drivers?.map((driver, idx) => (
                    <TableRow key={driver.id} className={idx % 2 === 0 ? "bg-white hover:bg-muted/30" : "bg-muted/10 hover:bg-muted/30"}>
                      <TableCell className="font-medium text-sm py-2.5">{driver.driver_name}</TableCell>
                      <TableCell className="text-sm py-2.5">
                        {driver.phone_number ? (
                          <span className="flex items-center gap-1.5 text-muted-foreground">
                            <Phone className="h-3.5 w-3.5 shrink-0" />
                            {driver.phone_number}
                          </span>
                        ) : (
                          <span className="text-muted-foreground/40">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm py-2.5 hidden md:table-cell">
                        {driver.address ? (
                          <span className="flex items-center gap-1.5 text-muted-foreground">
                            <MapPin className="h-3.5 w-3.5 shrink-0" />
                            <span className="truncate max-w-[240px]">{driver.address}</span>
                          </span>
                        ) : (
                          <span className="text-muted-foreground/40">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right py-2.5">
                        <div className="flex justify-end gap-0.5">
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={() => openEdit(driver)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => setDeleteTarget(driver)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create / Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editId ? "Edit Supir" : "Tambah Supir"}</DialogTitle>
            <DialogDescription>
              {editId ? "Ubah data supir yang sudah ada." : "Isi data supir pengiriman baru."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-1">
            <div className="space-y-2">
              <Label>Nama Supir <span className="text-destructive">*</span></Label>
              <Input
                value={form.driver_name}
                onChange={(e) => setForm({ ...form, driver_name: e.target.value })}
                placeholder="Contoh: Budi Santoso"
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label>No. Telepon</Label>
              <Input
                value={form.phone_number}
                onChange={(e) => setForm({ ...form, phone_number: e.target.value })}
                placeholder="Contoh: 08123456789"
                type="tel"
              />
            </div>
            <div className="space-y-2">
              <Label>Alamat</Label>
              <Input
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                placeholder="Contoh: Jl. Merdeka No. 10, Jakarta"
              />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Batal</Button>
              <Button onClick={handleSave} disabled={createDriver.isPending || updateDriver.isPending}>
                {createDriver.isPending || updateDriver.isPending ? "Menyimpan..." : "Simpan"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Supir?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong className="text-foreground">{deleteTarget?.driver_name}</strong> akan dihapus secara permanen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDelete}
              disabled={deleteDriver.isPending}
            >
              {deleteDriver.isPending ? "Menghapus..." : "Hapus"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function MasterData() {
  return (
    <DashboardLayout title="Master Data">
      <div className="mb-6">
        <h2 className="text-lg font-semibold tracking-tight">Kelola Data Referensi</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Kelola kategori, satuan, dan supir yang digunakan dalam operasional toko.
        </p>
      </div>
      <div className="grid gap-6 md:grid-cols-2 mb-6">
        <MasterTable
          title="Kategori Produk"
          description="Pengelompokan jenis produk yang dijual"
          table="categories"
          singularLabel="Kategori"
          icon={<Tag className="h-5 w-5 text-blue-600" />}
          accentClass=""
          iconBgClass="bg-blue-50"
        />
        <MasterTable
          title="Satuan"
          description="Satuan ukuran produk (kg, pcs, liter, dll.)"
          table="units"
          singularLabel="Satuan"
          icon={<Ruler className="h-5 w-5 text-violet-600" />}
          accentClass=""
          iconBgClass="bg-violet-50"
        />
      </div>
      <DriverTable />
    </DashboardLayout>
  );
}
