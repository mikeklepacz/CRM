import { Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type AiAnalyticsHeaderProps = {
  onSync: () => void;
  syncingCalls: boolean;
};

export function AiAnalyticsHeader({ onSync, syncingCalls }: AiAnalyticsHeaderProps) {
  return (
    <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-6">
      <div className="space-y-1.5">
        <CardTitle>AI Call Analytics</CardTitle>
        <CardDescription>Insights from your AI-powered calls</CardDescription>
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={onSync}
        disabled={syncingCalls}
        data-testid="button-sync-elevenlabs"
      >
        {syncingCalls ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Syncing...
          </>
        ) : (
          <>
            <Download className="mr-2 h-4 w-4" />
            Sync from ElevenLabs
          </>
        )}
      </Button>
    </CardHeader>
  );
}
