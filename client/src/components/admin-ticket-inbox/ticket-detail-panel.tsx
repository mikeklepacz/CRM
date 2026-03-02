import { format } from "date-fns";
import { CheckCircle2, Loader2, Send, XCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { Ticket, TicketReply } from "./types";

interface TicketDetailPanelProps {
  detailLoading: boolean;
  handleReply: (e: React.FormEvent) => void;
  handleStatusChange: (status: string) => void;
  replyMessage: string;
  replyMutation: { isPending: boolean };
  replies: TicketReply[];
  setReplyMessage: (message: string) => void;
  ticketDetail: Ticket | undefined;
  tickets: Ticket[];
  updateStatusMutation: { isPending: boolean };
}

export function TicketDetailPanel({
  detailLoading,
  handleReply,
  handleStatusChange,
  replyMessage,
  replyMutation,
  replies,
  setReplyMessage,
  ticketDetail,
  tickets,
  updateStatusMutation,
}: TicketDetailPanelProps) {
  return (
    <Card className="lg:col-span-2">
      <CardHeader>
        <CardTitle>{ticketDetail ? ticketDetail.subject : "Select a ticket"}</CardTitle>
        {ticketDetail && (
          <CardDescription>
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  {tickets.find((t) => t.id === ticketDetail.id)?.tenantName && (
                    <Badge variant="secondary" className="text-xs">
                      {tickets.find((t) => t.id === ticketDetail.id)?.tenantName}
                    </Badge>
                  )}
                  <Badge variant="outline" className="text-xs">
                    {ticketDetail.category}
                  </Badge>
                </div>
                <p>From: {ticketDetail.userName || ticketDetail.userEmail}</p>
                <p className="text-xs">Created: {format(new Date(ticketDetail.createdAt), "MMM d, yyyy h:mm a")}</p>
              </div>
              <div className="flex items-center gap-2">
                <Select
                  value={ticketDetail.status}
                  onValueChange={handleStatusChange}
                  disabled={updateStatusMutation.isPending}
                >
                  <SelectTrigger className="w-32" data-testid="select-ticket-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="in-progress">In Progress</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardDescription>
        )}
      </CardHeader>
      <CardContent>
        {!ticketDetail ? (
          <div className="text-center py-12 text-muted-foreground">Select a ticket from the list to view details and reply</div>
        ) : (
          <div className="space-y-4">
            <ScrollArea className="h-[400px] border rounded-md p-4">
              <div className="space-y-4">
                <div className="bg-muted p-4 rounded-md">
                  <div className="flex items-start justify-between mb-2">
                    <p className="text-xs text-muted-foreground">{ticketDetail.userName || ticketDetail.userEmail}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(ticketDetail.createdAt), "MMM d, h:mm a")}
                    </p>
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{ticketDetail.message}</p>
                </div>

                {replies.map((reply) => (
                  <div
                    key={reply.id}
                    className={`p-4 rounded-md ${
                      reply.userName === ticketDetail.userName || reply.userEmail === ticketDetail.userEmail
                        ? "bg-muted ml-4"
                        : "bg-primary/10 mr-4"
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <p className="text-xs text-muted-foreground font-medium">
                        {reply.userName || reply.userEmail || "Admin"}
                      </p>
                      <p className="text-xs text-muted-foreground">{format(new Date(reply.createdAt), "MMM d, h:mm a")}</p>
                    </div>
                    <p className="text-sm whitespace-pre-wrap">{reply.message}</p>
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
              <form onSubmit={handleReply} className="space-y-2">
                <Textarea
                  value={replyMessage}
                  onChange={(e) => setReplyMessage(e.target.value)}
                  placeholder="Type your reply... (User will be notified via email)"
                  rows={4}
                  data-testid="input-admin-reply"
                />
                <div className="flex gap-2 justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleStatusChange("closed")}
                    disabled={updateStatusMutation.isPending}
                    data-testid="button-close-ticket"
                  >
                    <XCircle className="mr-2 h-4 w-4" />
                    Close Ticket
                  </Button>
                  <Button type="submit" disabled={replyMutation.isPending} data-testid="button-send-admin-reply">
                    {replyMutation.isPending ? (
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
              <div className="flex items-center gap-2 justify-center text-sm text-muted-foreground py-4">
                <CheckCircle2 className="h-4 w-4" />
                This ticket is closed
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
