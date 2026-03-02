import { Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { EmailAccount } from "@/components/ehub/ehub.types";

interface EhubStrategySequenceComposerProps {
  name: string;
  senderEmailAccountId: string | null;
  emailAccounts: EmailAccount[] | undefined;
  isPending: boolean;
  onNameChange: (value: string) => void;
  onSenderEmailAccountChange: (value: string | null) => void;
  onSubmit: () => void;
}

export function EhubStrategySequenceComposer({
  name,
  senderEmailAccountId,
  emailAccounts,
  isPending,
  onNameChange,
  onSenderEmailAccountChange,
  onSubmit,
}: EhubStrategySequenceComposerProps) {
  return (
    <div className="p-3 border rounded-lg bg-muted/30">
      <Label className="text-sm font-medium">Create New Sequence</Label>
      <p className="text-xs text-muted-foreground mb-2">
        AI will generate email content based on your strategy
      </p>
      <div className="space-y-3">
        <Input
          placeholder="e.g., Cold Outreach Q1 2025"
          value={name}
          onChange={(event) => onNameChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && name) {
              onSubmit();
            }
          }}
          data-testid="input-sequence-name-inline"
        />
        <div>
          <Label htmlFor="senderEmailInline" className="text-xs">Send From</Label>
          <Select
            value={senderEmailAccountId || "__default__"}
            onValueChange={(value) => onSenderEmailAccountChange(value === "__default__" ? null : value)}
          >
            <SelectTrigger className="w-full" data-testid="select-sender-email-inline">
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
        </div>
        <Button
          onClick={onSubmit}
          disabled={!name || isPending}
          data-testid="button-create-sequence-inline"
          className="w-full"
        >
          {isPending ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Plus className="w-4 h-4 mr-2" />
          )}
          Create
        </Button>
      </div>
    </div>
  );
}
