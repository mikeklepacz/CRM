import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TabsContent } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Check, Loader2, Send, XCircle } from "lucide-react";

export function SuperAdminTicketsTab(props: any) {
  const p = props;

  return (
    <TabsContent value="tickets">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Platform Support</CardTitle>
            <CardDescription>
              {p.unreadTicketCount > 0 && (
                <span className="text-destructive font-medium">
                  {p.unreadTicketCount} unread ticket{p.unreadTicketCount > 1 ? "s" : ""}
                </span>
              )}
              {p.unreadTicketCount === 0 && <span>All tickets read</span>}
            </CardDescription>
            <div className="pt-2 space-y-2">
              <Select value={p.ticketTenantFilter} onValueChange={p.setTicketTenantFilter}>
                <SelectTrigger data-testid="select-ticket-tenant-filter">
                  <SelectValue placeholder="Filter by tenant" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Tenants</SelectItem>
                  {p.tenantsData?.tenants?.map((t: any) => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={p.ticketStatusFilter} onValueChange={p.setTicketStatusFilter}>
                <SelectTrigger data-testid="select-ticket-status-filter">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="in-progress">In Progress</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
              <Select value={p.ticketCategoryFilter} onValueChange={p.setTicketCategoryFilter}>
                <SelectTrigger data-testid="select-ticket-category-filter">
                  <SelectValue placeholder="Filter by category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {p.ticketCategories.map((cat: string) => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[600px]">
              <div className="space-y-2">
                {p.ticketsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : p.filteredTickets.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-sm">No tickets found</div>
                ) : (
                  p.filteredTickets.map((ticket: any) => (
                    <div
                      key={ticket.id}
                      className={`p-3 border rounded-md hover-elevate active-elevate-2 cursor-pointer ${p.selectedTicketId === ticket.id ? "bg-accent" : ""}`}
                      onClick={() => p.handleTicketSelect(ticket.id)}
                      data-testid={`ticket-${ticket.id}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-medium text-sm truncate">{ticket.subject}</h4>
                            {ticket.isUnreadByAdmin && <Badge variant="destructive" className="text-xs">New</Badge>}
                          </div>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <Badge variant="outline" className="text-xs">{ticket.tenantName || "Unknown Tenant"}</Badge>
                            <Badge variant="outline" className="text-xs">{ticket.category}</Badge>
                            <Badge variant={ticket.status === "closed" ? "secondary" : "default"} className="text-xs">{ticket.status}</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">From: {ticket.userName || ticket.userEmail}</p>
                          <p className="text-xs text-muted-foreground">{format(new Date(ticket.createdAt), "MMM d, h:mm a")}</p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>{p.ticketDetail ? p.ticketDetail.subject : "Select a ticket"}</CardTitle>
            {p.ticketDetail && (
              <CardDescription>
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <Badge variant="outline" className="text-xs">{p.ticketDetail.tenantName || "Unknown Tenant"}</Badge>
                      <Badge variant="outline" className="text-xs">{p.ticketDetail.category}</Badge>
                    </div>
                    <p>From: {p.ticketDetail.userName || p.ticketDetail.userEmail}</p>
                    <p className="text-xs">Created: {format(new Date(p.ticketDetail.createdAt), "MMM d, yyyy h:mm a")}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Select value={p.ticketDetail.status} onValueChange={p.handleTicketStatusChange} disabled={p.updateTicketStatusMutation.isPending}>
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
            {!p.ticketDetail ? (
              <div className="text-center py-12 text-muted-foreground">Select a ticket from the list to view details and reply</div>
            ) : (
              <div className="space-y-4">
                <ScrollArea className="h-[400px] border rounded-md p-4">
                  <div className="space-y-4">
                    <div className="bg-muted p-4 rounded-md">
                      <div className="flex items-start justify-between mb-2">
                        <p className="text-xs text-muted-foreground">{p.ticketDetail.userName || p.ticketDetail.userEmail}</p>
                        <p className="text-xs text-muted-foreground">{format(new Date(p.ticketDetail.createdAt), "MMM d, h:mm a")}</p>
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{p.ticketDetail.message}</p>
                    </div>

                    {p.ticketReplies.map((reply: any) => (
                      <div
                        key={reply.id}
                        className={`p-4 rounded-md ${reply.userName === p.ticketDetail.userName || reply.userEmail === p.ticketDetail.userEmail ? "bg-muted ml-4" : "bg-primary/10 mr-4"}`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <p className="text-xs text-muted-foreground font-medium">{reply.userName || reply.userEmail || "Platform Support"}</p>
                          <p className="text-xs text-muted-foreground">{format(new Date(reply.createdAt), "MMM d, h:mm a")}</p>
                        </div>
                        <p className="text-sm whitespace-pre-wrap">{reply.message}</p>
                      </div>
                    ))}

                    {p.ticketDetailLoading && (
                      <div className="flex justify-center py-4">
                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                      </div>
                    )}
                  </div>
                </ScrollArea>

                {p.ticketDetail.status !== "closed" && (
                  <form onSubmit={p.handleTicketReply} className="space-y-2">
                    <Textarea
                      value={p.ticketReplyMessage}
                      onChange={(e) => p.setTicketReplyMessage(e.target.value)}
                      placeholder="Type your reply as Platform Support..."
                      rows={4}
                      data-testid="input-ticket-reply"
                    />
                    <div className="flex gap-2 justify-end">
                      <Button type="button" variant="outline" onClick={() => p.handleTicketStatusChange("closed")} disabled={p.updateTicketStatusMutation.isPending} data-testid="button-close-ticket">
                        <XCircle className="mr-2 h-4 w-4" />
                        Close Ticket
                      </Button>
                      <Button type="submit" disabled={p.replyToTicketMutation.isPending} data-testid="button-send-reply">
                        {p.replyToTicketMutation.isPending ? (
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

                {p.ticketDetail.status === "closed" && (
                  <div className="flex items-center gap-2 justify-center text-sm text-muted-foreground py-4">
                    <Check className="h-4 w-4" />
                    This ticket is closed
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </TabsContent>
  );
}
