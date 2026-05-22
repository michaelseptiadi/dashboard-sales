import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { UserPlus, Trash2, Plus, UserX } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type Profile = { id: string; email: string; created_at: string };
type StoreRole = {
  id: string;
  user_id: string;
  store_id: string;
  role: string;
  store: { store_name: string } | null;
};
type Store = { id: string; store_name: string };

function useProfiles() {
  return useQuery({
    queryKey: ["profiles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("email");
      if (error) throw error;
      return (data ?? []) as Profile[];
    },
  });
}

function useAllStoreRoles() {
  return useQuery({
    queryKey: ["all_user_store_roles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_store_roles")
        .select("*, store:stores(store_name)");
      if (error) throw error;
      return (data ?? []) as StoreRole[];
    },
  });
}

function useAllStores() {
  return useQuery({
    queryKey: ["all_stores"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stores")
        .select("id, store_name")
        .eq("is_active", true)
        .order("store_name");
      if (error) throw error;
      return (data ?? []) as Store[];
    },
  });
}

// ─── Add User Dialog ────────────────────────────────────────────────────────

function AddUserDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: window.location.origin },
      });
      if (error) throw error;
      // Upsert profile as fallback in case the DB trigger didn't fire yet
      if (data.user) {
        await supabase
          .from("profiles")
          .upsert({ id: data.user.id, email: data.user.email! });
      }
      await queryClient.invalidateQueries({ queryKey: ["profiles"] });
      toast({ title: "User berhasil dibuat", description: `Akun untuk ${email} telah dibuat.` });
      setEmail("");
      setPassword("");
      onOpenChange(false);
    } catch (err: unknown) {
      toast({
        title: "Gagal membuat user",
        description: (err as Error).message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Tambah User Baru</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label htmlFor="new-email">Email</Label>
            <Input
              id="new-email"
              type="email"
              placeholder="user@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="new-password">Password</Label>
            <Input
              id="new-password"
              type="password"
              placeholder="Minimal 6 karakter"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Batal
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Menyimpan..." : "Buat User"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Manage Access Dialog ────────────────────────────────────────────────────

function ManageAccessDialog({
  user,
  open,
  onOpenChange,
  storeRoles,
  allStores,
}: {
  user: Profile;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  storeRoles: StoreRole[];
  allStores: Store[];
}) {
  const [selectedStoreId, setSelectedStoreId] = useState("");
  const [selectedRole, setSelectedRole] = useState<"admin" | "cashier">("cashier");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const userRoles = storeRoles.filter((r) => r.user_id === user.id);
  const assignedStoreIds = new Set(userRoles.map((r) => r.store_id));
  const availableStores = allStores.filter((s) => !assignedStoreIds.has(s.id));

  const assignMutation = useMutation({
    mutationFn: async ({ storeId, role }: { storeId: string; role: string }) => {
      const { error } = await supabase
        .from("user_store_roles")
        .insert({ user_id: user.id, store_id: storeId, role });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all_user_store_roles"] });
      setSelectedStoreId("");
      toast({ title: "Akses berhasil ditambahkan" });
    },
    onError: (err: Error) => {
      toast({ title: "Gagal menambah akses", description: err.message, variant: "destructive" });
    },
  });

  const removeMutation = useMutation({
    mutationFn: async (roleId: string) => {
      const { error } = await supabase
        .from("user_store_roles")
        .delete()
        .eq("id", roleId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all_user_store_roles"] });
      toast({ title: "Akses berhasil dihapus" });
    },
    onError: (err: Error) => {
      toast({ title: "Gagal menghapus akses", description: err.message, variant: "destructive" });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Kelola Akses — {user.email}</DialogTitle>
        </DialogHeader>
        <div className="space-y-5 pt-2">
          {/* Current assignments */}
          <div>
            <p className="text-sm font-medium mb-2">Akses Saat Ini</p>
            {userRoles.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">
                Belum ada akses toko yang ditetapkan.
              </p>
            ) : (
              <div className="space-y-2">
                {userRoles.map((r) => (
                  <div
                    key={r.id}
                    className="flex items-center justify-between rounded-lg border px-3 py-2"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">
                        {r.store?.store_name ?? r.store_id}
                      </span>
                      <Badge variant={r.role === "admin" ? "default" : "secondary"}>
                        {r.role === "admin" ? "Admin" : "Kasir"}
                      </Badge>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => removeMutation.mutate(r.id)}
                      disabled={removeMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Add new assignment */}
          {availableStores.length > 0 && (
            <div>
              <p className="text-sm font-medium mb-2">Tambah Akses Baru</p>
              <div className="flex gap-2">
                <Select value={selectedStoreId} onValueChange={setSelectedStoreId}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Pilih toko..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableStores.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.store_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={selectedRole}
                  onValueChange={(v) => setSelectedRole(v as "admin" | "cashier")}
                >
                  <SelectTrigger className="w-28">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="cashier">Kasir</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  size="icon"
                  onClick={() =>
                    assignMutation.mutate({ storeId: selectedStoreId, role: selectedRole })
                  }
                  disabled={!selectedStoreId || assignMutation.isPending}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function Users() {
  const [addUserOpen, setAddUserOpen] = useState(false);
  const [manageUserId, setManageUserId] = useState<string | null>(null);
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null);

  const { data: profiles = [], isLoading: profilesLoading } = useProfiles();
  const { data: storeRoles = [] } = useAllStoreRoles();
  const { data: allStores = [] } = useAllStores();

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const selectedUser = profiles.find((p) => p.id === manageUserId);
  const userToDelete = profiles.find((p) => p.id === deleteUserId);

  const deleteMutation = useMutation({
    mutationFn: async (userId: string) => {
      // Remove all store role assignments first
      const { error: rolesError } = await supabase
        .from("user_store_roles")
        .delete()
        .eq("user_id", userId);
      if (rolesError) throw rolesError;
      // Remove profile (user loses app access)
      const { error: profileError } = await supabase
        .from("profiles")
        .delete()
        .eq("id", userId);
      if (profileError) throw profileError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profiles"] });
      queryClient.invalidateQueries({ queryKey: ["all_user_store_roles"] });
      toast({ title: "User berhasil dihapus" });
      setDeleteUserId(null);
    },
    onError: (err: Error) => {
      toast({ title: "Gagal menghapus user", description: err.message, variant: "destructive" });
    },
  });

  return (
    <DashboardLayout title="Manajemen User">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Daftar User</h2>
            <p className="text-sm text-muted-foreground">
              Kelola akun user dan akses toko mereka.
            </p>
          </div>
          <Button onClick={() => setAddUserOpen(true)}>
            <UserPlus className="h-4 w-4 mr-2" />
            Tambah User
          </Button>
        </div>

        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Akses Toko</TableHead>
                <TableHead className="w-36 text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {profilesLoading ? (
                <TableRow>
                  <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">
                    Memuat data...
                  </TableCell>
                </TableRow>
              ) : profiles.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">
                    Belum ada user.
                  </TableCell>
                </TableRow>
              ) : (
                profiles.map((profile) => {
                  const roles = storeRoles.filter((r) => r.user_id === profile.id);
                  return (
                    <TableRow key={profile.id}>
                      <TableCell className="font-medium">{profile.email}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1.5">
                          {roles.length === 0 ? (
                            <span className="text-xs text-muted-foreground italic">
                              Tidak ada akses
                            </span>
                          ) : (
                            roles.map((r) => (
                              <Badge
                                key={r.id}
                                variant={r.role === "admin" ? "default" : "secondary"}
                                className="text-xs"
                              >
                                {r.store?.store_name ?? r.store_id}:{" "}
                                {r.role === "admin" ? "Admin" : "Kasir"}
                              </Badge>
                            ))
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setManageUserId(profile.id)}
                          >
                            Kelola Akses
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => setDeleteUserId(profile.id)}
                          >
                            <UserX className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <AddUserDialog open={addUserOpen} onOpenChange={setAddUserOpen} />

      {selectedUser && (
        <ManageAccessDialog
          user={selectedUser}
          open={!!manageUserId}
          onOpenChange={(v) => { if (!v) setManageUserId(null); }}
          storeRoles={storeRoles}
          allStores={allStores}
        />
      )}

      <AlertDialog open={!!deleteUserId} onOpenChange={(v) => { if (!v) setDeleteUserId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus User</AlertDialogTitle>
            <AlertDialogDescription>
              Akun <span className="font-semibold">{userToDelete?.email}</span> akan dihapus dari
              aplikasi beserta semua akses tokonya. Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteUserId && deleteMutation.mutate(deleteUserId)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Menghapus..." : "Hapus"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
