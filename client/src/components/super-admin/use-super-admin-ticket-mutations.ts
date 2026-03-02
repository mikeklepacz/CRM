import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";

export function useSuperAdminTicketMutations(props: any) {
  const p = props;

  const markTicketReadMutation = useMutation({
    mutationFn: async (ticketId: string) => {
      return await apiRequest("POST", `/api/tickets/${ticketId}/mark-read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/tickets"] });
      if (p.selectedTicketId) {
        queryClient.invalidateQueries({ queryKey: ["/api/tickets", p.selectedTicketId] });
      }
    },
  });

  const updateTicketStatusMutation = useMutation({
    mutationFn: async ({ ticketId, status }: { ticketId: string; status: string }) => {
      return await apiRequest("PATCH", `/api/tickets/${ticketId}/status`, { status });
    },
    onSuccess: () => {
      p.toast({ title: "Status Updated", description: "Ticket status has been updated." });
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/tickets"] });
      if (p.selectedTicketId) {
        queryClient.invalidateQueries({ queryKey: ["/api/tickets", p.selectedTicketId] });
      }
    },
    onError: (error: any) => {
      p.toast({ title: "Error", description: error.message || "Failed to update status", variant: "destructive" });
    },
  });

  const replyToTicketMutation = useMutation({
    mutationFn: async (data: { ticketId: string; message: string }) => {
      return await apiRequest("POST", `/api/tickets/${data.ticketId}/reply`, { message: data.message });
    },
    onSuccess: () => {
      p.toast({ title: "Reply Sent", description: "Your reply has been sent and user notified." });
      p.setTicketReplyMessage("");
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/tickets"] });
      if (p.selectedTicketId) {
        queryClient.invalidateQueries({ queryKey: ["/api/tickets", p.selectedTicketId] });
      }
    },
    onError: (error: any) => {
      p.toast({ title: "Error", description: error.message || "Failed to send reply", variant: "destructive" });
    },
  });

  return { markTicketReadMutation, replyToTicketMutation, updateTicketStatusMutation };
}
