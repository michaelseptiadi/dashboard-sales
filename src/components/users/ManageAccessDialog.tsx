import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Trash2, Plus } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useUserApiAccess, useAssignStoreUserRole, useRemoveStoreUserRole, useUpdateStoreUserRole, getStoreRoleLabel } from "@/hooks/useUserStoreRoles";
import {
  type BackendRoleName,
  type StoreOption,
  type UserRecord,
} from "@/types/users";

export interface ManageAccessDialogProps {
  user: UserRecord;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  allStores: StoreOption[];
}

function roleBadgeVariant(role: BackendRoleName) {
  return role === "manager" ? "default" : "secondary";
}

export function ManageAccessDialog({ user, open, onOpenChange, allStores }: ManageAccessDialogProps) {
  const { actorRole, canAccessStoreRoles } = useUserApiAccess();
  const { selectedStore } = useAuth();
  const currentStoreId = selectedStore?.id;

  const [selectedStoreId, setSelectedStoreId] = useState("");
  const [selectedRole, setSelectedRole] = useState<BackendRoleName>(
    actorRole === "manager" ? "staff" : "manager",
  );
  const { toast } = useToast();
  const assignMutation = useAssignStoreUserRole();
  const updateMutation = useUpdateStoreUserRole();
  const removeMutation = useRemoveStoreUserRole();

  const rawUserRoles = user.user_store_roles ?? [];
  const userRoles = actorRole === "manager"
    ? rawUserRoles.filter((role) => role.store_id === currentStoreId)
    : rawUserRoles;

  const assignedStoreIds = new Set(userRoles.map((role) => role.store_id));
  const rawAvailableStores = allStores.filter((store) => !assignedStoreIds.has(store.id));
  const availableStores = actorRole === "manager"
    ? rawAvailableStores.filter((store) => store.id === currentStoreId)
    : rawAvailableStores;

  const availableRoles: BackendRoleName[] = actorRole === "manager" ? ["staff"] : ["manager", "staff"];

  useEffect(() => {
    if (!open) {
      setSelectedStoreId(actorRole === "manager" ? currentStoreId ?? "" : "");
      setSelectedRole(actorRole === "manager" ? "staff" : "manager");
    }
  }, [open, actorRole, currentStoreId]);

  const handleAssign = async () => {
    try {
      await assignMutation.mutateAsync({
        storeId: selectedStoreId,
        userId: user.id,
        storeRole: selectedRole,
      });
      setSelectedStoreId("");
      toast({ title: "Akses berhasil ditambahkan" });
    } catch (err) {
      toast({
        title: "Gagal menambah akses",
        description: (err as Error).message,
        variant: "destructive",
      });
    }
  };

  const handleUpdateRole = async (storeId: string, storeRole: BackendRoleName) => {
    try {
      await updateMutation.mutateAsync({
        storeId,
        userId: user.id,
        storeRole,
      });
      toast({ title: "Akses berhasil diperbarui" });
    } catch (err) {
      toast({
        title: "Gagal memperbarui akses",
        description: (err as Error).message,
        variant: "destructive",
      });
    }
  };

  const handleRemove = async (storeId: string) => {
    try {
      await removeMutation.mutateAsync({ storeId, userId: user.id });
      toast({ title: "Akses berhasil dihapus" });
    } catch (err) {
      toast({
        title: "Gagal menghapus akses",
        description: (err as Error).message,
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Kelola Akses — {user.email}</DialogTitle>
        </DialogHeader>
        <div className="space-y-5 pt-2">
          <div>
            <p className="mb-2 text-sm font-medium">Akses Saat Ini</p>
            {userRoles.length === 0 ? (
              <p className="text-sm italic text-muted-foreground">
                Belum ada akses toko yang ditetapkan.
              </p>
            ) : (
              <div className="space-y-2">
                {userRoles.map((assignment) => (
                  <div
                    key={assignment.id}
                    className="flex flex-col gap-3 rounded-lg border px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                      <div className="text-sm font-medium">
                        {assignment.store?.store_name ?? selectedStore?.store_name}
                      </div>
                      <Badge variant={roleBadgeVariant(assignment.role.name)}>
                        {getStoreRoleLabel(assignment.role.name)}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <Select
                        value={assignment.role.name}
                        onValueChange={(value) => handleUpdateRole(assignment.store_id, value as BackendRoleName)}
                        disabled={!canAccessStoreRoles || updateMutation.isPending || (actorRole === "manager" && assignment.role.name !== "staff")}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {availableRoles.map((role) => (
                            <SelectItem key={role} value={role}>
                              {getStoreRoleLabel(role)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => handleRemove(assignment.store_id)}
                        disabled={!canAccessStoreRoles || removeMutation.isPending || (actorRole === "manager" && assignment.role.name !== "staff")}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {availableStores.length > 0 && (
            <div>
              <p className="mb-2 text-sm font-medium">Tambah Akses Baru</p>
              <div className="flex gap-2">
                <Select value={selectedStoreId} onValueChange={setSelectedStoreId}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Pilih toko..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableStores.map((store) => (
                      <SelectItem key={store.id} value={store.id}>
                        {store.store_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={selectedRole} onValueChange={(value) => setSelectedRole(value as BackendRoleName)}>
                  <SelectTrigger className="w-28">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {availableRoles.map((role) => (
                      <SelectItem key={role} value={role}>
                        {getStoreRoleLabel(role)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  size="icon"
                  onClick={handleAssign}
                  disabled={!selectedStoreId || assignMutation.isPending || !canAccessStoreRoles}
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