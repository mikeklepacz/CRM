import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Bot, Loader2, Save } from "lucide-react";

interface InstructionsCardProps {
  value: string;
  isPending: boolean;
  onChange: (value: string) => void;
  onSave: () => void;
}

export function AlignerInstructionsCard({ value, isPending, onChange, onSave }: InstructionsCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bot className="h-5 w-5" />
          Aligner Assistant Instructions
        </CardTitle>
        <CardDescription>
          Configure how the Aligner analyzes call data and proposes knowledge base improvements
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="aligner-instructions">System Prompt</Label>
          <Textarea
            id="aligner-instructions"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="You are the Aligner AI, responsible for analyzing call transcripts and insights to propose improvements to the knowledge base.

Your role:
- Analyze call performance data
- Identify patterns and areas for improvement
- Propose knowledge base updates based on real-world conversations"
            rows={12}
            className="font-mono text-sm"
            data-testid="textarea-aligner-instructions"
          />
          <p className="text-xs text-muted-foreground">
            The Aligner uses these instructions when analyzing call performance and generating KB improvement proposals
          </p>
        </div>
        <Button onClick={onSave} disabled={isPending} data-testid="button-save-aligner-instructions">
          {isPending ? (
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
      </CardContent>
    </Card>
  );
}
