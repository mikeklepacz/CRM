import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";
import { Loader2, Send, MessageSquare } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

interface Ticket {
  id: string;
  userId: string;
  subject: string;
  message: string;
  category: string;
  status: string;
  priority: string;
  isUnreadByAdmin: boolean;
  isUnreadByUser: boolean;
  createdAt: string;
  updatedAt: string;
}

interface TicketReply {
  id: string;
  ticketId: string;
  userId: string;
  message: string;
  createdAt: string;
}

interface TicketDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TicketDialog({ open, onOpenChange }: TicketDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [view, setView] = useState<'list' | 'create' | 'detail'>('list');
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [category, setCategory] = useState('General Question');
  const [replyMessage, setReplyMessage] = useState('');

  // Fetch user's tickets
  const { data: ticketsData, isLoading: ticketsLoading } = useQuery<{ tickets: Ticket[] }>({
    queryKey: ['/api/tickets'],
    enabled: open,
  });

  // Fetch selected ticket details
  const { data: ticketDetailData, isLoading: detailLoading } = useQuery<{ ticket: Ticket; replies: TicketReply[] }>({
    queryKey: ['/api/tickets', selectedTicketId],
    enabled: !!selectedTicketId && view === 'detail',
  });

  // Create ticket mutation
  const createMutation = useMutation({
    mutationFn: async (data: { subject: string; message: string; category: string }) => {
      return await apiRequest('POST', '/api/tickets', data);
    },
    onSuccess: () => {
      toast({
        title: "Ticket Created",
        description: "Your support ticket has been submitted. You'll receive a reply via email.",
      });
      setSubject('');
      setMessage('');
      setCategory('General Question');
      setView('list');
      queryClient.invalidateQueries({ queryKey: ['/api/tickets'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create ticket",
        variant: "destructive",
      });
    },
  });

  // Reply mutation
  const replyMutation = useMutation({
    mutationFn: async (data: { ticketId: string; message: string }) => {
      return await apiRequest('POST', `/api/tickets/${data.ticketId}/reply`, { message: data.message });
    },
    onSuccess: () => {
      toast({
        title: "Reply Sent",
        description: "Your reply has been sent.",
      });
      setReplyMessage('');
      queryClient.invalidateQueries({ queryKey: ['/api/tickets', selectedTicketId] });
      queryClient.invalidateQueries({ queryKey: ['/api/tickets'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send reply",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) {
      toast({
        title: "Missing Information",
        description: "Please provide both a subject and message",
        variant: "destructive",
      });
      return;
    }
    createMutation.mutate({ subject, message });
  };

  const handleReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyMessage.trim() || !selectedTicketId) return;
    replyMutation.mutate({ ticketId: selectedTicketId, message: replyMessage });
  };

  const tickets = ticketsData?.tickets || [];
  const ticketDetail = ticketDetailData?.ticket;
  const replies = ticketDetailData?.replies || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {view === 'create' ? 'New Support Ticket' : view === 'detail' ? 'Ticket Details' : 'Support Tickets'}
          </DialogTitle>
          <DialogDescription>
            {view === 'create'
              ? 'Submit feedback, report bugs, or ask for help'
              : view === 'detail'
              ? 'View conversation and reply'
              : 'View your support tickets and submit new ones'}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          {view === 'list' && (
            <div className="space-y-4">
              <Button
                onClick={() => setView('create')}
                className="w-full"
                data-testid="button-new-ticket"
              >
                <MessageSquare className="mr-2 h-4 w-4" />
                New Support Ticket
              </Button>

              <ScrollArea className="h-[400px]">
                <div className="space-y-2">
                  {ticketsLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : tickets.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground text-sm">
                      No tickets yet. Create one to get help!
                    </div>
                  ) : (
                    tickets.map((ticket) => (
                      <div
                        key={ticket.id}
                        className="p-3 border rounded-md hover-elevate active-elevate-2 cursor-pointer"
                        onClick={() => {
                          setSelectedTicketId(ticket.id);
                          setView('detail');
                        }}
                        data-testid={`ticket-${ticket.id}`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium text-sm truncate">{ticket.subject}</h4>
                              {ticket.isUnreadByUser && user?.role !== 'admin' && (
                                <Badge variant="destructive" className="text-xs">New</Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                              {ticket.message}
                            </p>
                            <p className="text-xs text-muted-foreground mt-2">
                              {format(new Date(ticket.createdAt), 'MMM d, yyyy h:mm a')}
                            </p>
                          </div>
                          <Badge variant={ticket.status === 'closed' ? 'secondary' : 'default'} className="text-xs">
                            {ticket.status}
                          </Badge>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </div>
          )}

          {view === 'create' && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="subject">Subject</Label>
                <Input
                  id="subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Brief description of your issue..."
                  data-testid="input-subject"
                />
              </div>

              <div>
                <Label htmlFor="message">Message</Label>
                <Textarea
                  id="message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Provide details about your feedback, bug report, or question..."
                  rows={6}
                  data-testid="input-message"
                />
              </div>

              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={() => setView('list')} data-testid="button-cancel">
                  Cancel
                </Button>
                <Button type="submit" disabled={createMutation.isPending} data-testid="button-submit">
                  {createMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      Submit Ticket
                    </>
                  )}
                </Button>
              </div>
            </form>
          )}

          {view === 'detail' && ticketDetail && (
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-medium">{ticketDetail.subject}</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    {format(new Date(ticketDetail.createdAt), 'MMM d, yyyy h:mm a')}
                  </p>
                </div>
                <Badge variant={ticketDetail.status === 'closed' ? 'secondary' : 'default'}>
                  {ticketDetail.status}
                </Badge>
              </div>

              <ScrollArea className="h-[300px] border rounded-md p-4">
                <div className="space-y-4">
                  <div className="bg-muted p-3 rounded-md">
                    <p className="text-sm whitespace-pre-wrap">{ticketDetail.message}</p>
                  </div>

                  {replies.map((reply) => (
                    <div
                      key={reply.id}
                      className={`p-3 rounded-md ${
                        reply.userId === user?.id ? 'bg-primary/10 ml-4' : 'bg-muted mr-4'
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap">{reply.message}</p>
                      <p className="text-xs text-muted-foreground mt-2">
                        {format(new Date(reply.createdAt), 'MMM d, h:mm a')}
                      </p>
                    </div>
                  ))}

                  {detailLoading && (
                    <div className="flex justify-center py-4">
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                  )}
                </div>
              </ScrollArea>

              {ticketDetail.status !== 'closed' && (
                <form onSubmit={handleReply} className="space-y-2">
                  <Textarea
                    value={replyMessage}
                    onChange={(e) => setReplyMessage(e.target.value)}
                    placeholder="Type your reply..."
                    rows={3}
                    data-testid="input-reply"
                  />
                  <div className="flex gap-2 justify-end">
                    <Button type="button" variant="outline" onClick={() => setView('list')} data-testid="button-back">
                      Back to List
                    </Button>
                    <Button type="submit" disabled={replyMutation.isPending} data-testid="button-send-reply">
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
              
              {ticketDetail.status === 'closed' && (
                <div className="flex justify-end">
                  <Button variant="outline" onClick={() => setView('list')} data-testid="button-back">
                    Back to List
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
