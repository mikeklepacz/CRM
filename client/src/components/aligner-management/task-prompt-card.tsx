import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Save, Sparkles } from "lucide-react";

interface TaskPromptCardProps {
  value: string;
  isPending: boolean;
  onChange: (value: string) => void;
  onSave: () => void;
}

export function TaskPromptCard({ value, isPending, onChange, onSave }: TaskPromptCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5" />
          Task Prompt Template
        </CardTitle>
        <CardDescription>
          Template for dynamic task prompts sent to Aligner for each analysis job. Use placeholders like {"{{transcriptContext}}"}, {"{{kbContext}}"}, {"{{wickCoachSection}}"}.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="task-prompt-template">Prompt Template</Label>
          <Textarea
            id="task-prompt-template"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="MISSION
Analyze call performance and propose knowledge base improvements.

CONTEXT
Transcript: {{transcriptContext}}
Knowledge Base: {{kbContext}}

INSTRUCTIONS
1. Compare the transcript against knowledge base content
2. Identify gaps, inconsistencies, or opportunities
3. Propose specific, actionable improvements"
            rows={16}
            className="font-mono text-sm"
            data-testid="textarea-task-prompt-template"
          />
          <p className="text-xs text-muted-foreground">
            This template is used for each analysis job. Variables like {"{{transcriptContext}}"} and {"{{kbContext}}"} are replaced with actual data at runtime.
          </p>
        </div>
        <Button onClick={onSave} disabled={isPending} data-testid="button-save-task-prompt">
          {isPending ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Save Template
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
