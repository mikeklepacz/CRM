import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface EhubImportDialogProps {
  open: boolean;
  sheetId: string;
  isPending: boolean;
  onOpenChange: (open: boolean) => void;
  onSheetIdChange: (value: string) => void;
  onCancel: () => void;
  onSubmit: () => void;
}

export function EhubImportDialog({
  open,
  sheetId,
  isPending,
  onOpenChange,
  onSheetIdChange,
  onCancel,
  onSubmit,
}: EhubImportDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Import Recipients from Google Sheets</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <Label htmlFor="sheetId">Google Sheet ID</Label>
            <Input
              id="sheetId"
              data-testid="input-sheet-id"
              value={sheetId}
              onChange={(event) => onSheetIdChange(event.target.value)}
              placeholder="Paste Google Sheet ID here"
            />
            <p className="text-sm text-muted-foreground mt-1">
              Emails will be imported from Column K (auto-deduplication enabled)
            </p>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onCancel} data-testid="button-cancel-import">
            Cancel
          </Button>
          <Button onClick={onSubmit} disabled={!sheetId || isPending} data-testid="button-submit-import">
            {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Import Recipients
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
