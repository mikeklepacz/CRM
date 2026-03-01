import { useMutation } from "@tanstack/react-query";

import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Message } from "./types";

interface ToastApi {
  (input: { title: string; description: string; variant?: "destructive" }): void;
}

interface UseAlignerMutationsParams {
  selectedConversationId: string | null;
  isCreatingNew: boolean;
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  setSelectedConversationId: (id: string | null) => void;
  setIsCreatingNew: (value: boolean) => void;
  toast: ToastApi;
}

export function useAlignerMutations({
  selectedConversationId,
  isCreatingNew,
  setMessages,
  setSelectedConversationId,
  setIsCreatingNew,
  toast,
}: UseAlignerMutationsParams) {
  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      return await apiRequest("POST", "/api/aligner/chat", {
        message: content,
        conversationId: selectedConversationId,
      });
    },
    onSuccess: (data) => {
      setMessages((prev) => [...prev, { role: "assistant", content: data.message }]);

      if (data.conversationId && data.conversationId !== selectedConversationId) {
        setSelectedConversationId(data.conversationId);
      }

      if (isCreatingNew) {
        setIsCreatingNew(false);
      }

      queryClient.invalidateQueries({ queryKey: ["/api/aligner/chat/history"] });
      queryClient.invalidateQueries({
        queryKey: ["/api/aligner/conversations", selectedConversationId || data.conversationId, "messages"],
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to get Aligner response",
        variant: "destructive",
      });
    },
  });

  const deleteConversationMutation = useMutation({
    mutationFn: async (conversationId: string) => {
      return await apiRequest("DELETE", `/api/conversations/${conversationId}`);
    },
    onSuccess: (_, deletedId) => {
      if (deletedId === selectedConversationId) {
        setSelectedConversationId(null);
        setMessages([]);
      }
      queryClient.invalidateQueries({ queryKey: ["/api/aligner/chat/history"] });
      toast({
        title: "Success",
        description: "Conversation deleted",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete conversation",
        variant: "destructive",
      });
    },
  });

  const agreeAndCreateProposalsMutation = useMutation({
    mutationFn: async (conversationId: string) => {
      return await apiRequest("POST", "/api/aligner/agree-and-create-proposals", { conversationId });
    },
    onSuccess: (data) => {
      toast({
        title: "Success",
        description: data.message || `Created ${data.proposalsCreated} proposal(s)`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/kb/proposals"] });
      queryClient.invalidateQueries({ queryKey: ["/api/aligner/chat/history"] });
      queryClient.invalidateQueries({ queryKey: ["/api/aligner/conversations", selectedConversationId, "messages"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create proposals",
        variant: "destructive",
      });
    },
  });

  const createProposalsMutation = useMutation({
    mutationFn: async (conversationId: string) => {
      return await apiRequest("POST", "/api/aligner/create-proposals-from-chat", { conversationId });
    },
    onSuccess: (data) => {
      toast({
        title: "Success",
        description: `Created ${data.proposalsCreated} proposal(s). Review them in the Proposals tab.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/kb/proposals"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create proposals from chat",
        variant: "destructive",
      });
    },
  });

  return {
    sendMessageMutation,
    deleteConversationMutation,
    agreeAndCreateProposalsMutation,
    createProposalsMutation,
  };
}
