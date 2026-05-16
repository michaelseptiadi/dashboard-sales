import { Button } from "@/components/ui/button";

interface DialogFormActionsProps {
  onCancel: () => void;
  onSave: () => void;
  isPending?: boolean;
  saveLabel?: string;
  cancelLabel?: string;
}

export function DialogFormActions({
  onCancel,
  onSave,
  isPending = false,
  saveLabel = "Simpan",
  cancelLabel = "Batal",
}: DialogFormActionsProps) {
  return (
    <div className="flex justify-end gap-2">
      <Button variant="outline" onClick={onCancel} disabled={isPending}>
        {cancelLabel}
      </Button>
      <Button onClick={onSave} disabled={isPending}>
        {isPending ? "Menyimpan..." : saveLabel}
      </Button>
    </div>
  );
}
