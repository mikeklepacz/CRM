import { Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface EhubFollowUpDialogProps {
  open: boolean;
  subject: string;
  body: string;
  selectedTestEmailId: string | null;
  isPending: boolean;
  onOpenChange: (open: boolean) => void;
  onSubjectChange: (value: string) => void;
  onBodyChange: (value: string) => void;
  onCancel: () => void;
  onSubmit: () => void;
}

export function EhubFollowUpDialog({
  open,
  subject,
  body,
  selectedTestEmailId,
  isPending,
  onOpenChange,
  onSubjectChange,
  onBodyChange,
  onCancel,
  onSubmit,
}: EhubFollowUpDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Send Threaded Follow-up</DialogTitle>
          <p className="text-sm text-muted-foreground">
            This email will be sent in the same Gmail thread
          </p>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="followup-subject">Subject</Label>
            <Input
              id="followup-subject"
              value={subject}
              onChange={(event) => onSubjectChange(event.target.value)}
              placeholder="Re: Original subject"
              data-testid="input-followup-subject"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="followup-body">Email Body (HTML)</Label>
            <Textarea
              id="followup-body"
              value={body}
              onChange={(event) => onBodyChange(event.target.value)}
              placeholder="Follow-up message content"
              rows={8}
              data-testid="input-followup-body"
            />
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onCancel} data-testid="button-cancel-followup">
            Cancel
          </Button>
          <Button
            onClick={onSubmit}
            disabled={!selectedTestEmailId || !subject || !body || isPending}
            data-testid="button-submit-followup"
          >
            {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            <Send className="w-4 h-4 mr-2" />
            Send Follow-up
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
