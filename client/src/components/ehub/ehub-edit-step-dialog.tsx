import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface EhubEditStepDialogProps {
  open: boolean;
  subject: string;
  body: string;
  guidance: string;
  editingStepId: string | null;
  isPending: boolean;
  onOpenChange: (open: boolean) => void;
  onSubjectChange: (value: string) => void;
  onBodyChange: (value: string) => void;
  onGuidanceChange: (value: string) => void;
  onCancel: () => void;
  onSubmit: () => void;
}

export function EhubEditStepDialog({
  open,
  subject,
  body,
  guidance,
  editingStepId,
  isPending,
  onOpenChange,
  onSubjectChange,
  onBodyChange,
  onGuidanceChange,
  onCancel,
  onSubmit,
}: EhubEditStepDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit Step Email Template</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Subject Template (leave blank for AI-generated)</Label>
            <Input
              value={subject}
              onChange={(event) => onSubjectChange(event.target.value)}
              placeholder="e.g., Following up on my previous message"
              data-testid="input-step-subject"
            />
          </div>
          <div>
            <Label>Body Template (leave blank for AI-generated)</Label>
            <Textarea
              value={body}
              onChange={(event) => onBodyChange(event.target.value)}
              placeholder="Enter the email body template..."
              rows={8}
              data-testid="input-step-body"
            />
          </div>
          <div>
            <Label>AI Guidance (optional hints for AI content generation)</Label>
            <Textarea
              value={guidance}
              onChange={(event) => onGuidanceChange(event.target.value)}
              placeholder="e.g., Focus on urgency, mention limited time offer"
              rows={3}
              data-testid="input-step-guidance"
            />
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button
              onClick={onSubmit}
              disabled={!editingStepId || isPending}
              data-testid="button-save-step-template"
            >
              {isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Save Template
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
