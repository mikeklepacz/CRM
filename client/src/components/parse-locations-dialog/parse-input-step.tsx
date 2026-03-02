import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { FileText, Loader2 } from "lucide-react";

interface ParseInputStepProps {
  rawText: string;
  isPending: boolean;
  onRawTextChange: (value: string) => void;
  onCancel: () => void;
  onFindMatches: () => void;
}

export const ParseInputStep = ({
  rawText,
  isPending,
  onRawTextChange,
  onCancel,
  onFindMatches,
}: ParseInputStepProps) => {
  return (
    <div className="flex flex-col gap-4 flex-1">
      <div className="space-y-2">
        <label className="text-sm font-medium">Paste Store List</label>
        <Textarea
          data-testid="textarea-raw-store-list"
          placeholder="Paste store information here (e.g., names, addresses, phone numbers)..."
          value={rawText}
          onChange={(e) => onRawTextChange(e.target.value)}
          className="min-h-[300px] font-mono text-sm"
        />
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel} data-testid="button-cancel-parse">
          Cancel
        </Button>
        <Button onClick={onFindMatches} disabled={!rawText.trim() || isPending} data-testid="button-find-matches">
          {isPending ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Finding Matches...
            </>
          ) : (
            <>
              <FileText className="h-4 w-4 mr-2" />
              Find Matches
            </>
          )}
        </Button>
      </div>
    </div>
  );
};
