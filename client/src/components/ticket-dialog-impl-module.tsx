import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TicketCreateView } from "@/components/ticket-dialog/create-view";
import { TicketDetailView } from "@/components/ticket-dialog/detail-view";
import { TicketListView } from "@/components/ticket-dialog/list-view";
import { useTicketDialog } from "@/components/ticket-dialog/use-ticket-dialog";

interface TicketDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TicketDialog({ open, onOpenChange }: TicketDialogProps) {
  const {
    category,
    createMutation,
    detailLoading,
    handleReply,
    handleSubmit,
    message,
    replyMessage,
    replyMutation,
    replies,
    setCategory,
    selectedTicketId,
    setMessage,
    setReplyMessage,
    setSelectedTicketId,
    setSubject,
    setView,
    subject,
    ticketDetail,
    tickets,
    ticketsLoading,
    user,
    view,
  } = useTicketDialog(open);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{view === "create" ? "New Support Ticket" : view === "detail" ? "Ticket Details" : "Support Tickets"}</DialogTitle>
          <DialogDescription>
            {view === "create"
              ? "Submit feedback, report bugs, or ask for help"
              : view === "detail"
                ? "View conversation and reply"
                : "View your support tickets and submit new ones"}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          {view === "list" && (
            <TicketListView
              onSelectTicket={(id) => {
                setSelectedTicketId(id);
                setView("detail");
              }}
              onStartCreate={() => setView("create")}
              tickets={tickets}
              ticketsLoading={ticketsLoading}
              userRole={user?.role}
            />
          )}

          {view === "create" && (
            <TicketCreateView
              category={category}
              createPending={createMutation.isPending}
              message={message}
              onCancel={() => setView("list")}
              onSubmit={handleSubmit}
              setCategory={setCategory}
              setMessage={setMessage}
              setSubject={setSubject}
              subject={subject}
            />
          )}

          {view === "detail" && selectedTicketId && ticketDetail && (
            <TicketDetailView
              currentUserId={user?.id}
              detailLoading={detailLoading}
              onBack={() => setView("list")}
              onReply={handleReply}
              replyMessage={replyMessage}
              replyPending={replyMutation.isPending}
              replies={replies}
              setReplyMessage={setReplyMessage}
              ticketDetail={ticketDetail}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
