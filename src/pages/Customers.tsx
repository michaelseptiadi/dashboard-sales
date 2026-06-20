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
import { useCustomers, useCreateCustomer } from "@/hooks/useCustomers";
import { useDebounce } from "@/hooks/useDebounce";
import { Plus, Eye, Users } from "lucide-react";

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
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 500);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<CustomerFormData>(emptyForm);

  const { data: customers, isLoading } = useCustomers(debouncedSearch);
  const createCustomer = useCreateCustomer();

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
    } catch (error: any) {
      toast({ title: "Gagal menyimpan pelanggan", description: error.message, variant: "destructive" });
    }
  };

  return (
    <DashboardLayout title="Manajemen Pelanggan">
      <Card>
        <CardHeader className="px-6 pb-4 pt-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2.5">
              <CardTitle className="text-base">Daftar Pelanggan</CardTitle>
              {customers && (
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                  {customers.length}
                </span>
              )}
            </div>
            <Button size="sm" onClick={openCreate}>
              <Plus className="mr-1.5 h-4 w-4" /> Tambah Pelanggan
            </Button>
          </div>
          <div className="pt-1">
            <SearchInput
              placeholder="Cari nama atau telepon..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent className="px-0 pb-0">
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
        </CardContent>
      </Card>

      {/* Add Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tambah Pelanggan</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nama *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nama pelanggan" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Telepon</Label>
                <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="08xxxxxxxxxx" />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="email@contoh.com" type="email" />
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
