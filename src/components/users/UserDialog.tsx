import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  type BackendRoleName,
  type StoreOption,
  type UpdateUserPayload,
  type UserRecord,
} from "@/types/users";
import { useCreateStoreUser, useUpdateUser } from "@/hooks/useUserStoreRoles";

export interface UserDialogProps {
  open: boolean;
  mode: "create" | "edit";
  user?: UserRecord | null;
  storeOptions?: StoreOption[];
  createStoreId?: string | null;
  onOpenChange: (open: boolean) => void;
}

export function UserDialog({ open, mode, user, storeOptions = [], createStoreId, onOpenChange }: UserDialogProps) {
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [selectedStoreId, setSelectedStoreId] = useState("");
  const [storeRole, setStoreRole] = useState<BackendRoleName>("manager");
  const { toast } = useToast();
  const createStoreUser = useCreateStoreUser();
  const updateUser = useUpdateUser();

  const isEditMode = mode === "edit";
  const loading = createStoreUser.isPending || updateUser.isPending;
  const canSubmitCreate = !!selectedStoreId && !!email && !!phoneNumber && !!password;

  useEffect(() => {
    if (!open) return;

    if (isEditMode && user) {
      setEmail(user.email);
      setPhoneNumber(user.phone_number ?? "");
      setName(user.name ?? "");
      setPassword("");
      return;
    }

    setEmail("");
    setPhoneNumber("");
    setName("");
    setPassword("");
    setSelectedStoreId(createStoreId ?? storeOptions[0]?.id ?? "");
    setStoreRole("manager");
  }, [open, isEditMode, user, createStoreId, storeOptions]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (isEditMode) {
        if (!user) throw new Error("User tidak ditemukan");

        const payload: UpdateUserPayload & { id: string } = {
          id: user.id,
          email,
          phone_number: phoneNumber,
          name: name || undefined,
          ...(password ? { password } : {}),
        };

        await updateUser.mutateAsync(payload);
        toast({ title: "User berhasil diperbarui" });
      } else {
        const targetStoreId = selectedStoreId || createStoreId;
        if (!targetStoreId) {
          throw new Error("Pilih toko terlebih dahulu");
        }

        await createStoreUser.mutateAsync({
          storeId: targetStoreId,
          email,
          phone_number: phoneNumber,
          name: name || undefined,
          password,
          storeRole,
        });
        toast({ title: "User berhasil dibuat", description: `Akun untuk ${email} telah dibuat.` });
      }

      onOpenChange(false);
    } catch (err) {
      toast({
        title: isEditMode ? "Gagal memperbarui user" : "Gagal membuat user",
        description: (err as Error).message,
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditMode ? "Edit User" : "Tambah User Baru"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {!isEditMode && (
            <div className="space-y-3 rounded-lg border bg-muted/20 p-3">
              <div className="space-y-1.5">
                <Label>Store</Label>
                <Select value={selectedStoreId} onValueChange={setSelectedStoreId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih toko" />
                  </SelectTrigger>
                  <SelectContent>
                    {storeOptions.map((store) => (
                      <SelectItem key={store.id} value={store.id}>
                        {store.store_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">User akan dibuat langsung di toko ini.</p>
              </div>

              <div className="space-y-1.5">
                <Label>Role Toko</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant={storeRole === "manager" ? "default" : "outline"}
                    onClick={() => setStoreRole("manager")}
                  >
                    Manager
                  </Button>
                  <Button
                    type="button"
                    variant={storeRole === "staff" ? "default" : "outline"}
                    onClick={() => setStoreRole("staff")}
                  >
                    Kasir
                  </Button>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="user-name">Nama</Label>
              <Input
                id="user-name"
                type="text"
                placeholder="Contoh: John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="user-phone">Nomor HP</Label>
              <Input
                id="user-phone"
                type="text"
                placeholder="62812345678"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                required
                inputMode="tel"
                autoComplete="tel"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="user-email">Email</Label>
              <Input
                id="user-email"
                type="email"
                placeholder="user@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="user-password">Password {isEditMode ? "(opsional)" : ""}</Label>
              <Input
                id="user-password"
                type="password"
                placeholder={isEditMode ? "Kosongkan jika tidak diubah" : "Minimal 8 karakter"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required={!isEditMode}
                minLength={isEditMode ? undefined : 8}
                autoComplete={isEditMode ? "new-password" : "new-password"}
              />
              {!isEditMode && (
                <p className="text-xs text-muted-foreground">Gunakan minimal 8 karakter.</p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Batal
            </Button>
            <Button type="submit" disabled={loading || (!isEditMode && !canSubmitCreate)}>
              {loading ? "Menyimpan..." : isEditMode ? "Simpan Perubahan" : "Buat User"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}