import { Button } from "@/components/ui/button";
import { DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Brain, Loader2, MessageSquare } from "lucide-react";
import { format } from "date-fns";
import { CallSession } from "./types";

interface CallDetailHeaderProps {
  session?: CallSession | null;
  storeName: string;
  analyzePending: boolean;
  onAnalyze: () => void;
}

export function CallDetailHeader({ session, storeName, analyzePending, onAnalyze }: CallDetailHeaderProps) {
  return (
    <DialogHeader>
      <DialogTitle className="flex items-center gap-3" data-testid="text-dialog-title">
        <MessageSquare className="h-5 w-5" />
        <div className="flex flex-col">
          <span>{storeName}</span>
          {session?.startedAt && (
            <span className="text-sm font-normal text-muted-foreground" data-testid="text-call-timestamp">
              {format(new Date(session.startedAt), "PPp")}
            </span>
          )}
        </div>
      </DialogTitle>
      <Button
        variant="outline"
        size="sm"
        onClick={onAnalyze}
        disabled={analyzePending || !session?.id}
        data-testid="button-analyze-transcript"
      >
        {analyzePending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Analyzing...
          </>
        ) : (
          <>
            <Brain className="mr-2 h-4 w-4" />
            Analyze with AI
          </>
        )}
      </Button>
    </DialogHeader>
  );
}
