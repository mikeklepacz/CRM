import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, AlertCircle } from "lucide-react";

import { useToast } from "@/hooks/use-toast";
import type { Conversation } from "@shared/schema";
import { AlignerSidebarPanel } from "./aligner-chat/sidebar-panel";
import { AlignerMainPanel } from "./aligner-chat/main-panel";
import { hasJSONProposals, mapConversationMessages, renderFormattedText } from "./aligner-chat/helpers";
import { useAlignerMutations } from "./aligner-chat/mutations";
import { STORAGE_KEY, type Message } from "./aligner-chat/types";

interface AlignerChatProps {
  className?: string;
}

export function AlignerChat({ className }: AlignerChatProps) {
  const { toast } = useToast();
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY);
    } catch {
      return null;
    }
  });
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: settings, isLoading: settingsLoading } = useQuery<{ hasApiKey?: boolean }>({
    queryKey: ["/api/openai/settings"],
  });

  const { data: conversations = [], isLoading: conversationsLoading } = useQuery<Conversation[]>({
    queryKey: ["/api/aligner/chat/history"],
  });

  const { data: conversationMessages = [], isLoading: messagesLoading } = useQuery<any[]>({
    queryKey: ["/api/aligner/conversations", selectedConversationId, "messages"],
    enabled: !!selectedConversationId,
  });

  const {
    sendMessageMutation,
    deleteConversationMutation,
    agreeAndCreateProposalsMutation,
    createProposalsMutation,
  } = useAlignerMutations({
    selectedConversationId,
    isCreatingNew,
    setMessages,
    setSelectedConversationId,
    setIsCreatingNew,
    toast,
  });

  useEffect(() => {
    if (selectedConversationId) {
      try {
        localStorage.setItem(STORAGE_KEY, selectedConversationId);
      } catch {
        // Ignore localStorage errors
      }
    }
  }, [selectedConversationId]);

  useEffect(() => {
    if (!selectedConversationId) {
      setMessages([]);
    } else if (conversationMessages && conversationMessages.length > 0) {
      setMessages(mapConversationMessages(conversationMessages));
    } else if (selectedConversationId) {
      setMessages([]);
    }
  }, [conversationMessages, selectedConversationId]);

  useEffect(() => {
    if (isCreatingNew) return;

    if (conversations.length > 0) {
      const selectedExists = selectedConversationId && conversations.some((c) => c.id === selectedConversationId);
      if (!selectedExists) {
        setSelectedConversationId(conversations[0].id);
      }
    } else if (selectedConversationId) {
      setSelectedConversationId(null);
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch {
        // Ignore localStorage errors
      }
    }
  }, [conversations, selectedConversationId, isCreatingNew]);

  useEffect(() => {
    const timer = setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
    }, 100);

    return () => clearTimeout(timer);
  }, [messages]);

  useEffect(() => {
    if (conversationMessages && conversationMessages.length > 0) {
      const timer = setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [conversationMessages]);

  const handleNewConversation = () => {
    setIsCreatingNew(true);
    setSelectedConversationId(null);
    setMessages([]);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore localStorage errors
    }
  };

  const handleSendMessage = () => {
    if (!message.trim()) return;

    const userMessage = message.trim();
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setMessage("");
    sendMessageMutation.mutate(userMessage);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (settingsLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading...
        </div>
      </div>
    );
  }

  if (!settings?.hasApiKey) {
    return (
      <div className="flex items-center justify-center h-full p-6">
        <div className="text-center space-y-4">
          <AlertCircle className="h-12 w-12 mx-auto text-amber-600" />
          <div>
            <h3 className="font-semibold mb-2">OpenAI Not Configured</h3>
            <p className="text-sm text-muted-foreground">Configure the OpenAI API key in the Admin Dashboard to use the Aligner</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex h-full overflow-hidden ${className || ""}`}>
      <AlignerSidebarPanel
        sidebarOpen={sidebarOpen}
        conversationsLoading={conversationsLoading}
        conversations={conversations}
        selectedConversationId={selectedConversationId}
        onCloseSidebar={() => setSidebarOpen(false)}
        onNewConversation={handleNewConversation}
        onSelectConversation={(conversationId) => {
          setSelectedConversationId(conversationId);
          setIsCreatingNew(false);
        }}
        onDeleteConversation={(conversationId) => deleteConversationMutation.mutate(conversationId)}
      />

      <AlignerMainPanel
        sidebarOpen={sidebarOpen}
        selectedConversationId={selectedConversationId}
        conversations={conversations}
        messages={messages}
        messagesLoading={messagesLoading}
        sendPending={sendMessageMutation.isPending}
        agreePending={agreeAndCreateProposalsMutation.isPending}
        createPending={createProposalsMutation.isPending}
        message={message}
        messagesEndRef={messagesEndRef}
        hasJSONProposals={hasJSONProposals}
        renderFormattedText={renderFormattedText}
        onOpenSidebar={() => setSidebarOpen(true)}
        onMessageChange={setMessage}
        onMessageKeyDown={handleKeyPress}
        onSendMessage={handleSendMessage}
        onAgreeAndCreateProposals={() => {
          if (selectedConversationId) {
            agreeAndCreateProposalsMutation.mutate(selectedConversationId);
          }
        }}
        onCreateProposals={() => {
          if (selectedConversationId) {
            createProposalsMutation.mutate(selectedConversationId);
          }
        }}
      />
    </div>
  );
}
