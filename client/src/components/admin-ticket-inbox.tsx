import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";
import { Loader2, Send, CheckCircle2, XCircle } from "lucide-react";

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
  userEmail?: string;
  userName?: string;
  tenantName?: string;
}

interface TicketReply {
  id: string;
  ticketId: string;
  userId: string;
  message: string;
  createdAt: string;
  userName?: string;
  userEmail?: string;
}

const TICKET_CATEGORIES = [
  'Bug Report',
  'Feature Request',
  'Technical Support',
  'Account Issue',
  'Billing Question',
  'Data Issue',
  'Performance Problem',
  'Integration Help',
  'General Question',
  'Other',
] as const;

export function AdminTicketInbox() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [replyMessage, setReplyMessage] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  
  const prevTenantIdRef = useRef<string | undefined>(user?.tenantId);
  
  useEffect(() => {
    if (prevTenantIdRef.current !== user?.tenantId) {
      setSelectedTicketId(null);
      setReplyMessage('');
      prevTenantIdRef.current = user?.tenantId;
    }
  }, [user?.tenantId]);

  // Fetch all tickets
  const { data: ticketsData, isLoading: ticketsLoading } = useQuery<{ tickets: Ticket[] }>({
    queryKey: ['/api/tickets/admin'],
  });

  // Fetch selected ticket details
  const { data: ticketDetailData, isLoading: detailLoading } = useQuery<{ ticket: Ticket; replies: TicketReply[] }>({
    queryKey: ['/api/tickets', selectedTicketId],
    enabled: !!selectedTicketId,
  });

  // Mark as read mutation
  const markReadMutation = useMutation({
    mutationFn: async (ticketId: string) => {
      return await apiRequest('POST', `/api/tickets/${ticketId}/mark-read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tickets/admin'] });
      queryClient.invalidateQueries({ queryKey: ['/api/tickets/unread-count'] });
      if (selectedTicketId) {
        queryClient.invalidateQueries({ queryKey: ['/api/tickets', selectedTicketId] });
      }
    },
  });

  // Update status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ ticketId, status }: { ticketId: string; status: string }) => {
      return await apiRequest('PATCH', `/api/tickets/${ticketId}/status`, { status });
    },
    onSuccess: () => {
      toast({
        title: "Status Updated",
        description: "Ticket status has been updated.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/tickets/admin'] });
      if (selectedTicketId) {
        queryClient.invalidateQueries({ queryKey: ['/api/tickets', selectedTicketId] });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update status",
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
        description: "Your reply has been sent and user notified via email.",
      });
      setReplyMessage('');
      queryClient.invalidateQueries({ queryKey: ['/api/tickets/admin'] });
      if (selectedTicketId) {
        queryClient.invalidateQueries({ queryKey: ['/api/tickets', selectedTicketId] });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send reply",
        variant: "destructive",
      });
    },
  });

  const handleReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyMessage.trim() || !selectedTicketId) return;
    replyMutation.mutate({ ticketId: selectedTicketId, message: replyMessage });
  };

  const handleStatusChange = (status: string) => {
    if (!selectedTicketId) return;
    updateStatusMutation.mutate({ ticketId: selectedTicketId, status });
  };

  const handleTicketSelect = (ticketId: string) => {
    setSelectedTicketId(ticketId);
    const ticket = tickets.find(t => t.id === ticketId);
    if (ticket?.isUnreadByAdmin) {
      markReadMutation.mutate(ticketId);
    }
  };

  const tickets = ticketsData?.tickets || [];
  const filteredTickets = tickets.filter(t => {
    const statusMatch = statusFilter === 'all' || t.status === statusFilter;
    const categoryMatch = categoryFilter === 'all' || t.category === categoryFilter;
    return statusMatch && categoryMatch;
  });
  const ticketDetail = ticketDetailData?.ticket;
  const replies = ticketDetailData?.replies || [];

  const unreadCount = tickets.filter(t => t.isUnreadByAdmin).length;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Tickets List */}
      <Card className="lg:col-span-1">
        <CardHeader>
          <CardTitle>Support Tickets</CardTitle>
          <CardDescription>
            {unreadCount > 0 && (
              <span className="text-destructive font-medium">
                {unreadCount} unread ticket{unreadCount > 1 ? 's' : ''}
              </span>
            )}
            {unreadCount === 0 && <span>All tickets read</span>}
          </CardDescription>
          <div className="pt-2 space-y-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger data-testid="select-status-filter">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Tickets</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="in-progress">In Progress</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger data-testid="select-category-filter">
                <SelectValue placeholder="Filter by category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {TICKET_CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[600px]">
            <div className="space-y-2">
              {ticketsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : filteredTickets.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  No tickets found
                </div>
              ) : (
                filteredTickets.map((ticket) => (
                  <div
                    key={ticket.id}
                    className={`p-3 border rounded-md hover-elevate active-elevate-2 cursor-pointer ${
                      selectedTicketId === ticket.id ? 'bg-accent' : ''
                    }`}
                    onClick={() => handleTicketSelect(ticket.id)}
                    data-testid={`ticket-${ticket.id}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-medium text-sm truncate">{ticket.subject}</h4>
                          {ticket.isUnreadByAdmin && (
                            <Badge variant="destructive" className="text-xs">New</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          {ticket.tenantName && (
                            <Badge variant="secondary" className="text-xs">
                              {ticket.tenantName}
                            </Badge>
                          )}
                          <Badge variant="outline" className="text-xs">
                            {ticket.category}
                          </Badge>
                          <Badge variant={ticket.status === 'closed' ? 'secondary' : 'default'} className="text-xs">
                            {ticket.status}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          From: {ticket.userName || ticket.userEmail}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(ticket.createdAt), 'MMM d, h:mm a')}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Ticket Detail */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>
            {ticketDetail ? ticketDetail.subject : 'Select a ticket'}
          </CardTitle>
          {ticketDetail && (
            <CardDescription>
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    {tickets.find(t => t.id === ticketDetail.id)?.tenantName && (
                      <Badge variant="secondary" className="text-xs">
                        {tickets.find(t => t.id === ticketDetail.id)?.tenantName}
                      </Badge>
                    )}
                    <Badge variant="outline" className="text-xs">
                      {ticketDetail.category}
                    </Badge>
                  </div>
                  <p>From: {ticketDetail.userName || ticketDetail.userEmail}</p>
                  <p className="text-xs">
                    Created: {format(new Date(ticketDetail.createdAt), 'MMM d, yyyy h:mm a')}
                  </p>
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
            <div className="text-center py-12 text-muted-foreground">
              Select a ticket from the list to view details and reply
            </div>
          ) : (
            <div className="space-y-4">
              <ScrollArea className="h-[400px] border rounded-md p-4">
                <div className="space-y-4">
                  <div className="bg-muted p-4 rounded-md">
                    <div className="flex items-start justify-between mb-2">
                      <p className="text-xs text-muted-foreground">
                        {ticketDetail.userName || ticketDetail.userEmail}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(ticketDetail.createdAt), 'MMM d, h:mm a')}
                      </p>
                    </div>
                    <p className="text-sm whitespace-pre-wrap">{ticketDetail.message}</p>
                  </div>

                  {replies.map((reply) => (
                    <div
                      key={reply.id}
                      className={`p-4 rounded-md ${
                        reply.userName === ticketDetail.userName || reply.userEmail === ticketDetail.userEmail
                          ? 'bg-muted ml-4'
                          : 'bg-primary/10 mr-4'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <p className="text-xs text-muted-foreground font-medium">
                          {reply.userName || reply.userEmail || 'Admin'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(reply.createdAt), 'MMM d, h:mm a')}
                        </p>
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

              {ticketDetail.status !== 'closed' && (
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
                      onClick={() => handleStatusChange('closed')}
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
              
              {ticketDetail.status === 'closed' && (
                <div className="flex items-center gap-2 justify-center text-sm text-muted-foreground py-4">
                  <CheckCircle2 className="h-4 w-4" />
                  This ticket is closed
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
