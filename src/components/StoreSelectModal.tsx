import { Building2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth, useStoresList } from "@/hooks/useAuth";

export function StoreSelectModal() {
  const { user, selectedStore, setSelectedStore, storeModalOpen, setStoreModalOpen } = useAuth();
  const { data: stores, isLoading } = useStoresList();

  const open = (!!user && !selectedStore) || storeModalOpen;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (selectedStore) setStoreModalOpen(v); }}>
      <DialogContent
        className="sm:max-w-md"
        onPointerDownOutside={(e) => { if (!selectedStore) e.preventDefault(); }}
        onEscapeKeyDown={(e) => { if (!selectedStore) e.preventDefault(); }}
        hideCloseButton={!selectedStore}
      >
        <DialogHeader>
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-primary">
            <Building2 className="h-6 w-6 text-primary-foreground" />
          </div>
          <DialogTitle className="text-center">Pilih Toko</DialogTitle>
          <DialogDescription className="text-center">
            Pilih toko yang ingin Anda kelola untuk melanjutkan.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-2 flex flex-col gap-2">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))
          ) : stores && stores.filter((s) => s.is_active).length > 0 ? (
            stores
              .filter((s) => s.is_active)
              .map((store) => (
                <Button
                  key={store.id}
                  variant="outline"
                  className="h-14 justify-start gap-3 text-left"
                  onClick={() => setSelectedStore(store)}
                >
                  <Building2 className="h-5 w-5 shrink-0 text-primary" />
                  <div className="flex flex-col items-start">
                    <span className="font-medium">{store.store_name}</span>
                    <span className="text-xs text-muted-foreground">{store.address}</span>
                  </div>
                </Button>
              ))
          ) : (
            <p className="py-4 text-center text-sm text-muted-foreground">
              Tidak ada toko yang tersedia.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
