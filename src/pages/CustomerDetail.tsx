import { useState, useMemo, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { DialogFormActions } from "@/components/DialogFormActions";
import { TransactionStatusBadge } from "@/components/TransactionStatusBadge";
import { SalesOrderDetailDialog } from "@/components/SalesOrderDetailDialog";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency, formatDateWIB } from "@/lib/format";
import { useCustomerById, useCustomerTransactions, useUpdateCustomer } from "@/hooks/useCustomers";
import { TablePagination } from "@/components/TablePagination";
import {
  ArrowLeft, Pencil, User, Phone, MapPin, Mail,
  ShoppingBag, CreditCard, Wallet, TrendingDown, ExternalLink,
} from "lucide-react";

// ─── Customer Form Data ───────────────────────────────────────────────────────
interface CustomerFormData {
  name: string;
  phone: string;
  address: string;
  email: string;
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function CustomerDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const { data: customer, isLoading: loadingCustomer } = useCustomerById(id ?? null);
  const { data: transactions, isLoading: loadingTx } = useCustomerTransactions(id ?? null);
  const updateCustomer = useUpdateCustomer();

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const totalCount = transactions?.length ?? 0;
  const totalPages = Math.ceil(totalCount / pageSize);
  const startIndex = totalCount === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endIndex = Math.min(currentPage * pageSize, totalCount);

