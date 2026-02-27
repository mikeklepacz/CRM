import DOMPurify from "dompurify";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertCircle, Loader2, Mail, Store, TestTube2 } from "lucide-react";

type SyntheticPreviewItem = {
  stepNumber: number;
  subject: string;
  body: string;
};

type SyntheticStoreContext = {
  name: string;
  link: string | null;
  salesSummary: string | null;
  state: string | null;
  timezone: string;
};

type EhubSyntheticTestCardProps = {
  hasCampaignBrief: boolean;
  isPending: boolean;
  onRun: () => void;
  selectedSequenceId: string | null;
  syntheticPreview: SyntheticPreviewItem[] | null;
  syntheticStoreContext: SyntheticStoreContext | null;
};

export function EhubSyntheticTestCard({
  hasCampaignBrief,
  isPending,
  onRun,
  selectedSequenceId,
  syntheticPreview,
  syntheticStoreContext,
}: EhubSyntheticTestCardProps) {
  const canTest = !!selectedSequenceId && hasCampaignBrief;

  return (
    <Card className="border-destructive/50 bg-destructive/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-destructive">
          <TestTube2 className="w-5 h-5" />
          Synthetic Email Series Test
        </CardTitle>
        <CardDescription>
          Preview your entire email sequence with AI-generated content without sending real emails
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {syntheticStoreContext && (
          <Alert className="bg-muted/50">
            <Store className="h-4 w-4" />
            <AlertDescription>
              <div className="font-medium mb-1">Testing with: {syntheticStoreContext.name}</div>
              {syntheticStoreContext.salesSummary && (
                <div className="text-xs text-muted-foreground mt-2 whitespace-pre-wrap">
                  <span className="font-semibold">Sales Summary:</span>
                  <div className="mt-1 p-2 bg-background rounded border text-foreground">
                    {syntheticStoreContext.salesSummary}
                  </div>
                </div>
              )}
              <div className="text-xs text-muted-foreground mt-2">
                {syntheticStoreContext.state && `${syntheticStoreContext.state} • `}
                {syntheticStoreContext.timezone}
              </div>
            </AlertDescription>
          </Alert>
        )}

        <Button
          variant="destructive"
          onClick={onRun}
          disabled={!canTest || isPending}
          data-testid="button-run-synthetic-test"
        >
          {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          {!isPending && <TestTube2 className="w-4 h-4 mr-2" />}
          {isPending ? "Generating..." : "Run Test Sequence"}
        </Button>

        {selectedSequenceId && !hasCampaignBrief && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-xs">
              Campaign Brief required. Complete "Finalize Strategy" in the Strategy tab first.
            </AlertDescription>
          </Alert>
        )}

        {syntheticPreview && syntheticPreview.length > 0 && (
          <div className="space-y-4 mt-6">
            {syntheticPreview.map((email) => (
              <Card key={email.stepNumber} className="border-muted">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    Email Step {email.stepNumber}{" "}
                    {email.stepNumber === 1 ? "(Cold Outreach)" : "(Follow-up)"}
                  </CardTitle>
                  <div className="text-sm font-medium mt-2">
                    Subject: <span className="font-normal">{email.subject}</span>
                  </div>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-64 w-full rounded-md border p-4 bg-background">
                    <div
                      dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(email.body) }}
                      data-testid={`preview-email-step-${email.stepNumber}`}
                    />
                  </ScrollArea>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
