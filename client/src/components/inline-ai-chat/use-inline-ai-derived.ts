import { useState } from "react";
import type { Conversation, Template } from "@shared/schema";
import { handleConversationsPanelToggle, handleTemplatesPanelToggle } from "@/components/inline-ai-sidebar-toggle";

export function useInlineAiDerived({
  conversations,
  templates,
  selectedConversationId,
  templateSearch,
  setTemplatesOpen,
}: {
  conversations: Conversation[];
  templates: Template[];
  selectedConversationId: string | null;
  templateSearch: string;
  setTemplatesOpen: React.Dispatch<React.SetStateAction<boolean>>;
}) {
  const conversationsByProject = conversations.reduce((acc, conv) => {
    const projectId = conv.projectId || "none";
    if (!acc[projectId]) acc[projectId] = [];
    acc[projectId].push(conv);
    return acc;
  }, {} as Record<string, Conversation[]>);

  const filteredTemplates = templates.filter((t) => {
    if (!templateSearch) return true;
    const search = templateSearch.toLowerCase();
    return (
      t.title.toLowerCase().includes(search) ||
      t.content.toLowerCase().includes(search) ||
      t.tags?.some((tag) => tag.toLowerCase().includes(search))
    );
  });

  const selectedConversation = conversations.find((c) => c.id === selectedConversationId);

  const [conversationsOpen, setConversationsOpen] = useState(() => {
    try {
      const stored = localStorage.getItem("wickCoach_conversationsOpen");
      return stored !== null ? stored === "true" : true;
    } catch {
      return true;
    }
  });

  const handleConversationsToggle = (isOpen: boolean) =>
    handleConversationsPanelToggle({ isOpen, setConversationsOpen, setTemplatesOpen });

  const handleTemplatesToggle = (isOpen: boolean) =>
    handleTemplatesPanelToggle({ isOpen, setConversationsOpen, setTemplatesOpen });

  return {
    conversationsByProject,
    filteredTemplates,
    selectedConversation,
    conversationsOpen,
    setConversationsOpen,
    handleConversationsToggle,
    handleTemplatesToggle,
  };
}
