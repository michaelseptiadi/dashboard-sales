import { useState } from "react";
import { DashboardLayout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { UserPlus, Pencil, UserX } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth, useStoresList } from "@/hooks/useAuth";
import { UserDialog } from "@/components/users/UserDialog";
import { ManageAccessDialog } from "@/components/users/ManageAccessDialog";
import { getStoreRoleLabel, useDeleteUser, useUserApiAccess, useUsers } from "@/hooks/useUserStoreRoles";
import type { BackendRoleName, StoreOption, UserRecord } from "@/types/users";

function roleBadgeVariant(role: BackendRoleName) {
  return role === "manager" ? "default" : "secondary";
}

export default function Users() {
  const [createOpen, setCreateOpen] = useState(false);
  const [editUserId, setEditUserId] = useState<string | null>(null);
  const [manageUserId, setManageUserId] = useState<string | null>(null);
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null);

  const { data: users = [], isLoading: usersLoading } = useUsers();
  const { data: allStores = [] } = useStoresList();
  const { selectedStore } = useAuth();
  const { canAccessUsers } = useUserApiAccess();
  const { toast } = useToast();
  const deleteUser = useDeleteUser();

  const storeOptions: StoreOption[] = allStores.map((store) => ({
    id: store.id,
    store_name: store.store_name,
  }));

  const selectedEditUser = users.find((user) => user.id === editUserId) ?? null;
  const selectedManageUser = users.find((user) => user.id === manageUserId) ?? null;
  const selectedDeleteUser = users.find((user) => user.id === deleteUserId) ?? null;

  const handleDelete = async () => {
    if (!deleteUserId) return;

    try {
      if (!selectedStore?.id) {
        throw new Error("Pilih toko terlebih dahulu");
      }

      await deleteUser.mutateAsync({
        storeId: selectedStore.id,
        userId: deleteUserId,
      });
      toast({ title: "Akses user berhasil dihapus dari toko" });
      setDeleteUserId(null);
    } catch (err) {
      toast({
        title: "Gagal menghapus akses user",
        description: (err as Error).message,
        variant: "destructive",
      });
    }
  };

  return (
    <DashboardLayout title="Manajemen User">
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">Daftar User</h2>
            <p className="text-sm text-muted-foreground">
              Kelola akun user, edit profil, dan atur akses toko mereka.
            </p>
          </div>
          <Button onClick={() => setCreateOpen(true)} disabled={!canAccessUsers}>
            <UserPlus className="mr-2 h-4 w-4" />
            Tambah User
          </Button>
        </div>

        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Akses Toko</TableHead>
                <TableHead className="w-56 text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {usersLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                    Memuat data...
                  </TableCell>
                </TableRow>
              ) : users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                    Belum ada user.
                  </TableCell>
                </TableRow>
              ) : (
                users.map((user: UserRecord) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.email}</TableCell>
                    <TableCell>{user.phone_number ?? "-"}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1.5">
                        {user.user_store_roles.length === 0 ? (
                          <span className="text-xs italic text-muted-foreground">
                            Tidak ada akses
                          </span>
                        ) : (
                          user.user_store_roles.map((assignment) => (
                            <Badge
                              key={assignment.id}
                              variant={roleBadgeVariant(assignment.role.name)}
                              className="text-xs"
                            >
                              {assignment.store?.store_name ?? assignment.store_id}: {getStoreRoleLabel(assignment.role.name)}
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
                          onClick={() => setManageUserId(user.id)}
                          disabled={!canAccessUsers}
                        >
                          Kelola Akses
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => setEditUserId(user.id)}
                          disabled={!canAccessUsers}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <UserDialog
        open={createOpen}
        mode="create"
        storeOptions={storeOptions}
        createStoreId={selectedStore?.id ?? null}
        onOpenChange={setCreateOpen}
      />

      {selectedEditUser && (
        <UserDialog
          open={!!editUserId}
          mode="edit"
          user={selectedEditUser}
          onOpenChange={(nextOpen) => {
            if (!nextOpen) setEditUserId(null);
          }}
        />
      )}

      {selectedManageUser && (
        <ManageAccessDialog
          user={selectedManageUser}
          open={!!manageUserId}
          onOpenChange={(nextOpen) => {
            if (!nextOpen) setManageUserId(null);
          }}
          allStores={storeOptions}
        />
      )}

      <AlertDialog
        open={!!deleteUserId}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) setDeleteUserId(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus User</AlertDialogTitle>
            <AlertDialogDescription>
              Akses user <span className="font-semibold">{selectedDeleteUser?.email}</span> pada
              toko yang sedang dipilih akan dihapus.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDelete}
              disabled={deleteUser.isPending}
            >
              {deleteUser.isPending ? "Menghapus..." : "Hapus"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}