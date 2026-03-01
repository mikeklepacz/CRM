import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { BookOpen, Loader2, Save } from "lucide-react";

interface AiInstructionsCardProps {
  settingsLoading: boolean;
  aiInstructions: string;
  savePending: boolean;
  onChangeInstructions: (value: string) => void;
  onSave: () => void;
}

export const AiInstructionsCard = ({
  settingsLoading,
  aiInstructions,
  savePending,
  onChangeInstructions,
  onSave,
}: AiInstructionsCardProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BookOpen className="h-5 w-5" />
          AI Instructions
        </CardTitle>
        <CardDescription>Configure the AI assistant's personality and behavior</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {settingsLoading ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading...
          </div>
        ) : (
          <>
            <div className="space-y-2">
              <Label htmlFor="ai-instructions">System Prompt</Label>
              <Textarea
                id="ai-instructions"
                value={aiInstructions}
                onChange={(e) => onChangeInstructions(e.target.value)}
                placeholder="You are a Sales Assistant for [Your Company Name].
Your role is to help sales reps sell effectively and intelligently.

Core truths:
- [Key fact about your product/service]
- [Unique selling proposition]
- [Important differentiator]

Rules:
- Speak in clear, direct English.
- No emojis, no marketing fluff.
- When uncertain, list assumptions.
- Always give concrete examples."
                rows={12}
                className="font-mono text-sm"
                data-testid="textarea-instructions"
              />
              <p className="text-xs text-muted-foreground">
                These instructions will be used as the system message for every chat request
              </p>
            </div>
            <Button onClick={onSave} disabled={savePending} data-testid="button-save-instructions">
              {savePending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Instructions
                </>
              )}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
};
