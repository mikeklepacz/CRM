import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import type { ChatMessage as ChatMessageType, Conversation, Project, Template } from "@shared/schema";
import type { TimelineItem } from "@/components/inline-ai-chat-enhanced.types";

export function useInlineAiQueries({
  selectedConversationId,
  timeline,
}: {
  selectedConversationId: string | null;
  timeline: TimelineItem[];
}) {
  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  const { data: conversations = [] } = useQuery<Conversation[]>({
    queryKey: ["/api/conversations"],
  });

  const { data: templates = [] } = useQuery<Template[]>({
    queryKey: ["/api/templates"],
  });

  const { data: allTags = [] } = useQuery<string[]>({
    queryKey: ["/api/templates/tags"],
  });

  const { data: userTags = [] } = useQuery<
    Array<{ id: string; userId: string; tag: string; createdAt: Date }>
  >({
    queryKey: ["/api/user-tags"],
  });

  const { data: savedEmailImages = [] } = useQuery<any[]>({
    queryKey: ["/api/email-images"],
  });

  const { data: messages = [], isLoading: messagesLoading } = useQuery<ChatMessageType[]>({
    queryKey: ["/api/conversations", selectedConversationId, "messages"],
    enabled: !!selectedConversationId,
    queryFn: async () => {
      const res = await fetch(`/api/conversations/${selectedConversationId}/messages`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch messages");
      return res.json();
    },
  });

  const mergedTimeline = useMemo(() => {
    const serverMessageItems: Array<Extract<TimelineItem, { type: "message" }>> = messages.map(
      (msg) => ({
        type: "message" as const,
        id: msg.id,
        role: msg.role as "user" | "assistant",
        content: msg.content,
        timestamp: new Date(msg.createdAt || Date.now()).getTime(),
        status: "sent" as const,
      }),
    );

    const filteredTimeline = timeline.filter((item) => {
      if (item.type === "script") return true;

      const messageItem = item as {
        type: "message";
        id: string;
        role: "user" | "assistant";
        content: string;
        timestamp: number;
        status?: "pending" | "sent" | "error";
        error?: string;
      };

      if (messageItem.status === "error") return true;

      const hasServerVersion = serverMessageItems.some(
        (serverMsg) =>
          serverMsg.role === messageItem.role &&
          serverMsg.content === messageItem.content &&
          Math.abs(serverMsg.timestamp - messageItem.timestamp) < 5000,
      );

      return !hasServerVersion;
    });

    const combined = [...filteredTimeline, ...serverMessageItems];
    return combined.sort((a, b) => a.timestamp - b.timestamp);
  }, [messages, timeline]);

  return {
    projects,
    conversations,
    templates,
    allTags,
    userTags,
    savedEmailImages,
    messages,
    messagesLoading,
    mergedTimeline,
  };
}
