import { useState } from "react";
import { DashboardLayout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { TableSkeleton } from "@/components/TableSkeleton";
import { DialogFormActions } from "@/components/DialogFormActions";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import {
  useStoreUserRoles,
  useCreateStoreUser,
  useUpdateStoreUserRole,
  useRemoveStoreUserRole,
  getStoreRoleLabel,
} from "@/hooks/useUserStoreRoles";
import { Plus, Pencil, Trash2, UserCog, Phone, Mail, Search, X, Check } from "lucide-react";
import type { BackendRoleName, StoreUserRoleAssignment } from "@/types/users";

const emptyEmployeeForm = {
  name: "",
  phone_number: "",
  email: "",
  password: "",
  storeRole: "staff" as BackendRoleName,
};

export default function Karyawan() {
  const { toast } = useToast();
  const { selectedStore } = useAuth();
  const storeId = selectedStore?.id ?? null;

  const { data: employees = [], isLoading } = useStoreUserRoles(storeId);
  const createEmployee = useCreateStoreUser();
  const updateEmployeeRole = useUpdateStoreUserRole();
  const removeEmployeeAccess = useRemoveStoreUserRole();

  const [searchQuery, setSearchQuery] = useState("");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [form, setForm] = useState(emptyEmployeeForm);

  const [editRoleTarget, setEditRoleTarget] = useState<StoreUserRoleAssignment | null>(null);
  const [editRoleValue, setEditRoleValue] = useState<BackendRoleName>("staff");
  const [deleteTarget, setDeleteTarget] = useState<StoreUserRoleAssignment | null>(null);

  const openCreate = () => {
    setForm(emptyEmployeeForm);
    setCreateDialogOpen(true);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeId) {
      toast({ title: "Pilih toko terlebih dahulu", variant: "destructive" });
      return;
    }
    if (!form.email || !form.phone_number || !form.password) {
      toast({ title: "Email, Nomor HP, dan Password wajib diisi", variant: "destructive" });
      return;
    }

    try {
      await createEmployee.mutateAsync({
        storeId,
        email: form.email.trim(),
        phone_number: form.phone_number.trim(),
        name: form.name.trim() || undefined,
        password: form.password,
        storeRole: form.storeRole,
      });

      toast({
        title: "Karyawan berhasil ditambahkan",
        description: `Akun untuk ${form.email} telah dibuat dan ditautkan ke toko ini.`,
      });
      setCreateDialogOpen(false);
    } catch (error: any) {
      toast({
        title: "Gagal menambahkan karyawan",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleEditRole = async () => {
    if (!storeId || !editRoleTarget) return;
    try {
      await updateEmployeeRole.mutateAsync({
        storeId,
        userId: editRoleTarget.user_id,
        storeRole: editRoleValue,
      });
      toast({ title: "Role karyawan berhasil diperbarui" });
      setEditRoleTarget(null);
    } catch (error: any) {
      toast({
        title: "Gagal memperbarui role",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDelete = async () => {
    if (!storeId || !deleteTarget) return;
    try {
      await removeEmployeeAccess.mutateAsync({
        storeId,
        userId: deleteTarget.user_id,
      });
      toast({ title: "Akses karyawan berhasil dihapus dari toko ini" });
    } catch (error: any) {
      toast({
        title: "Gagal menghapus akses",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setDeleteTarget(null);
    }
  };

  const openEditRole = (assignment: StoreUserRoleAssignment) => {
    setEditRoleTarget(assignment);
    setEditRoleValue(assignment.role.name);
  };

  // Filter employees
  const filteredEmployees = employees.filter((emp) => {
    const nameMatch = emp.user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false;
    const emailMatch = emp.user.email.toLowerCase().includes(searchQuery.toLowerCase());
    const phoneMatch = emp.user.phone_number?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false;
    return nameMatch || emailMatch || phoneMatch;
  });

  const adminCount = employees.filter((emp) => emp.role.name === "manager").length;
  const cashierCount = employees.filter((emp) => emp.role.name === "staff").length;

  return (
    <DashboardLayout title="Manajemen Karyawan">
      <div className="mb-6">
        <h2 className="text-lg font-semibold tracking-tight">Daftar Karyawan Toko</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Kelola akun kasir dan admin yang memiliki akses untuk operasional toko ini.
        </p>
      </div>

      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <Card className="border-0 ring-1 ring-border/60">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Karyawan</p>
              <h3 className="text-2xl font-bold mt-1">{employees.length}</h3>
            </div>
            <div className="h-10 w-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
              <UserCog className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 ring-1 ring-border/60">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Manager</p>
              <h3 className="text-2xl font-bold mt-1 text-primary">{adminCount}</h3>
            </div>
            <div className="h-10 w-10 bg-primary/10 text-primary rounded-xl flex items-center justify-center font-semibold text-sm">
              MG
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 ring-1 ring-border/60">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Kasir</p>
              <h3 className="text-2xl font-bold mt-1 text-orange-600">{cashierCount}</h3>
            </div>
            <div className="h-10 w-10 bg-orange-50 text-orange-600 rounded-xl flex items-center justify-center font-semibold text-sm">
              KS
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-sm border-0 ring-1 ring-border/60">
        <CardHeader className="pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50">
              <UserCog className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-base font-semibold">Karyawan Toko</CardTitle>
                {!isLoading && (
                  <Badge variant="secondary" className="rounded-full px-2 py-0 text-xs font-medium">
                    {filteredEmployees.length} {filteredEmployees.length !== employees.length && `dari ${employees.length}`}
                  </Badge>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari nama, email, telepon..."
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
            <Button size="sm" onClick={openCreate} className="shrink-0">
              <Plus className="mr-1.5 h-3.5 w-3.5" /> Tambah Karyawan
            </Button>
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          {isLoading ? (
            <TableSkeleton rows={4} rowClassName="h-10 w-full rounded-lg" />
          ) : filteredEmployees.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-12 text-center">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 opacity-60">
                <UserCog className="h-6 w-6 text-blue-600" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">
                {searchQuery ? "Karyawan tidak ditemukan" : "Belum ada karyawan"}
              </p>
              <p className="text-xs text-muted-foreground/60 mt-1">
                {searchQuery ? "Coba kata kunci pencarian lain" : "Klik 'Tambah Karyawan' untuk membuat akun karyawan baru"}
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-3 md:hidden">
                {filteredEmployees.map((emp) => (
                  <div key={emp.id} className="flex flex-col gap-3 rounded-xl border bg-card p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate font-semibold">{emp.user.name || <span className="text-muted-foreground/50 italic">Tanpa Nama</span>}</p>
                        <p className="truncate text-xs text-muted-foreground flex items-center gap-1 mt-0.5"><Mail className="h-3 w-3 shrink-0" />{emp.user.email}</p>
                      </div>
                      <Badge variant={emp.role.name === "manager" ? "default" : "secondary"} className="shrink-0 capitalize">
                        {getStoreRoleLabel(emp.role.name)}
                      </Badge>
                    </div>
                    {emp.user.phone_number && (
                      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Phone className="h-3 w-3 shrink-0" />
                        {emp.user.phone_number}
                      </p>
                    )}
                    <div className="flex gap-2 border-t pt-3 mt-1">
                      <Button variant="outline" size="sm" className="flex-1 h-9 text-xs" onClick={() => openEditRole(emp)}>Edit Role</Button>
                      <Button variant="outline" size="sm" className="flex-1 h-9 text-xs text-destructive hover:text-destructive" onClick={() => setDeleteTarget(emp)}>Hapus</Button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="hidden md:block rounded-xl border border-border/60 overflow-hidden">
                <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Nama</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Email</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">No. Telepon</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Role</TableHead>
                    <TableHead className="w-24 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEmployees.map((emp, idx) => (
                    <TableRow key={emp.id} className={idx % 2 === 0 ? "bg-white hover:bg-muted/30" : "bg-muted/10 hover:bg-muted/30"}>
                      <TableCell className="font-medium text-sm py-2.5">
                        {emp.user.name || <span className="text-muted-foreground/50 italic">Tanpa Nama</span>}
                      </TableCell>
                      <TableCell className="text-sm py-2.5">
                        <span className="flex items-center gap-1.5 text-muted-foreground">
                          <Mail className="h-3.5 w-3.5 shrink-0" />
                          {emp.user.email}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm py-2.5">
                        {emp.user.phone_number ? (
                          <span className="flex items-center gap-1.5 text-muted-foreground">
                            <Phone className="h-3.5 w-3.5 shrink-0" />
                            {emp.user.phone_number}
                          </span>
                        ) : (
                          <span className="text-muted-foreground/40">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm py-2.5">
                        <Badge
                          variant={emp.role.name === "manager" ? "default" : "secondary"}
                          className="capitalize"
                        >
                          {getStoreRoleLabel(emp.role.name)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right py-2.5">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-foreground"
                            onClick={() => openEditRole(emp)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-destructive"
                            onClick={() => setDeleteTarget(emp)}
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
          </>
          )}
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Tambah Karyawan</DialogTitle>
            <DialogDescription>
              Buat akun karyawan baru dan hubungkan ke toko ini.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4 pt-1">
            <div className="space-y-2">
              <Label htmlFor="emp-name">Nama Karyawan</Label>
              <Input
                id="emp-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Contoh: John Doe"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="emp-phone">Nomor HP <span className="text-destructive">*</span></Label>
              <Input
                id="emp-phone"
                value={form.phone_number}
                onChange={(e) => setForm({ ...form, phone_number: e.target.value })}
                placeholder="Contoh: 62812345678"
                required
                type="tel"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="emp-email">Email <span className="text-destructive">*</span></Label>
              <Input
                id="emp-email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="Contoh: employee@company.com"
                required
                type="email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="emp-password">Password <span className="text-destructive">*</span></Label>
              <Input
                id="emp-password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="Minimal 8 karakter"
                required
                type="password"
                minLength={8}
              />
            </div>
            <div className="space-y-2">
              <Label>Role Toko <span className="text-destructive">*</span></Label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant={form.storeRole === "manager" ? "default" : "outline"}
                  onClick={() => setForm({ ...form, storeRole: "manager" })}
                  className="w-full"
                >
                  Manager
                </Button>
                <Button
                  type="button"
                  variant={form.storeRole === "staff" ? "default" : "outline"}
                  onClick={() => setForm({ ...form, storeRole: "staff" })}
                  className="w-full"
                >
                  Kasir
                </Button>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateDialogOpen(false)}>
                Batal
              </Button>
              <Button type="submit" disabled={createEmployee.isPending}>
                {createEmployee.isPending ? "Menyimpan..." : "Buat Karyawan"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Role Dialog */}
      <Dialog open={!!editRoleTarget} onOpenChange={(open) => !open && setEditRoleTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Ubah Role Karyawan</DialogTitle>
            <DialogDescription>
              Ubah akses toko untuk <span className="font-semibold text-foreground">{editRoleTarget?.user.email}</span>.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-1">
            <div className="space-y-2">
              <Label>Role Baru</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant={editRoleValue === "manager" ? "default" : "outline"}
                  onClick={() => setEditRoleValue("manager")}
                >
                  Manager
                </Button>
                <Button
                  type="button"
                  variant={editRoleValue === "staff" ? "default" : "outline"}
                  onClick={() => setEditRoleValue("staff")}
                >
                  Kasir
                </Button>
              </div>
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => setEditRoleTarget(null)}>
                Batal
              </Button>
              <Button onClick={handleEditRole} disabled={updateEmployeeRole.isPending}>
                {updateEmployeeRole.isPending ? "Menyimpan..." : "Simpan"}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Akses Karyawan?</AlertDialogTitle>
            <AlertDialogDescription>
              Akses toko untuk <strong className="text-foreground">{deleteTarget?.user.email}</strong> akan dihapus secara permanen.
              Karyawan ini tidak akan bisa login lagi ke toko ini.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDelete}
              disabled={removeEmployeeAccess.isPending}
            >
              {removeEmployeeAccess.isPending ? "Menghapus..." : "Hapus Akses"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
