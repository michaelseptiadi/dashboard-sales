import { useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useCustomers, useCreateCustomer, useUpdateCustomer } from "@/hooks/useCustomers";
import { Plus, Search, Pencil } from "lucide-react";

interface CustomerFormData {
  name: string;
  phone: string;
  address: string;
  email: string;
}

const emptyForm: CustomerFormData = { name: "", phone: "", address: "", email: "" };

export default function Customers() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<CustomerFormData>(emptyForm);

  const { data: customers, isLoading } = useCustomers(search);
  const createCustomer = useCreateCustomer();
  const updateCustomer = useUpdateCustomer();

  const openCreate = () => {
    setEditId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (customer: any) => {
    setEditId(customer.id);
    setForm({
      name: customer.name,
      phone: customer.phone || "",
      address: customer.address || "",
      email: customer.email || "",
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name) {
      toast({ title: "Nama pelanggan wajib diisi", variant: "destructive" });
      return;
    }
    try {
      if (editId) {
        await updateCustomer.mutateAsync({
          id: editId,
          ...form,
          phone: form.phone || null,
          address: form.address || null,
          email: form.email || null,
        });
        toast({ title: "Pelanggan berhasil diperbarui" });
      } else {
        await createCustomer.mutateAsync({
          ...form,
          phone: form.phone || null,
          address: form.address || null,
          email: form.email || null,
        });
        toast({ title: "Pelanggan berhasil ditambahkan" });
      }
      setDialogOpen(false);
    } catch (error: any) {
      toast({ title: "Gagal menyimpan pelanggan", description: error.message, variant: "destructive" });
    }
  };

  const handleToggleActive = async (id: string, currentActive: boolean) => {
    try {
      await updateCustomer.mutateAsync({ id, is_active: !currentActive });
    } catch (error: any) {
      toast({ title: "Gagal mengubah status", description: error.message, variant: "destructive" });
    }
  };

  return (
    <DashboardLayout title="Manajemen Pelanggan">
      {/* Search */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari nama atau telepon..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button onClick={openCreate}>
              <Plus className="mr-1 h-4 w-4" /> Tambah Pelanggan
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Customers Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Daftar Pelanggan</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama</TableHead>
                  <TableHead>Telepon</TableHead>
                  <TableHead>Alamat</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customers?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                      Tidak ada pelanggan ditemukan
                    </TableCell>
                  </TableRow>
                ) : (
                  customers?.map((customer) => (
                    <TableRow key={customer.id}>
                      <TableCell className="font-medium">{customer.name}</TableCell>
                      <TableCell>{customer.phone || "-"}</TableCell>
                      <TableCell className="max-w-[200px] truncate">{customer.address || "-"}</TableCell>
                      <TableCell>{customer.email || "-"}</TableCell>
                      <TableCell>
                        <Switch
                          checked={customer.is_active}
                          onCheckedChange={() => handleToggleActive(customer.id, customer.is_active)}
                        />
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => openEdit(customer)}>
                          <Pencil className="h-4 w-4" />
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

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editId ? "Edit Pelanggan" : "Tambah Pelanggan"}</DialogTitle>
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
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Batal</Button>
              <Button onClick={handleSave} disabled={createCustomer.isPending || updateCustomer.isPending}>
                {(createCustomer.isPending || updateCustomer.isPending) ? "Menyimpan..." : "Simpan"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
