import { queryClient } from "@/lib/queryClient";
import type { TimelineItem } from "@/components/inline-ai-chat-enhanced.types";

export function useInlineAiMessageActions({
  messageInput,
  isSending,
  setTimeline,
  setMessageInput,
  setIsSending,
  sendMessageMutation,
  selectedConversationId,
  setSelectedConversationId,
  toast,
}: {
  messageInput: string;
  isSending: boolean;
  setTimeline: React.Dispatch<React.SetStateAction<TimelineItem[]>>;
  setMessageInput: React.Dispatch<React.SetStateAction<string>>;
  setIsSending: React.Dispatch<React.SetStateAction<boolean>>;
  sendMessageMutation: any;
  selectedConversationId: string | null;
  setSelectedConversationId: React.Dispatch<React.SetStateAction<string | null>>;
  toast: any;
}) {
  const handleSendMessage = async () => {
    if (!messageInput.trim() || isSending) return;

    const content = messageInput.trim();
    const tempId = `temp-${Date.now()}`;

    const optimisticMessage: TimelineItem = {
      type: "message",
      id: tempId,
      role: "user",
      content,
      timestamp: Date.now(),
      status: "pending",
    };

    setTimeline((prev) => [...prev, optimisticMessage]);
    setMessageInput("");
    setIsSending(true);

    try {
      const data = await sendMessageMutation.mutateAsync({
        conversationId: selectedConversationId,
        content,
      });

      if (data.conversationId && data.conversationId !== selectedConversationId) {
        setSelectedConversationId(data.conversationId);
      }

      setTimeline((prev) =>
        prev.map((item) =>
          item.id === tempId && item.type === "message"
            ? { ...item, status: "sent" as const }
            : item,
        ),
      );

      queryClient.invalidateQueries({
        queryKey: ["/api/conversations", selectedConversationId || data.conversationId, "messages"],
      });
    } catch (error: any) {
      setTimeline((prev) =>
        prev.map((item) =>
          item.id === tempId && item.type === "message"
            ? { ...item, status: "error" as const, error: error.message || "Failed to send" }
            : item,
        ),
      );

      toast({
        title: "Error",
        description: error.message || "Failed to send message",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleRetryMessage = async (messageId: string, content: string) => {
    setTimeline((prev) => prev.filter((item) => item.id !== messageId));
    setMessageInput(content);
    setTimeout(() => handleSendMessage(), 0);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return {
    handleSendMessage,
    handleRetryMessage,
    handleKeyPress,
  };
}
