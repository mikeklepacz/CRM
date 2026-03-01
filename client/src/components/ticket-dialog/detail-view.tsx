import { format } from "date-fns";
import { Loader2, Send } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import type { Ticket, TicketReply } from "./types";

interface TicketDetailViewProps {
  currentUserId?: string;
  detailLoading: boolean;
  onBack: () => void;
  onReply: (e: React.FormEvent) => void;
  replyMessage: string;
  replyPending: boolean;
  replies: TicketReply[];
  setReplyMessage: (value: string) => void;
  ticketDetail: Ticket;
}

export function TicketDetailView({
  currentUserId,
  detailLoading,
  onBack,
  onReply,
  replyMessage,
  replyPending,
  replies,
  setReplyMessage,
  ticketDetail,
}: TicketDetailViewProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <h3 className="font-medium">{ticketDetail.subject}</h3>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <Badge variant="outline" className="text-xs">
              {ticketDetail.category}
            </Badge>
            <Badge variant={ticketDetail.status === "closed" ? "secondary" : "default"} className="text-xs">
              {ticketDetail.status}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-2">{format(new Date(ticketDetail.createdAt), "MMM d, yyyy h:mm a")}</p>
        </div>
      </div>

      <ScrollArea className="h-[300px] border rounded-md p-4">
        <div className="space-y-4">
          <div className="bg-muted p-3 rounded-md">
            <p className="text-sm whitespace-pre-wrap">{ticketDetail.message}</p>
          </div>

          {replies.map((reply) => (
            <div
              key={reply.id}
              className={`p-3 rounded-md ${reply.userId === currentUserId ? "bg-primary/10 ml-4" : "bg-muted mr-4"}`}
            >
              <p className="text-sm whitespace-pre-wrap">{reply.message}</p>
              <p className="text-xs text-muted-foreground mt-2">{format(new Date(reply.createdAt), "MMM d, h:mm a")}</p>
            </div>
          ))}

          {detailLoading && (
            <div className="flex justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          )}
        </div>
      </ScrollArea>

      {ticketDetail.status !== "closed" && (
        <form onSubmit={onReply} className="space-y-2">
          <Textarea
            value={replyMessage}
            onChange={(e) => setReplyMessage(e.target.value)}
            placeholder="Type your reply..."
            rows={3}
            data-testid="input-reply"
          />
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={onBack} data-testid="button-back">
              Back to List
            </Button>
            <Button type="submit" disabled={replyPending} data-testid="button-send-reply">
              {replyPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Send Reply
                </>
              )}
            </Button>
          </div>
        </form>
      )}

      {ticketDetail.status === "closed" && (
        <div className="flex justify-end">
          <Button variant="outline" onClick={onBack} data-testid="button-back">
            Back to List
          </Button>
        </div>
      )}
    </div>
  );
}
