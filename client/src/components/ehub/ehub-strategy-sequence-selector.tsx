import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { EmailAccount, Sequence } from "@/components/ehub/ehub.types";

interface EhubStrategySequenceSelectorProps {
  selectedSequenceId: string | null;
  sequences: Sequence[] | undefined;
  currentSenderEmailAccountId: string | null | undefined;
  emailAccounts: EmailAccount[] | undefined;
  onSelectSequence: (sequenceId: string | null) => void;
  onSenderEmailAccountChange: (senderEmailAccountId: string | null) => void;
}

export function EhubStrategySequenceSelector({
  selectedSequenceId,
  sequences,
  currentSenderEmailAccountId,
  emailAccounts,
  onSelectSequence,
  onSenderEmailAccountChange,
}: EhubStrategySequenceSelectorProps) {
  return (
    <>
      <div>
        <Label htmlFor="strategy-sequence-select">Or Select Existing Sequence</Label>
        <select
          id="strategy-sequence-select"
          data-testid="select-sequence-strategy"
          className="w-full mt-2 rounded-md border border-input bg-background px-3 py-2"
          value={selectedSequenceId || ""}
          onChange={(event) => onSelectSequence(event.target.value || null)}
        >
          <option value="">Select a sequence...</option>
          {sequences?.map((sequence) => (
            <option key={sequence.id} value={sequence.id}>
              {sequence.name} ({sequence.status})
            </option>
          ))}
        </select>
      </div>

      {selectedSequenceId && (
        <div className="pt-4 border-t">
          <Label htmlFor="senderEmailExisting" className="text-sm">Send From</Label>
          <Select
            value={currentSenderEmailAccountId || "__default__"}
            onValueChange={(value) => onSenderEmailAccountChange(value === "__default__" ? null : value)}
          >
            <SelectTrigger className="w-full mt-1" data-testid="select-sender-email-existing">
              <SelectValue placeholder="Select email account" />
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
          <p className="text-xs text-muted-foreground mt-1">
            Changes save automatically
          </p>
        </div>
      )}
    </>
  );
}
