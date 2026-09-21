import { useState } from "react";
import { Plus, ReceiptText, Ban } from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useCreateExpense, useExpenseCategories, useExpenses, useVoidExpense } from "@/hooks/useExpenses";

const money = (value: number | string) => `Rp ${Number(value || 0).toLocaleString("id-ID")}`;

export default function Expenses() {
  const { toast } = useToast();
  const { data: categories = [] } = useExpenseCategories();
  const { data: expenses = [], isLoading } = useExpenses();
  const createExpense = useCreateExpense();
  const voidExpense = useVoidExpense();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ category_id: "", expense_date: new Date().toISOString().slice(0, 10), amount: "", payment_method: "Cash", description: "", reference_no: "" });

  const save = async () => {
    if (!form.category_id || !form.amount || Number(form.amount) <= 0) {
      toast({ title: "Kategori dan jumlah wajib diisi", variant: "destructive" });
      return;
    }
    try {
      await createExpense.mutateAsync({ ...form, amount: Number(form.amount) });
      toast({ title: "Pengeluaran berhasil dicatat" });
      setOpen(false);
      setForm({ category_id: "", expense_date: new Date().toISOString().slice(0, 10), amount: "", payment_method: "Cash", description: "", reference_no: "" });
    } catch (error) { toast({ title: "Gagal mencatat pengeluaran", description: (error as Error).message, variant: "destructive" }); }
  };

  const cancel = async (id: string) => {
    const reason = prompt("Alasan pembatalan pengeluaran:");
    if (!reason?.trim()) return;
    try { await voidExpense.mutateAsync({ id, reason }); toast({ title: "Pengeluaran dibatalkan" }); }
    catch (error) { toast({ title: "Gagal membatalkan pengeluaran", description: (error as Error).message, variant: "destructive" }); }
  };

  const total = expenses.filter((e) => e.status === "POSTED").reduce((sum, e) => sum + Number(e.amount), 0);
  return <DashboardLayout title="Pengeluaran">
    <div className="space-y-5">
      <div className="flex items-end justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">Arus kas keluar</p><h1 className="mt-1 text-2xl font-extrabold">Pengeluaran</h1><p className="mt-1 text-sm text-muted-foreground">Catat biaya operasional toko tanpa mengubah riwayat penjualan.</p></div><Button onClick={() => setOpen(true)}><Plus className="mr-1.5 h-4 w-4" />Tambah</Button></div>
      <Card><CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-base"><ReceiptText className="h-4 w-4 text-amber-600" />Total tercatat</CardTitle></CardHeader><CardContent><p className="text-2xl font-extrabold text-amber-600">{money(total)}</p></CardContent></Card>
      <Card><CardContent className="p-0"><div className="divide-y">{isLoading ? <p className="p-6 text-sm text-muted-foreground">Memuat pengeluaran...</p> : expenses.length === 0 ? <p className="p-8 text-center text-sm text-muted-foreground">Belum ada pengeluaran.</p> : expenses.map((expense) => <div key={expense.id} className="flex items-center justify-between gap-3 p-4"><div className="min-w-0"><p className="font-semibold">{expense.category.name}</p><p className="truncate text-xs text-muted-foreground">{new Date(expense.expense_date).toLocaleDateString("id-ID")} · {expense.payment_method}{expense.description ? ` · ${expense.description}` : ""}</p></div><div className="flex shrink-0 items-center gap-2"><div className="text-right"><p className={`font-bold ${expense.status === "VOID" ? "text-muted-foreground line-through" : "text-foreground"}`}>{money(expense.amount)}</p><p className="text-[10px] font-semibold text-muted-foreground">{expense.status}</p></div>{expense.status === "POSTED" && <Button variant="ghost" size="icon" title="Batalkan" onClick={() => cancel(expense.id)}><Ban className="h-4 w-4 text-destructive" /></Button>}</div></div>)}</div></CardContent></Card>
    </div>
    <Dialog open={open} onOpenChange={setOpen}><DialogContent className="max-h-[92dvh] overflow-y-auto rounded-2xl sm:max-w-md"><DialogHeader><DialogTitle>Tambah Pengeluaran</DialogTitle></DialogHeader><div className="space-y-4"><div><Label>Kategori</Label><Select value={form.category_id} onValueChange={(v) => setForm({ ...form, category_id: v })}><SelectTrigger><SelectValue placeholder="Pilih kategori" /></SelectTrigger><SelectContent>{categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select></div><div><Label>Tanggal</Label><Input type="date" value={form.expense_date} onChange={(e) => setForm({ ...form, expense_date: e.target.value })} /></div><div><Label>Jumlah</Label><Input inputMode="decimal" type="number" min="0.01" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="0" /></div><div><Label>Metode bayar</Label><Input value={form.payment_method} onChange={(e) => setForm({ ...form, payment_method: e.target.value })} /></div><div><Label>Keterangan</Label><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Contoh: listrik toko" /></div><Button className="w-full" onClick={save} disabled={createExpense.isPending}>{createExpense.isPending ? "Menyimpan..." : "Simpan Pengeluaran"}</Button></div></DialogContent></Dialog>
  </DashboardLayout>;
}
