import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface EhubTestSendDialogProps {
  open: boolean;
  testEmail: string;
  isPending: boolean;
  onOpenChange: (open: boolean) => void;
  onTestEmailChange: (value: string) => void;
  onCancel: () => void;
  onSubmit: () => void;
}

export function EhubTestSendDialog({
  open,
  testEmail,
  isPending,
  onOpenChange,
  onTestEmailChange,
  onCancel,
  onSubmit,
}: EhubTestSendDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Send Test Email</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <Label htmlFor="testEmail">Test Email Address</Label>
            <Input
              id="testEmail"
              data-testid="input-test-email"
              type="email"
              value={testEmail}
              onChange={(event) => onTestEmailChange(event.target.value)}
              placeholder="your.email@example.com"
            />
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onCancel} data-testid="button-cancel-test">
            Cancel
          </Button>
          <Button onClick={onSubmit} disabled={!testEmail || isPending} data-testid="button-submit-test">
            {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Send Test
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
