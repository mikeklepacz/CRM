import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Ticket, TicketReply } from "./types";

export function useTicketDialog(open: boolean) {
  const { user } = useAuth();
  const { toast } = useToast();

  const [view, setView] = useState<"list" | "create" | "detail">("list");
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [category, setCategory] = useState("General Question");
  const [replyMessage, setReplyMessage] = useState("");

  const { data: ticketsData, isLoading: ticketsLoading } = useQuery<{ tickets: Ticket[] }>({
    queryKey: ["/api/tickets"],
    enabled: open,
  });

  const { data: ticketDetailData, isLoading: detailLoading } = useQuery<{
    ticket: Ticket;
    replies: TicketReply[];
  }>({
    queryKey: ["/api/tickets", selectedTicketId],
    enabled: !!selectedTicketId && view === "detail",
  });

  const createMutation = useMutation({
    mutationFn: async (data: { subject: string; message: string; category: string }) => {
      return await apiRequest("POST", "/api/tickets", data);
    },
    onSuccess: () => {
      toast({
        title: "Ticket Created",
        description: "Your support ticket has been submitted. You'll receive a reply via email.",
      });
      setSubject("");
      setMessage("");
      setCategory("General Question");
      setView("list");
      queryClient.invalidateQueries({ queryKey: ["/api/tickets"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create ticket",
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
        description: "Your reply has been sent.",
      });
      setReplyMessage("");
      queryClient.invalidateQueries({ queryKey: ["/api/tickets", selectedTicketId] });
      queryClient.invalidateQueries({ queryKey: ["/api/tickets"] });
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
    if (!subject.trim() || !message.trim() || !category.trim()) {
      toast({
        title: "Missing Information",
        description: "Please provide a subject, category, and message",
        variant: "destructive",
      });
      return;
    }
    createMutation.mutate({ subject, message, category });
  };

  const handleReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyMessage.trim() || !selectedTicketId) return;
    replyMutation.mutate({ ticketId: selectedTicketId, message: replyMessage });
  };

  const tickets = ticketsData?.tickets || [];
  const ticketDetail = ticketDetailData?.ticket;
  const replies = ticketDetailData?.replies || [];

  return {
    category,
    createMutation,
    detailLoading,
    handleReply,
    handleSubmit,
    message,
    replyMessage,
    replyMutation,
    replies,
    selectedTicketId,
    setCategory,
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
  };
}
