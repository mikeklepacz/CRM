import { format } from "date-fns";
import { Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TICKET_CATEGORIES, type Ticket } from "./types";

interface TicketListPanelProps {
  categoryFilter: string;
  filteredTickets: Ticket[];
  handleTicketSelect: (ticketId: string) => void;
  selectedTicketId: string | null;
  setCategoryFilter: (value: string) => void;
  setStatusFilter: (value: string) => void;
  statusFilter: string;
  ticketsLoading: boolean;
  unreadCount: number;
}

export function TicketListPanel({
  categoryFilter,
  filteredTickets,
  handleTicketSelect,
  selectedTicketId,
  setCategoryFilter,
  setStatusFilter,
  statusFilter,
  ticketsLoading,
  unreadCount,
}: TicketListPanelProps) {
  return (
    <Card className="lg:col-span-1">
      <CardHeader>
        <CardTitle>Support Tickets</CardTitle>
        <CardDescription>
          {unreadCount > 0 && (
            <span className="text-destructive font-medium">
              {unreadCount} unread ticket{unreadCount > 1 ? "s" : ""}
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
              <div className="text-center py-8 text-muted-foreground text-sm">No tickets found</div>
            ) : (
              filteredTickets.map((ticket) => (
                <div
                  key={ticket.id}
                  className={`p-3 border rounded-md hover-elevate active-elevate-2 cursor-pointer ${
                    selectedTicketId === ticket.id ? "bg-accent" : ""
                  }`}
                  onClick={() => handleTicketSelect(ticket.id)}
                  data-testid={`ticket-${ticket.id}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-medium text-sm truncate">{ticket.subject}</h4>
                        {ticket.isUnreadByAdmin && (
                          <Badge variant="destructive" className="text-xs">
                            New
                          </Badge>
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
                        <Badge variant={ticket.status === "closed" ? "secondary" : "default"} className="text-xs">
                          {ticket.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        From: {ticket.userName || ticket.userEmail}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(ticket.createdAt), "MMM d, h:mm a")}
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
  );
}
