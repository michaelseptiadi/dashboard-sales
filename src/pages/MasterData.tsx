import { useState, useEffect, useMemo } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { TablePagination } from "@/components/TablePagination";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { TableSkeleton } from "@/components/TableSkeleton";
import { DialogFormActions } from "@/components/DialogFormActions";
import { useToast } from "@/hooks/use-toast";
import {
  useSimpleTable,
  useCreateRow,
  useUpdateRow,
  useDeleteRow,
  useDrivers,
  useCreateDriver,
  useUpdateDriver,
  useDeleteDriver,
  type SimpleRow,
  type MasterTableName,
  type Driver,
} from "@/hooks/useMasterData";
import { Plus, Pencil, Trash2, Tag, Ruler, Truck, Phone } from "lucide-react";

// ── Helpers ───────────────────────────────────────────────────────────────────

function SectionHeader({
  icon,
  iconBg,
  title,
  count,
  isLoading,
  description,
  onAdd,
}: {
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  count?: number;
  isLoading: boolean;
  description: string;
  onAdd: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 pb-1">
      <div className="flex items-center gap-3 min-w-0">
        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${iconBg} ring-1 ring-black/5`}
        >
          {icon}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-foreground leading-tight">
              {title}
            </span>
            {!isLoading && (
              <Badge
                variant="secondary"
                className="rounded-full px-2 py-0 text-[10px] font-semibold tabular-nums bg-muted text-muted-foreground"
              >
                {count ?? 0}
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 leading-tight truncate">
            {description}
          </p>
        </div>
      </div>
      <Button
        size="sm"
        onClick={onAdd}
        className="shrink-0 h-8 gap-1.5 rounded-lg text-xs font-medium shadow-sm"
      >
        <Plus className="h-3.5 w-3.5" />
        <span className="hidden xs:inline sm:inline">Tambah</span>
        <span className="xs:hidden sm:hidden">+</span>
      </Button>
    </div>
  );
}

function EmptyState({
  icon,
  iconBg,
  label,
}: {
  icon: React.ReactNode;
  iconBg: string;
  label: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/70 py-10 text-center">
      <div
        className={`mb-3 flex h-11 w-11 items-center justify-center rounded-xl ${iconBg} opacity-50`}
      >
        {icon}
      </div>
      <p className="text-sm font-medium text-muted-foreground">
        Belum ada {label.toLowerCase()}
      </p>
      <p className="mt-1 text-xs text-muted-foreground/60">
        Klik &quot;Tambah&quot; untuk menambah data baru
      </p>
    </div>
  );
}

// ── MasterTable ───────────────────────────────────────────────────────────────

interface MasterTableProps {
  title: string;
  description: string;
  table: MasterTableName;
  singularLabel: string;
  icon: React.ReactNode;
  accentClass?: string;
  iconBgClass: string;
}

function MasterTable({
  title,
  description,
  table,
  singularLabel,
  icon,
  iconBgClass,
}: MasterTableProps) {
  const { toast } = useToast();
  const { data: rows, isLoading } = useSimpleTable(table);
  const createRow = useCreateRow(table);
  const updateRow = useUpdateRow(table);
  const deleteRow = useDeleteRow(table);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<SimpleRow | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  useEffect(() => {
    setCurrentPage(1);
  }, [rows?.length]);

  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    setCurrentPage(1);
  };

  const totalCount = rows?.length ?? 0;
  const totalPages = Math.ceil(totalCount / pageSize);
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return rows?.slice(start, start + pageSize) ?? [];
  }, [rows, currentPage, pageSize]);

  const startIndex = totalCount === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endIndex = Math.min(currentPage * pageSize, totalCount);

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
      toast({
        title: `Gagal menyimpan ${singularLabel}`,
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteRow.mutateAsync(deleteTarget.id);
      toast({ title: `${singularLabel} berhasil dihapus` });
    } catch (error: any) {
      toast({
        title: `Gagal menghapus ${singularLabel}`,
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setDeleteTarget(null);
    }
  };

  return (
    <>
      <Card className="flex flex-col overflow-hidden border border-border/60 shadow-sm bg-white">
        <CardHeader className="px-4 pt-4 pb-3 sm:px-5">
          <SectionHeader
            icon={icon}
            iconBg={iconBgClass}
            title={title}
            count={rows?.length}
            isLoading={isLoading}
            description={description}
            onAdd={openCreate}
          />
        </CardHeader>

        <CardContent className="flex-1 px-0 pt-0 pb-0">
          {isLoading ? (
            <div className="px-4 pb-4 sm:px-5">
              <TableSkeleton rows={5} rowClassName="h-10 w-full rounded-lg" />
            </div>
          ) : rows?.length === 0 ? (
            <div className="px-4 pb-4 sm:px-5">
              <EmptyState icon={icon} iconBg={iconBgClass} label={singularLabel} />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40 border-y border-border/50">
                    <TableHead className="px-4 sm:px-5 py-2.5 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                      Nama
                    </TableHead>
                    <TableHead className="w-20 px-4 sm:px-5 py-2.5 text-right text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                      Aksi
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedRows.map((row) => (
                    <TableRow
                      key={row.id}
                      className="group border-b border-border/30 transition-colors hover:bg-muted/30"
                    >
                      <TableCell className="px-4 sm:px-5 py-3 text-sm font-medium text-foreground">
                        {row.name}
                      </TableCell>
                      <TableCell className="px-4 sm:px-5 py-3 text-right">
                        <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 rounded-lg text-muted-foreground hover:bg-blue-50 hover:text-blue-600"
                            onClick={() => openEdit(row)}
                            title={`Edit ${singularLabel}`}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 rounded-lg text-muted-foreground hover:bg-red-50 hover:text-red-500"
                            onClick={() => setDeleteTarget(row)}
                            title={`Hapus ${singularLabel}`}
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

        {!isLoading && rows && rows.length > 0 && (
          <TablePagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            startIndex={startIndex}
            endIndex={endIndex}
            totalCount={totalCount}
            pageSize={pageSize}
            onPageSizeChange={handlePageSizeChange}
          />
        )}
      </Card>

      {/* Create / Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {editId ? `Edit ${singularLabel}` : `Tambah ${singularLabel}`}
            </DialogTitle>
            <DialogDescription>
              {editId
                ? `Ubah nama ${singularLabel.toLowerCase()} yang sudah ada.`
                : `Masukkan nama ${singularLabel.toLowerCase()} baru.`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-1">
            <div className="space-y-2">
              <Label>
                Nama {singularLabel}{" "}
                <span className="text-destructive">*</span>
              </Label>
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
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus {singularLabel}?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong className="text-foreground">{deleteTarget?.name}</strong>{" "}
              akan dihapus secara permanen. Pastikan tidak ada produk yang masih
              menggunakan data ini.
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

// ── DriverTable ───────────────────────────────────────────────────────────────

const emptyDriverForm = { driver_name: "", phone_number: "" };

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

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  useEffect(() => {
    setCurrentPage(1);
  }, [drivers?.length]);

  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    setCurrentPage(1);
  };

  const totalCount = drivers?.length ?? 0;
  const totalPages = Math.ceil(totalCount / pageSize);
  const paginatedDrivers = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return drivers?.slice(start, start + pageSize) ?? [];
  }, [drivers, currentPage, pageSize]);

  const startIndex = totalCount === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endIndex = Math.min(currentPage * pageSize, totalCount);

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
    } catch (error: any) {
      toast({
        title: "Gagal menyimpan supir",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteDriver.mutateAsync(deleteTarget.id);
      toast({ title: "Supir berhasil dihapus" });
    } catch (error: any) {
      toast({
        title: "Gagal menghapus supir",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setDeleteTarget(null);
    }
  };

  return (
    <>
      <Card className="overflow-hidden border border-border/60 shadow-sm bg-white">
        <CardHeader className="px-4 pt-4 pb-3 sm:px-5">
          <SectionHeader
            icon={<Truck className="h-4.5 w-4.5 text-emerald-600" />}
            iconBg="bg-emerald-50"
            title="Supir"
            count={drivers?.length}
            isLoading={isLoading}
            description="Daftar supir pengiriman barang"
            onAdd={openCreate}
          />
        </CardHeader>

        <CardContent className="px-0 pt-0 pb-0">
          {isLoading ? (
            <div className="px-4 pb-4 sm:px-5">
              <TableSkeleton rows={4} rowClassName="h-10 w-full rounded-lg" />
            </div>
          ) : drivers?.length === 0 ? (
            <div className="px-4 pb-4 sm:px-5">
              <EmptyState
                icon={<Truck className="h-5 w-5 text-emerald-600" />}
                iconBg="bg-emerald-50"
                label="Supir"
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40 border-y border-border/50">
                    <TableHead className="px-4 sm:px-5 py-2.5 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                      Nama Supir
                    </TableHead>
                    <TableHead className="px-4 sm:px-5 py-2.5 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                      No. Telepon
                    </TableHead>
                    <TableHead className="w-20 px-4 sm:px-5 py-2.5 text-right text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                      Aksi
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedDrivers.map((driver) => (
                    <TableRow
                      key={driver.id}
                      className="group border-b border-border/30 transition-colors hover:bg-muted/30"
                    >
                      <TableCell className="px-4 sm:px-5 py-3 text-sm font-medium text-foreground">
                        {driver.driver_name}
                      </TableCell>
                      <TableCell className="px-4 sm:px-5 py-3 text-sm">
                        {driver.phone_number ? (
                          <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                            <Phone className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                            {driver.phone_number}
                          </span>
                        ) : (
                          <span className="text-muted-foreground/30">—</span>
                        )}
                      </TableCell>
                      <TableCell className="px-4 sm:px-5 py-3 text-right">
                        <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 rounded-lg text-muted-foreground hover:bg-blue-50 hover:text-blue-600"
                            onClick={() => openEdit(driver)}
                            title="Edit Supir"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 rounded-lg text-muted-foreground hover:bg-red-50 hover:text-red-500"
                            onClick={() => setDeleteTarget(driver)}
                            title="Hapus Supir"
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

        {!isLoading && drivers && drivers.length > 0 && (
          <TablePagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            startIndex={startIndex}
            endIndex={endIndex}
            totalCount={totalCount}
            pageSize={pageSize}
            onPageSizeChange={handlePageSizeChange}
          />
        )}
      </Card>

      {/* Create / Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editId ? "Edit Supir" : "Tambah Supir"}</DialogTitle>
            <DialogDescription>
              {editId
                ? "Ubah data supir yang sudah ada."
                : "Isi data supir pengiriman baru."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-1">
            <div className="space-y-2">
              <Label>
                Nama Supir <span className="text-destructive">*</span>
              </Label>
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
            <DialogFormActions
              onCancel={() => setDialogOpen(false)}
              onSave={handleSave}
              isPending={createDriver.isPending || updateDriver.isPending}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Supir?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong className="text-foreground">
                {deleteTarget?.driver_name}
              </strong>{" "}
              akan dihapus secara permanen.
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

// ── Page ──────────────────────────────────────────────────────────────────────

export default function MasterData() {
  return (
    <DashboardLayout title="Master Data">
      {/* Page header */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold tracking-tight text-foreground">
          Kelola Data Referensi
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Kelola kategori, satuan, dan supir yang digunakan dalam operasional
          toko.
        </p>
      </div>

      {/* Top 2-column grid — stacks on mobile */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 mb-5">
        <MasterTable
          title="Kategori Produk"
          description="Pengelompokan jenis produk yang dijual"
          table="categories"
          singularLabel="Kategori"
          icon={<Tag className="h-4.5 w-4.5 text-blue-600" />}
          iconBgClass="bg-blue-50"
        />
        <MasterTable
          title="Satuan"
          description="Satuan ukuran produk (kg, pcs, liter, dll.)"
          table="units"
          singularLabel="Satuan"
          icon={<Ruler className="h-4.5 w-4.5 text-violet-600" />}
          iconBgClass="bg-violet-50"
        />
      </div>

      {/* Drivers — full width */}
      <DriverTable />
    </DashboardLayout>
  );
}
