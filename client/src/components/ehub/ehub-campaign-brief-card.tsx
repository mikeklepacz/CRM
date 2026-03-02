import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

type EhubCampaignBriefCardProps = {
  currentSequence: any;
  finalizedStrategyEdit: string;
  isPending: boolean;
  onChange: (value: string) => void;
  onSave: () => void;
};

export function EhubCampaignBriefCard({
  currentSequence,
  finalizedStrategyEdit,
  isPending,
  onChange,
  onSave,
}: EhubCampaignBriefCardProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <CardTitle>Campaign Brief</CardTitle>
          <Badge variant={(currentSequence as any)?.finalizedStrategy ? "default" : "outline"} data-testid="badge-brief-status">
            {(currentSequence as any)?.finalizedStrategy ? "Finalized" : "Draft"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {!finalizedStrategyEdit ? (
          <div className="text-center py-8 text-sm text-muted-foreground">
            <p>Click "Finalize Strategy" above to generate your campaign brief from the AI conversation</p>
          </div>
        ) : (
          <div className="space-y-3">
            <Textarea
              value={finalizedStrategyEdit}
              onChange={(e) => onChange(e.target.value)}
              placeholder="Your campaign brief will appear here..."
              className="min-h-[300px] font-mono text-sm"
              data-testid="textarea-campaign-brief"
            />
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                {finalizedStrategyEdit.split(/\s+/).filter((w) => w).length} words
              </p>
              {finalizedStrategyEdit !== ((currentSequence as any)?.finalizedStrategy || "") && (
                <Button
                  size="sm"
                  onClick={onSave}
                  disabled={!finalizedStrategyEdit.trim() || isPending}
                  data-testid="button-save-brief"
                >
                  {isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : null}
                  Save Changes
                </Button>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
