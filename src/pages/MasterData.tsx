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
import { TableSkeleton } from "@/components/TableSkeleton";
import { DialogFormActions } from "@/components/DialogFormActions";
import { useToast } from "@/hooks/use-toast";
import { useSimpleTable, useCreateRow, useUpdateRow, useDeleteRow, type SimpleRow, type MasterTableName } from "@/hooks/useMasterData";
import { Plus, Pencil, Trash2, Tag, Ruler } from "lucide-react";

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
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      toast({ title: `Gagal menyimpan ${singularLabel}`, description: errorMessage, variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteRow.mutateAsync(deleteTarget.id);
      toast({ title: `${singularLabel} berhasil dihapus` });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      toast({ title: `Gagal menghapus ${singularLabel}`, description: errorMessage, variant: "destructive" });
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
            <TableSkeleton rows={5} rowClassName="h-10 w-full rounded-lg" />
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
            <DialogFormActions
              onCancel={() => setDialogOpen(false)}
              onSave={handleSave}
              isPending={createRow.isPending || updateRow.isPending}
            />
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

// ── Page ─────────────────────────────────────────────────────────────────────

export default function MasterData() {
  return (
    <DashboardLayout title="Master Data">
      <div className="mb-6">
        <h2 className="text-lg font-semibold tracking-tight">Kelola Data Referensi</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Kelola kategori dan satuan yang digunakan dalam operasional toko.
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
    </DashboardLayout>
  );
}
