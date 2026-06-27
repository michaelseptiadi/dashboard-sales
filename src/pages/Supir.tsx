import { useState } from "react";
import { DashboardLayout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { TableSkeleton } from "@/components/TableSkeleton";
import { DialogFormActions } from "@/components/DialogFormActions";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useDrivers, useCreateDriver, useUpdateDriver, useDeleteDriver, type Driver } from "@/hooks/useMasterData";
import { Plus, Pencil, Trash2, Truck, Phone, Search, X } from "lucide-react";

const emptyDriverForm = { driver_name: "", phone_number: "" };

export default function Supir() {
  const { toast } = useToast();
  const { currentRole, isSuperAdmin } = useAuth();
  const isAdmin = isSuperAdmin || currentRole === "admin";

  const { data: drivers = [], isLoading } = useDrivers();
  const createDriver = useCreateDriver();
  const updateDriver = useUpdateDriver();
  const deleteDriver = useDeleteDriver();

  const [searchQuery, setSearchQuery] = useState("");
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
    setForm({ driver_name: d.driver_name, phone_number: d.phone_number ?? "" });
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
    } catch (error) {
      const message = error instanceof Error ? error.message : "Terjadi kesalahan";
      toast({ title: "Gagal menyimpan supir", description: message, variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteDriver.mutateAsync(deleteTarget.id);
      toast({ title: "Supir berhasil dihapus" });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Terjadi kesalahan";
      toast({ title: "Gagal menghapus supir", description: message, variant: "destructive" });
    } finally {
      setDeleteTarget(null);
    }
  };

  // Filter drivers based on search query
  const filteredDrivers = drivers.filter((driver) => {
    const nameMatch = driver.driver_name.toLowerCase().includes(searchQuery.toLowerCase());
    const phoneMatch = driver.phone_number?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false;
    return nameMatch || phoneMatch;
  });

  return (
    <DashboardLayout title="Manajemen Supir">
      <div className="mb-6">
        <h2 className="text-lg font-semibold tracking-tight">Daftar Supir Toko</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Kelola supir pengiriman barang dan informasi kontak mereka untuk toko ini.
        </p>
      </div>

      <Card className="shadow-sm border-0 ring-1 ring-border/60">
        <CardHeader className="pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50">
              <Truck className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-base font-semibold">Supir</CardTitle>
                {!isLoading && (
                  <Badge variant="secondary" className="rounded-full px-2 py-0 text-xs font-medium">
                    {filteredDrivers.length} {filteredDrivers.length !== drivers.length && `dari ${drivers.length}`}
                  </Badge>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari nama atau telepon..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-8"
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1 h-7 w-7 text-muted-foreground"
                  onClick={() => setSearchQuery("")}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
            {isAdmin && (
              <Button size="sm" onClick={openCreate} className="shrink-0">
                <Plus className="mr-1.5 h-3.5 w-3.5" /> Tambah Supir
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          {isLoading ? (
            <TableSkeleton rows={4} rowClassName="h-10 w-full rounded-lg" />
          ) : filteredDrivers.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-12 text-center">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 opacity-60">
                <Truck className="h-6 w-6 text-emerald-600" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">
                {searchQuery ? "Supir tidak ditemukan" : "Belum ada supir"}
              </p>
              <p className="text-xs text-muted-foreground/60 mt-1">
                {searchQuery ? "Coba kata kunci pencarian lain" : "Klik 'Tambah Supir' untuk menambah supir baru"}
              </p>
            </div>
          ) : (
            <div className="rounded-xl border border-border/60 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Nama Supir</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">No. Telepon</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Dibuat Oleh</TableHead>
                    {isAdmin && <TableHead className="w-20 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">Aksi</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDrivers.map((driver, idx) => (
                    <TableRow key={driver.id} className={idx % 2 === 0 ? "bg-white hover:bg-muted/30" : "bg-muted/10 hover:bg-muted/30"}>
                      <TableCell className="font-medium text-sm py-2.5">{driver.driver_name}</TableCell>
                      <TableCell className="text-sm py-2.5">
                        {driver.phone_number ? (
                          <a
                            href={`tel:${driver.phone_number}`}
                            className="flex items-center gap-1.5 text-blue-600 hover:underline"
                          >
                            <Phone className="h-3.5 w-3.5 shrink-0" />
                            {driver.phone_number}
                          </a>
                        ) : (
                          <span className="text-muted-foreground/40">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm py-2.5 text-muted-foreground">
                        {driver.created_by || "—"}
                      </TableCell>
                      {isAdmin && (
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
                      )}
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
            <DialogFormActions
              onCancel={() => setDialogOpen(false)}
              onSave={handleSave}
              isPending={createDriver.isPending || updateDriver.isPending}
            />
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
    </DashboardLayout>
  );
}
