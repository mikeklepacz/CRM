import { Edit, Loader2, Plus, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type EhubStrategyAssetsCardsProps = {
  currentSequence: any;
  isSavingKeywords: boolean;
  onEditStep: (step: any) => void;
  onSaveKeywords: () => void;
  onSequenceKeywordsChange: (value: string) => void;
  sequenceKeywords: string;
  sequenceSteps: any[] | null | undefined;
};

export function EhubStrategyAssetsCards({
  currentSequence,
  isSavingKeywords,
  onEditStep,
  onSaveKeywords,
  onSequenceKeywordsChange,
  sequenceKeywords,
  sequenceSteps,
}: EhubStrategyAssetsCardsProps) {
  return (
    <>
      {sequenceSteps && sequenceSteps.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Step Email Templates</CardTitle>
            <CardDescription>
              Customize the email content for each step (optional - AI generates if blank)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {sequenceSteps.map((step) => (
              <div key={step.id} className="flex items-center justify-between p-3 border rounded-md">
                <div className="flex-1">
                  <div className="font-medium">Step {step.stepNumber}</div>
                  <div className="text-sm text-muted-foreground">
                    {step.subjectTemplate ? (
                      <span className="text-green-600">Has subject template</span>
                    ) : step.aiGuidance ? (
                      <span className="text-blue-600">Has AI guidance</span>
                    ) : (
                      <span>AI-generated content</span>
                    )}
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onEditStep(step)}
                  data-testid={`button-edit-step-${step.stepNumber}`}
                >
                  <Edit className="w-4 h-4 mr-1" />
                  Edit
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {currentSequence && (
        <Card>
          <CardHeader>
            <CardTitle>Keyword Bank</CardTitle>
            <CardDescription>
              Keywords the AI will use when generating emails for this sequence
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2 min-h-[40px] p-2 border rounded-md bg-muted/20">
              {(() => {
                const kw = typeof sequenceKeywords === "string" ? sequenceKeywords : "";
                const keywords = kw.split(",").map((k) => k.trim()).filter((k) => k);
                if (keywords.length === 0) {
                  return <p className="text-sm text-muted-foreground">No keywords added yet</p>;
                }
                return keywords.map((keyword, index) => (
                  <Badge
                    key={index}
                    variant="secondary"
                    className="flex items-center gap-1 pr-1"
                    data-testid={`badge-keyword-${index}`}
                  >
                    {keyword}
                    <button
                      onClick={() => {
                        const newKeywords = keywords.filter((_, i) => i !== index).join(", ");
                        onSequenceKeywordsChange(newKeywords);
                      }}
                      className="ml-1 hover:bg-destructive/20 rounded-full p-0.5"
                      data-testid={`button-remove-keyword-${index}`}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ));
              })()}
            </div>

            <div className="flex gap-2">
              <Input
                placeholder="Add a keyword..."
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    const input = e.currentTarget;
                    const newKeyword = input.value.trim();
                    if (newKeyword) {
                      const kw = typeof sequenceKeywords === "string" ? sequenceKeywords : "";
                      const existing = kw.split(",").map((k) => k.trim()).filter((k) => k);
                      if (!existing.includes(newKeyword)) {
                        const updated = [...existing, newKeyword].join(", ");
                        onSequenceKeywordsChange(updated);
                      }
                      input.value = "";
                    }
                  }
                }}
                data-testid="input-add-keyword"
              />
              <Button
                size="sm"
                variant="outline"
                onClick={(e) => {
                  const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                  const newKeyword = input.value.trim();
                  if (newKeyword) {
                    const kw = typeof sequenceKeywords === "string" ? sequenceKeywords : "";
                    const existing = kw.split(",").map((k) => k.trim()).filter((k) => k);
                    if (!existing.includes(newKeyword)) {
                      const updated = [...existing, newKeyword].join(", ");
                      onSequenceKeywordsChange(updated);
                    }
                    input.value = "";
                  }
                }}
                data-testid="button-add-keyword"
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>

            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                {(() => {
                  const kw = typeof sequenceKeywords === "string" ? sequenceKeywords : "";
                  const count = kw.split(",").filter((k) => k.trim()).length;
                  return `${count} keyword${count !== 1 ? "s" : ""}`;
                })()}
              </p>
              {sequenceKeywords !== ((currentSequence as any)?.keywords || "") && (
                <Button
                  size="sm"
                  onClick={onSaveKeywords}
                  disabled={isSavingKeywords}
                  data-testid="button-save-keywords"
                >
                  {isSavingKeywords ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  Save Keywords
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
}
