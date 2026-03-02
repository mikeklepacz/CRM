import { ScrollArea } from "@/components/ui/scroll-area";
import { TabsContent } from "@/components/ui/tabs";
import { Loader2, MessageSquare } from "lucide-react";
import { TranscriptMessage } from "./types";

interface TranscriptTabProps {
  isLoading: boolean;
  transcripts: TranscriptMessage[];
  formatDuration: (secs: number | null) => string;
}

export function TranscriptTab({ isLoading, transcripts, formatDuration }: TranscriptTabProps) {
  return (
    <TabsContent value="transcript" className="flex-1 min-h-0 mt-4" data-testid="content-transcript">
      {isLoading ? (
        <div className="flex items-center justify-center h-64" data-testid="loading-transcript">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : transcripts.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-center" data-testid="empty-transcript">
          <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No transcript available</p>
          <p className="text-sm text-muted-foreground mt-1">The conversation transcript will appear here once available</p>
        </div>
      ) : (
        <ScrollArea className="h-[500px] pr-4" data-testid="scroll-transcript">
          <div className="space-y-4">
            {transcripts.map((msg, index) => (
              <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`} data-testid={`message-${msg.role}-${index}`}>
                <div className={`max-w-[75%] space-y-1 ${msg.role === "user" ? "items-end" : "items-start"}`}>
                  <div className="flex items-center gap-2 px-1">
                    <span className="text-xs font-medium text-muted-foreground" data-testid={`text-role-${index}`}>{msg.role === "agent" ? "Agent" : "Customer"}</span>
                    {msg.timeInCallSecs !== null && <span className="text-xs text-muted-foreground" data-testid={`text-time-${index}`}>{formatDuration(msg.timeInCallSecs)}</span>}
                  </div>
                  <div className={`rounded-lg px-4 py-2 ${msg.role === "agent" ? "bg-muted" : "bg-primary text-primary-foreground"}`} data-testid={`text-message-${index}`}>
                    <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      )}
    </TabsContent>
  );
}
