import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { DelayDialogState } from "@/components/ehub/ehub-queue.types";

type Props = {
  delayDialog: DelayDialogState;
  delayMutation: any;
  setDelayDialog: (state: DelayDialogState) => void;
};

export function EhubDelayDialog({ delayDialog, delayMutation, setDelayDialog }: Props) {
  return (
    <Dialog open={delayDialog.open} onOpenChange={(open) => setDelayDialog({ ...delayDialog, open })}>
      <DialogContent data-testid="dialog-delay">
        <DialogHeader>
          <DialogTitle>Delay Email Send</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="delay-hours">Delay by (hours)</Label>
            <Input
              id="delay-hours"
              type="number"
              min="0.1"
              step="0.5"
              value={delayDialog.hours}
              onChange={(e) => {
                const val = e.target.value;
                if (val === "" || val === ".") {
                  setDelayDialog({ ...delayDialog, hours: val as any });
                  return;
                }
                const parsed = parseFloat(val);
                if (isNaN(parsed)) return;
                setDelayDialog({ ...delayDialog, hours: parsed });
              }}
              onBlur={() => {
                if ((delayDialog.hours as any) === "" || (delayDialog.hours as any) === "." || delayDialog.hours === (null as any)) {
                  setDelayDialog({ ...delayDialog, hours: 1 });
                } else {
                  const val = typeof delayDialog.hours === "string" ? parseFloat(delayDialog.hours) : delayDialog.hours;
                  if (val < 0.1) {
                    setDelayDialog({ ...delayDialog, hours: 0.1 });
                  }
                }
              }}
              data-testid="input-delay-hours"
            />
            <p className="text-sm text-muted-foreground mt-1">Pushes back the next send time for this recipient</p>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setDelayDialog({ open: false, recipientId: null, hours: 1 })}
              data-testid="button-cancel-delay"
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (delayDialog.recipientId) {
                  delayMutation.mutate({ recipientId: delayDialog.recipientId, hours: delayDialog.hours });
                }
              }}
              disabled={delayMutation.isPending || !delayDialog.recipientId}
              data-testid="button-confirm-delay"
            >
              {delayMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Delaying...
                </>
              ) : (
                <>Delay Send</>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
