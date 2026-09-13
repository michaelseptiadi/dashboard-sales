import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { SearchInput } from "@/components/SearchInput";
import { TableSkeleton } from "@/components/TableSkeleton";
import { DialogFormActions } from "@/components/DialogFormActions";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useCustomers, useCreateCustomer } from "@/hooks/useCustomers";
import { Plus, Eye, Users, ChevronRight, MapPin, Mail, Phone, UserRound } from "lucide-react";

interface CustomerFormData {
  name: string;
  phone: string;
  address: string;
  email: string;
}

const emptyForm: CustomerFormData = { name: "", phone: "", address: "", email: "" };

export default function Customers() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { currentRole, isSuperAdmin } = useAuth();
  const isAdmin = isSuperAdmin || currentRole === "admin";

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<CustomerFormData>(emptyForm);

  const { data: customers, isLoading } = useCustomers(search);
  const createCustomer = useCreateCustomer();
  const mobileCustomers = customers?.filter((customer) =>
    statusFilter === "all" || (statusFilter === "active" ? customer.is_active !== false : customer.is_active === false),
  ) ?? [];
  const activeCount = customers?.filter((customer) => customer.is_active !== false).length ?? 0;

  const openCreate = () => {
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name) {
      toast({ title: "Nama pelanggan wajib diisi", variant: "destructive" });
      return;
    }
    try {
      await createCustomer.mutateAsync({
        ...form,
        phone: form.phone || null,
        address: form.address || null,
        email: form.email || null,
      });
      toast({ title: "Pelanggan berhasil ditambahkan" });
      setDialogOpen(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Terjadi kesalahan";
      toast({ title: "Gagal menyimpan pelanggan", description: message, variant: "destructive" });
    }
  };

  return (
    <DashboardLayout title="Manajemen Pelanggan">
      <div className="mb-5 md:hidden">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">Relasi toko</p>
        <div className="mt-1 flex items-end justify-between gap-3">
          <div><h1 className="text-2xl font-extrabold">Pelanggan</h1><p className="mt-1 text-sm text-muted-foreground">Kontak pelanggan, rapi dan mudah ditemukan.</p></div>
          <div className="flex h-11 min-w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary"><Users className="h-5 w-5" /></div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-2xl border bg-card p-3 shadow-sm"><p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Total</p><p className="mt-1 text-xl font-black">{customers?.length ?? 0}</p></div>
          <div className="rounded-2xl border bg-card p-3 shadow-sm"><p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Aktif</p><p className="mt-1 text-xl font-black text-emerald-600">{activeCount}</p></div>
        </div>
      </div>
      <Card className="border-0 bg-transparent shadow-none md:border md:bg-card md:shadow-sm">
        <CardHeader className="px-0 pb-4 pt-0 md:px-6 md:pt-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2.5">
              <CardTitle className="hidden text-base md:block">Daftar Pelanggan</CardTitle>
              {customers && (
                <span className="hidden rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground md:inline-flex">
                  {customers.length}
                </span>
              )}
            </div>
            {isAdmin && (
              <Button size="sm" onClick={openCreate} className="h-11 rounded-full px-4 shadow-sm md:h-9 md:rounded-md md:px-3">
                <Plus className="mr-1.5 h-4 w-4" /> Tambah Pelanggan
              </Button>
            )}
          </div>
          <div className="pt-1">
            <SearchInput
              aria-label="Cari pelanggan"
              containerClassName="[&_svg]:top-4 md:[&_svg]:top-2.5"
              className="h-12 rounded-2xl border-slate-300 bg-card pl-10 shadow-sm md:h-10 md:rounded-md md:shadow-none"
              placeholder="Cari nama atau telepon..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 pt-1 md:hidden" aria-label="Filter status pelanggan">
            {([['all', 'Semua'], ['active', 'Aktif'], ['inactive', 'Nonaktif']] as const).map(([value, label]) => (
              <button key={value} type="button" onClick={() => setStatusFilter(value)} aria-pressed={statusFilter === value} className={`min-h-11 shrink-0 rounded-full px-4 text-sm font-bold transition active:scale-95 ${statusFilter === value ? 'bg-foreground text-background shadow-sm' : 'border bg-card text-muted-foreground'}`}>{label}</button>
            ))}
          </div>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          <section aria-label="Daftar pelanggan mobile" className="space-y-3 md:hidden">
            {isLoading ? (
              Array.from({ length: 4 }, (_, index) => <div key={index} className="h-36 animate-pulse rounded-2xl border bg-card" />)
            ) : mobileCustomers.length === 0 ? (
              <div className="rounded-2xl border bg-card px-5 py-10 text-center shadow-sm">
                <Users className="mx-auto mb-3 h-9 w-9 text-muted-foreground/40" />
                <p className="font-bold">Tidak ada pelanggan ditemukan</p>
                <p className="mt-1 text-sm text-muted-foreground">Coba ubah pencarian atau filter status.</p>
              </div>
            ) : mobileCustomers.map((customer) => {
              const initials = customer.name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
              return (
                <article key={customer.id} className="overflow-hidden rounded-2xl border bg-card shadow-sm transition active:scale-[0.995]">
                  <div className="flex gap-3 p-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-sm font-black text-primary">{initials || <UserRound className="h-5 w-5" />}</div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0"><p className="truncate font-extrabold">{customer.name}</p><p className="mt-0.5 text-xs text-muted-foreground">Pelanggan toko</p></div>
                        <Badge variant="outline" className={`shrink-0 text-[10px] ${customer.is_active !== false ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-slate-100 text-slate-600'}`}>{customer.is_active !== false ? 'Aktif' : 'Nonaktif'}</Badge>
                      </div>
                      <div className="mt-3 space-y-2 text-xs text-muted-foreground">
                        <p className="flex items-center gap-2"><Phone className="h-3.5 w-3.5 shrink-0" /><span className="truncate">{customer.phone || 'Nomor telepon belum diisi'}</span></p>
                        {customer.address ? <p className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5 shrink-0" /><span className="line-clamp-1">{customer.address}</span></p> : null}
                        {customer.email ? <p className="flex items-center gap-2"><Mail className="h-3.5 w-3.5 shrink-0" /><span className="truncate">{customer.email}</span></p> : null}
                      </div>
                    </div>
                  </div>
                  <button type="button" aria-label={`Lihat detail ${customer.name}`} onClick={() => navigate(`/pelanggan/${customer.id}`)} className="flex min-h-12 w-full items-center justify-center gap-1 border-t bg-muted/20 text-xs font-bold active:bg-muted">Lihat profil pelanggan <ChevronRight className="h-4 w-4" /></button>
                </article>
              );
            })}
          </section>
          <div className="hidden md:block">
          {isLoading ? (
            <div className="px-6 pb-6"><TableSkeleton /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-t bg-muted/30">
                  <TableHead className="pl-6 text-xs">Nama</TableHead>
                  <TableHead className="text-xs">Telepon</TableHead>
                  <TableHead className="text-xs">Alamat</TableHead>
                  <TableHead className="text-xs">Email</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                  <TableHead className="w-10 pr-6"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customers?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-16 text-center text-muted-foreground">
                      <Users className="mx-auto mb-2 h-8 w-8 opacity-25" />
                      <p className="text-sm">Tidak ada pelanggan ditemukan</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  customers?.map((customer) => (
                    <TableRow key={customer.id} className="group">
                      <TableCell className="pl-6 font-medium">{customer.name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{customer.phone || "—"}</TableCell>
                      <TableCell className="max-w-[200px] truncate text-sm text-muted-foreground">{customer.address || "—"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{customer.email || "—"}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={customer.is_active
                            ? "text-xs text-green-700 bg-green-50 border-green-200 dark:bg-green-950/30 dark:text-green-400"
                            : "text-xs text-slate-500 bg-slate-100 border-slate-200 dark:bg-slate-800 dark:text-slate-400"}
                        >
                          {customer.is_active ? "Aktif" : "Nonaktif"}
                        </Badge>
                      </TableCell>
                      <TableCell className="pr-6">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => navigate(`/pelanggan/${customer.id}`)}
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
          </div>
        </CardContent>
      </Card>

      {/* Add Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] overflow-y-auto rounded-2xl sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Tambah Pelanggan</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nama *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nama pelanggan" />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Telepon</Label>
                <Input type="tel" inputMode="tel" autoComplete="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="08xxxxxxxxxx" />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="email@contoh.com" type="email" inputMode="email" autoComplete="email" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Alamat</Label>
              <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Alamat lengkap" />
            </div>
            <DialogFormActions
              onCancel={() => setDialogOpen(false)}
              onSave={handleSave}
              isPending={createCustomer.isPending}
            />
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
