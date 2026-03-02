import { Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { EmailAccount } from "@/components/ehub/ehub.types";

interface EhubCreateSequenceDialogProps {
  open: boolean;
  name: string;
  senderEmailAccountId: string | null;
  emailAccounts: EmailAccount[] | undefined;
  isPending: boolean;
  onOpenChange: (open: boolean) => void;
  onNameChange: (value: string) => void;
  onSenderEmailAccountChange: (value: string | null) => void;
  onCancel: () => void;
  onSubmit: () => void;
}

export function EhubCreateSequenceDialog({
  open,
  name,
  senderEmailAccountId,
  emailAccounts,
  isPending,
  onOpenChange,
  onNameChange,
  onSenderEmailAccountChange,
  onCancel,
  onSubmit,
}: EhubCreateSequenceDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button data-testid="button-create-sequence">
          <Plus className="w-4 h-4 mr-2" />
          Create Sequence
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Create AI Email Sequence</DialogTitle>
          <p className="text-sm text-muted-foreground">
            AI will generate all email content based on your campaign strategy
          </p>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <Label htmlFor="name">Sequence Name</Label>
            <Input
              id="name"
              data-testid="input-sequence-name"
              value={name}
              onChange={(event) => onNameChange(event.target.value)}
              placeholder="e.g., Cold Outreach Q1 2025"
            />
          </div>
          <div>
            <Label htmlFor="senderEmail">Send From</Label>
            <Select
              value={senderEmailAccountId || "__default__"}
              onValueChange={(value) => onSenderEmailAccountChange(value === "__default__" ? null : value)}
            >
              <SelectTrigger className="w-full" data-testid="select-sender-email">
                <SelectValue placeholder="Select email account (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__default__">Use default account</SelectItem>
                {emailAccounts?.filter((account) => account.status === "active").map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    {account.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground mt-1">
              Select which Gmail account sends emails for this sequence
            </p>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onCancel} data-testid="button-cancel-create">
            Cancel
          </Button>
          <Button
            onClick={onSubmit}
            disabled={!name || isPending}
            data-testid="button-submit-create"
            data-primary="true"
          >
            {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Create Sequence
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
