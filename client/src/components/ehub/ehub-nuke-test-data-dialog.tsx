import { AlertTriangle, Loader2, Trash2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface NukeCounts {
  recipientsCount: number;
  messagesCount: number;
  testEmailsCount: number;
  slotsCount: number;
}

interface EhubNukeTestDataDialogProps {
  open: boolean;
  nukeCounts: NukeCounts | null;
  countsError: string | null;
  nukeEmailPattern: string;
  isPending: boolean;
  onOpenChange: (open: boolean) => void;
  onPatternChange: (value: string) => void;
  onConfirm: () => void;
}

export function EhubNukeTestDataDialog({
  open,
  nukeCounts,
  countsError,
  nukeEmailPattern,
  isPending,
  onOpenChange,
  onPatternChange,
  onConfirm,
}: EhubNukeTestDataDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="w-5 h-5" />
            Clear Test Data
          </AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently delete test recipients, messages, slots, and test emails. Sequences themselves will be preserved with stats reset to zero.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <Label htmlFor="nuke-email-pattern">Email Pattern (Optional)</Label>
            <Input
              id="nuke-email-pattern"
              data-testid="input-nuke-email-pattern"
              placeholder="e.g., michael@, %gmail.com, or leave blank for all"
              value={nukeEmailPattern}
              onChange={(event) => onPatternChange(event.target.value)}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Leave blank to delete ALL test recipients. Use % as wildcard (e.g., %@test.com)
            </p>
          </div>

          {nukeCounts && (
            <Alert>
              <AlertDescription className="space-y-2">
                <div className="font-medium mb-2">Preview (will be deleted):</div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>Recipients:</div>
                  <div className="font-mono">{nukeCounts.recipientsCount}</div>
                  <div>Messages:</div>
                  <div className="font-mono">{nukeCounts.messagesCount}</div>
                  <div>Slots:</div>
                  <div className="font-mono">{nukeCounts.slotsCount}</div>
                  <div>Test Emails:</div>
                  <div className="font-mono">{nukeCounts.testEmailsCount}</div>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {countsError && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{countsError}</AlertDescription>
            </Alert>
          )}

          {!nukeEmailPattern && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                ⚠️ <strong>WARNING:</strong> No email pattern specified. This will delete ALL recipients and messages. This cannot be undone!
              </AlertDescription>
            </Alert>
          )}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel data-testid="button-cancel-nuke">Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isPending}
            className="bg-destructive text-destructive-foreground hover-elevate active-elevate-2"
            data-testid="button-confirm-nuke"
            data-primary="true"
          >
            {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            <Trash2 className="w-4 h-4 mr-2" />
            Delete All
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
