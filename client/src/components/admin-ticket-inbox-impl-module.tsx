import { TicketDetailPanel } from "@/components/admin-ticket-inbox/ticket-detail-panel";
import { TicketListPanel } from "@/components/admin-ticket-inbox/ticket-list-panel";
import { useAdminTicketInbox } from "@/components/admin-ticket-inbox/use-admin-ticket-inbox";

export function AdminTicketInbox() {
  const {
    categoryFilter,
    detailLoading,
    filteredTickets,
    handleReply,
    handleStatusChange,
    handleTicketSelect,
    replyMessage,
    replyMutation,
    replies,
    selectedTicketId,
    setCategoryFilter,
    setReplyMessage,
    setStatusFilter,
    statusFilter,
    ticketDetail,
    tickets,
    ticketsLoading,
    unreadCount,
    updateStatusMutation,
  } = useAdminTicketInbox();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <TicketListPanel
        categoryFilter={categoryFilter}
        filteredTickets={filteredTickets}
        handleTicketSelect={handleTicketSelect}
        selectedTicketId={selectedTicketId}
        setCategoryFilter={setCategoryFilter}
        setStatusFilter={setStatusFilter}
        statusFilter={statusFilter}
        ticketsLoading={ticketsLoading}
        unreadCount={unreadCount}
      />
      <TicketDetailPanel
        detailLoading={detailLoading}
        handleReply={handleReply}
        handleStatusChange={handleStatusChange}
        replyMessage={replyMessage}
        replyMutation={replyMutation}
        replies={replies}
        setReplyMessage={setReplyMessage}
        ticketDetail={ticketDetail}
        tickets={tickets}
        updateStatusMutation={updateStatusMutation}
      />
    </div>
  );
}