  const paginatedTransactions = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return transactions?.slice(start, start + pageSize) ?? [];
  }, [transactions, currentPage, pageSize]);

  useEffect(() => {
    setCurrentPage(1);
  }, [id, transactions?.length]);

  const [editOpen, setEditOpen] = useState(false);
  const [form, setForm] = useState<CustomerFormData>({ name: "", phone: "", address: "", email: "" });
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  const openEdit = () => {
    if (!customer) return;
    setForm({
      name: customer.name,
      phone: customer.phone ?? "",
      address: customer.address ?? "",
      email: customer.email ?? "",
    });
    setEditOpen(true);
  };

  const handleSave = async () => {
    if (!form.name) {
      toast({ title: "Nama pelanggan wajib diisi", variant: "destructive" });
      return;
    }
    try {
      await updateCustomer.mutateAsync({
        id: id!,
        name: form.name,
        phone: form.phone || null,
        address: form.address || null,
        email: form.email || null,
      });
      toast({ title: "Pelanggan berhasil diperbarui" });
      setEditOpen(false);
    } catch (error: any) {
      toast({ title: "Gagal menyimpan", description: error.message, variant: "destructive" });
    }
  };

  const handleToggleActive = async () => {
    if (!customer) return;
    try {
      await updateCustomer.mutateAsync({ id: id!, is_active: !customer.is_active });
      toast({ title: customer.is_active ? "Pelanggan dinonaktifkan" : "Pelanggan diaktifkan" });
    } catch (error: any) {
      toast({ title: "Gagal mengubah status", description: error.message, variant: "destructive" });
    }
  };

  // ── Derived stats ────────────────────────────────────────────────────────
  const totalTransactions = transactions?.length ?? 0;
  const totalSpend = transactions?.reduce((sum, t) => sum + Number(t.grand_total ?? 0), 0) ?? 0;
  const totalPayment = transactions?.reduce((sum, t) => sum + (Number(t.grand_total ?? 0) - Number(t.unpaid_transaction ?? 0)), 0) ?? 0;
  const totalDebt = transactions?.reduce((sum, t) => sum + Number(t.unpaid_transaction ?? 0), 0) ?? 0;

  const stats = [
    { label: "Total Transaksi", value: `${totalTransactions}x`, icon: ShoppingBag, color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-950/30" },
    { label: "Total Belanja", value: formatCurrency(totalSpend), icon: Wallet, color: "text-violet-600", bg: "bg-violet-50 dark:bg-violet-950/30" },
    { label: "Total Pembayaran", value: formatCurrency(totalPayment), icon: CreditCard, color: "text-green-600", bg: "bg-green-50 dark:bg-green-950/30" },
    { label: "Total Hutang", value: formatCurrency(totalDebt), icon: TrendingDown, color: "text-red-600", bg: "bg-red-50 dark:bg-red-950/30" },
  ];

  return (
    <DashboardLayout title="Detail Pelanggan">
      {/* Back button */}
      <Button variant="ghost" size="sm" className="mb-4 -ml-2" onClick={() => navigate("/pelanggan")}>
        <ArrowLeft className="mr-1 h-4 w-4" /> Kembali
      </Button>

      {loadingCustomer ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}
        </div>
      ) : !customer ? (
        <p className="text-muted-foreground">Pelanggan tidak ditemukan.</p>
      ) : (
        <div className="space-y-6">
          {/* ── Customer Info Card ─────────────────────────────────── */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                    <User className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{customer.name}</CardTitle>
                    <Badge
                      variant="outline"
                      className={customer.is_active
                        ? "mt-1 text-xs text-green-700 bg-green-50 border-green-200 dark:bg-green-950/30 dark:text-green-400"
                        : "mt-1 text-xs text-slate-500 bg-slate-100 border-slate-200 dark:bg-slate-800 dark:text-slate-400"}
                    >
                      {customer.is_active ? "Aktif" : "Nonaktif"}
                    </Badge>
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>{customer.is_active ? "Aktif" : "Nonaktif"}</span>
                    <Switch
                      checked={customer.is_active}
                      onCheckedChange={handleToggleActive}
                      disabled={updateCustomer.isPending}
                    />
                  </div>
                  <Button variant="outline" size="sm" onClick={openEdit}>
                    <Pencil className="mr-1 h-3.5 w-3.5" /> Edit
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="h-4 w-4 flex-shrink-0" />
                  <span>{customer.phone || "—"}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="h-4 w-4 flex-shrink-0" />
                  <span>{customer.email || "—"}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="h-4 w-4 flex-shrink-0" />
                  <span>{customer.address || "—"}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ── Stats ──────────────────────────────────────────────── */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {stats.map((s) => (
              <Card key={s.label}>
                <CardContent className="pt-5 pb-4">
                  <div className={`inline-flex items-center justify-center rounded-lg p-2 mb-3 ${s.bg}`}>
                    <s.icon className={`h-4 w-4 ${s.color}`} />
                  </div>
                  <p className="text-xs text-muted-foreground mb-0.5">{s.label}</p>
                  <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* ── Transaction Log ─────────────────────────────────────── */}
          <Card>
            <CardHeader className="px-6 pb-4 pt-5">
              <CardTitle className="text-base">Riwayat Transaksi</CardTitle>
            </CardHeader>
            <CardContent className="px-0 pb-0">
              {loadingTx ? (
                <div className="space-y-2 px-6 pb-6">
                  {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-t bg-muted/30">
                        <TableHead className="pl-6">Tanggal</TableHead>
                        <TableHead>Invoice</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead className="text-right">Bayar</TableHead>
                        <TableHead className="text-right">Hutang</TableHead>
                        <TableHead className="w-10 pr-6"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedTransactions.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="py-8 text-center text-muted-foreground pl-6 pr-6">
                            Belum ada transaksi
                          </TableCell>
                        </TableRow>
                      ) : (
                        paginatedTransactions.map((tx) => (
                          <TableRow
                            key={tx.id}
                            className={tx.unpaid_transaction > 0 ? "bg-red-50/50 dark:bg-red-950/10" : ""}
                          >
                            <TableCell className="pl-6 text-sm">
                              {formatDateWIB(tx.sales_date)}
                            </TableCell>
                            <TableCell className="font-mono text-xs">{tx.invoice_number}</TableCell>
                            <TableCell>
                              <TransactionStatusBadge status={tx.transaction_status} />
                            </TableCell>
                            <TableCell className="text-right font-medium">{formatCurrency(tx.grand_total)}</TableCell>
                            <TableCell className="text-right text-green-600 font-medium">
                              {formatCurrency(tx.grand_total - tx.unpaid_transaction)}
                            </TableCell>
                            <TableCell className={`text-right font-medium ${tx.unpaid_transaction > 0 ? "text-red-600" : "text-muted-foreground"}`}>
                              {tx.unpaid_transaction > 0 ? formatCurrency(tx.unpaid_transaction) : "—"}
                            </TableCell>
                            <TableCell className="pr-6">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => setSelectedOrderId(tx.id)}
                              >
                                <ExternalLink className="h-3.5 w-3.5" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
              {!loadingTx && totalCount > 0 && (
                <TablePagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                  startIndex={startIndex}
                  endIndex={endIndex}
                  totalCount={totalCount}
                  pageSize={pageSize}
                  onPageSizeChange={(size) => {
                    setPageSize(size);
                    setCurrentPage(1);
                  }}
                />
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Edit Dialog ─────────────────────────────────────────────── */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Pelanggan</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nama *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Nama pelanggan"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Telepon</Label>
                <Input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="08xxxxxxxxxx"
                />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="email@contoh.com"
                  type="email"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Alamat</Label>
              <Input
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                placeholder="Alamat lengkap"
              />
            </div>
            <DialogFormActions
              onCancel={() => setEditOpen(false)}
              onSave={handleSave}
              isPending={updateCustomer.isPending}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Transaction Detail Dialog ────────────────────────────────── */}
      <SalesOrderDetailDialog
        orderId={selectedOrderId}
        onClose={() => setSelectedOrderId(null)}
      />
    </DashboardLayout>
  );
}
