import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import type { Ticket, TicketReply } from "./types";

export function useAdminTicketInbox() {
  const { toast } = useToast();
  const { user } = useAuth();

  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [replyMessage, setReplyMessage] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const prevTenantIdRef = useRef<string | undefined>(user?.tenantId);

  useEffect(() => {
    if (prevTenantIdRef.current !== user?.tenantId) {
      setSelectedTicketId(null);
      setReplyMessage("");
      prevTenantIdRef.current = user?.tenantId;
    }
  }, [user?.tenantId]);

  const { data: ticketsData, isLoading: ticketsLoading } = useQuery<{ tickets: Ticket[] }>({
    queryKey: ["/api/tickets/admin"],
  });

  const { data: ticketDetailData, isLoading: detailLoading } = useQuery<{
    ticket: Ticket;
    replies: TicketReply[];
  }>({
    queryKey: ["/api/tickets", selectedTicketId],
    enabled: !!selectedTicketId,
  });

  const tickets = ticketsData?.tickets || [];

  const markReadMutation = useMutation({
    mutationFn: async (ticketId: string) => {
      return await apiRequest("POST", `/api/tickets/${ticketId}/mark-read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tickets/admin"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tickets/unread-count"] });
      if (selectedTicketId) {
        queryClient.invalidateQueries({ queryKey: ["/api/tickets", selectedTicketId] });
      }
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ ticketId, status }: { ticketId: string; status: string }) => {
      return await apiRequest("PATCH", `/api/tickets/${ticketId}/status`, { status });
    },
    onSuccess: () => {
      toast({
        title: "Status Updated",
        description: "Ticket status has been updated.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/tickets/admin"] });
      if (selectedTicketId) {
        queryClient.invalidateQueries({ queryKey: ["/api/tickets", selectedTicketId] });
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

  const replyMutation = useMutation({
    mutationFn: async (data: { ticketId: string; message: string }) => {
      return await apiRequest("POST", `/api/tickets/${data.ticketId}/reply`, { message: data.message });
    },
    onSuccess: () => {
      toast({
        title: "Reply Sent",
        description: "Your reply has been sent and user notified via email.",
      });
      setReplyMessage("");
      queryClient.invalidateQueries({ queryKey: ["/api/tickets/admin"] });
      if (selectedTicketId) {
        queryClient.invalidateQueries({ queryKey: ["/api/tickets", selectedTicketId] });
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
    const ticket = tickets.find((t) => t.id === ticketId);
    if (ticket?.isUnreadByAdmin) {
      markReadMutation.mutate(ticketId);
    }
  };

  const filteredTickets = tickets.filter((t) => {
    const statusMatch = statusFilter === "all" || t.status === statusFilter;
    const categoryMatch = categoryFilter === "all" || t.category === categoryFilter;
    return statusMatch && categoryMatch;
  });

  const ticketDetail = ticketDetailData?.ticket;
  const replies = ticketDetailData?.replies || [];
  const unreadCount = tickets.filter((t) => t.isUnreadByAdmin).length;

  return {
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
  };
}
