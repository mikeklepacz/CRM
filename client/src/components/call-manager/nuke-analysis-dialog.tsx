import { Bomb, Loader2 } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

interface NukeAnalysisDialogProps {
  open: boolean;
  isPending: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

export function NukeAnalysisDialog({
  open,
  isPending,
  onOpenChange,
  onConfirm,
}: NukeAnalysisDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent data-testid="dialog-nuke-confirmation">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-destructive">
            <Bomb className="h-5 w-5" />
            Clear All Analysis Data?
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-3 pt-2">
            <p>This will permanently delete:</p>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li>All AI Insights (Wick Coach analysis)</li>
              <li>All KB Change Proposals (Aligner suggestions)</li>
              <li>All objections, patterns, and recommendations</li>
              <li>Reset all call timestamps (allows re-analysis)</li>
            </ul>
            <p className="font-semibold text-destructive pt-2">
              This action cannot be undone!
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel data-testid="button-cancel-nuke">
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            data-testid="button-confirm-nuke"
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
