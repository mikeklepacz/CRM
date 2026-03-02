import { Bomb, Loader2 } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

interface NukeCallDataDialogProps {
  open: boolean;
  isPending: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

export function NukeCallDataDialog({
  open,
  isPending,
  onOpenChange,
  onConfirm,
}: NukeCallDataDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent data-testid="dialog-nuke-call-data-confirmation">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-destructive">
            <Bomb className="h-5 w-5" />
            Clear All Call Test Data?
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-3 pt-2">
            <p>This will permanently delete:</p>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li>All call sessions (active, queued, completed)</li>
              <li>All call history records</li>
              <li>All call transcripts</li>
              <li>All call events</li>
              <li>All campaign targets</li>
              <li>Conversations from ElevenLabs (via API)</li>
            </ul>
            <p className="font-semibold text-destructive pt-2">
              This action cannot be undone!
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel data-testid="button-cancel-nuke-call-data">
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            data-testid="button-confirm-nuke-call-data"
            data-primary="true"
          >
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Nuking...
              </>
            ) : (
              <>
                <Bomb className="h-4 w-4 mr-2" />
                NUKE IT
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
