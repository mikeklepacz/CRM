import { format } from "date-fns";
import { Loader2, MessageSquare } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Ticket } from "./types";

interface TicketListViewProps {
  onSelectTicket: (id: string) => void;
  onStartCreate: () => void;
  tickets: Ticket[];
  ticketsLoading: boolean;
  userRole?: string;
}

export function TicketListView({ onSelectTicket, onStartCreate, tickets, ticketsLoading, userRole }: TicketListViewProps) {
  return (
    <div className="space-y-4">
      <Button onClick={onStartCreate} className="w-full" data-testid="button-new-ticket">
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
            <div className="text-center py-8 text-muted-foreground text-sm">No tickets yet. Create one to get help!</div>
          ) : (
            tickets.map((ticket) => (
              <div
                key={ticket.id}
                className="p-3 border rounded-md hover-elevate active-elevate-2 cursor-pointer"
                onClick={() => onSelectTicket(ticket.id)}
                data-testid={`ticket-${ticket.id}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-medium text-sm truncate">{ticket.subject}</h4>
                      {ticket.isUnreadByUser && userRole !== "admin" && (
                        <Badge variant="destructive" className="text-xs">
                          New
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <Badge variant="outline" className="text-xs">
                        {ticket.category}
                      </Badge>
                      <Badge variant={ticket.status === "closed" ? "secondary" : "default"} className="text-xs">
                        {ticket.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{ticket.message}</p>
                    <p className="text-xs text-muted-foreground mt-2">{format(new Date(ticket.createdAt), "MMM d, yyyy h:mm a")}</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
