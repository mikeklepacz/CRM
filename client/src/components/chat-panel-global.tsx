import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useChatPanel } from "@/hooks/useChatPanel";
import { getPageContext } from "@/hooks/usePageContext";
import { useAuth } from "@/hooks/useAuth";
import { ConversationContextMenu } from "./conversation-context-menu";
import {
  Bot,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Copy,
  Folder,
  FolderPlus,
  Loader2,
  Mail,
  MessageSquarePlus,
  PanelLeft,
  Plus,
  Search,
  Send,
  Sparkles,
  Tag,
  Trash2,
  User as UserIcon,
  X,
} from "lucide-react";
import type {
  Conversation,
  Project,
  Template,
  ChatMessage as ChatMessageType,
} from "@shared/schema";

// Helper function to detect and parse email content from AI messages
function parseEmailFromMessage(content: string): { to: string; subject: string; body: string } | null {
  // Look for email pattern: To:, Subject:, and Body: (or Message:)
  const toMatch = content.match(/To:\s*(.+?)(?:\n|$)/i);
  const subjectMatch = content.match(/Subject:\s*(.+?)(?:\n|$)/i);
  
  // Match body from "Body:" or "Message:" to the end of content (captures multi-paragraph emails)
  const bodyMatch = content.match(/(?:Body|Message):\s*\n([\s\S]+)$/i);

  if (toMatch && subjectMatch && bodyMatch) {
    return {
      to: toMatch[1].trim(),
      subject: subjectMatch[1].trim(),
      body: bodyMatch[1].trim(),
    };
  }
  return null;
}

// Helper function to replace template variables with actual values
function replaceTemplateVariables(
  content: string,
  storeContext?: {
    name?: string;
    address?: string;
    city?: string;
    state?: string;
    phone?: string;
    website?: string;
    email?: string;
    point_of_contact?: string;
    poc_email?: string;
    poc_phone?: string;
  },
  user?: any
) {
  let result = content;
  
  // Get user data (agent info)
  const agentName = user?.username || "Your Name";
  const agentEmail = user?.email || "your@email.com";
  const agentPhone = (user as any)?.phone || "";
  const agentMeetingLink = (user as any)?.meetingLink || "";
  
  // Replace store-related variables
  if (storeContext) {
    // Smart email fallback: Check POC email first, then fall back to general email
    const smartEmail = storeContext.poc_email || storeContext.email || "";
    
    result = result.replace(/\{\{storeName\}\}/g, storeContext.name || "");
    result = result.replace(/\{\{storeAddress\}\}/g, storeContext.address || "");
    result = result.replace(/\{\{storeCity\}\}/g, storeContext.city || "");
    result = result.replace(/\{\{storeState\}\}/g, storeContext.state || "");
    result = result.replace(/\{\{storePhone\}\}/g, storeContext.phone || "");
    result = result.replace(/\{\{storeWebsite\}\}/g, storeContext.website || "");
    result = result.replace(/\{\{pocName\}\}/g, storeContext.point_of_contact || "");
    // Both pocEmail and email use smart fallback
    result = result.replace(/\{\{pocEmail\}\}/g, smartEmail);
    result = result.replace(/\{\{email\}\}/g, smartEmail);
    result = result.replace(/\{\{pocPhone\}\}/g, storeContext.poc_phone || "");
  }
  
  // Replace agent variables
  result = result.replace(/\{\{agentName\}\}/g, agentName);
  result = result.replace(/\{\{agentEmail\}\}/g, agentEmail);
  result = result.replace(/\{\{agentPhone\}\}/g, agentPhone);
  result = result.replace(/\{\{agentMeetingLink\}\}/g, agentMeetingLink);
  
  // Replace date/time variables
  const now = new Date();
  result = result.replace(/\{\{currentDate\}\}/g, now.toLocaleDateString());
  result = result.replace(/\{\{currentTime\}\}/g, now.toLocaleTimeString());
  
  return result;
}

export function ChatPanelGlobal({ storeContext: propStoreContext }: {
  storeContext?: {
    name?: string;
    address?: string;
    city?: string;
    state?: string;
    phone?: string;
    website?: string;
    email?: string;
    point_of_contact?: string;
    poc_email?: string;
    poc_phone?: string;
  };
} = {}) {
  const { isPanelOpen, closePanel } = useChatPanel();
  const { toast } = useToast();
  const { user } = useAuth();
  
  // Get storeContext from prop or page context
  const storeContext = propStoreContext || getPageContext();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [messageInput, setMessageInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Template form state
  const [newTemplateTitle, setNewTemplateTitle] = useState("");
  const [newTemplateContent, setNewTemplateContent] = useState("");
  const [newTemplateTags, setNewTemplateTags] = useState("");
  const [templateSearch, setTemplateSearch] = useState("");

  // Dialog states
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  const [renamingConversation, setRenamingConversation] = useState<Conversation | null>(null);
  const [deleteConversationId, setDeleteConversationId] = useState<string | null>(null);
  const [newProjectDialogOpen, setNewProjectDialogOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");

  // Email detection state
  const [detectedEmail, setDetectedEmail] = useState<{
    to: string;
    subject: string;
    body: string;
  } | null>(null);

  // Queries
  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
    enabled: isPanelOpen,
  });

  const { data: conversations = [] } = useQuery<Conversation[]>({
    queryKey: ["/api/conversations"],
    enabled: isPanelOpen,
  });

  const { data: templates = [] } = useQuery<Template[]>({
    queryKey: ["/api/templates"],
    enabled: isPanelOpen,
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

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Detect email in assistant messages
  useEffect(() => {
    if (messages && messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.role === "assistant") {
        const emailMatch = lastMessage.content.match(/Subject:\s*(.+?)\n[\s\S]*?To:\s*(.+?)\n[\s\S]*?(?:Body|Message):\s*([\s\S]+)/i);
        if (emailMatch) {
          const contextData = conversations.find(c => c.id === selectedConversationId)?.contextData;
          setDetectedEmail({
            subject: emailMatch[1].trim(),
            to: contextData?.pocEmail || emailMatch[2].trim(),
            body: emailMatch[3].trim(),
          });
        } else {
          setDetectedEmail(null);
        }
      }
    }
  }, [messages, selectedConversationId, conversations]);

  // Mutations
  const createConversationMutation = useMutation({
    mutationFn: async () => {
      const contextData = getPageContext();
      return await apiRequest("POST", "/api/conversations", {
        title: "New Chat",
        contextData: contextData || {},
        projectId: null,
      });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      setSelectedConversationId(data.id);
    },
  });

  const createProjectMutation = useMutation({
    mutationFn: async (name: string) => {
      return await apiRequest("POST", "/api/projects", { name });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      setNewProjectDialogOpen(false);
      setNewProjectName("");
      toast({ title: "Success", description: "Project created" });
    },
  });

  const renameConversationMutation = useMutation({
    mutationFn: async ({ id, title }: { id: string; title: string }) => {
      return await apiRequest("POST", `/api/conversations/${id}/rename`, { title });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      setRenameDialogOpen(false);
      toast({ title: "Success", description: "Conversation renamed" });
    },
  });

  const moveConversationMutation = useMutation({
    mutationFn: async ({ conversationId, projectId }: { conversationId: string; projectId: string | null }) => {
      return await apiRequest("POST", `/api/conversations/${conversationId}/move`, { projectId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      toast({ title: "Success", description: "Conversation moved" });
    },
  });

  const deleteConversationMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/conversations/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      if (selectedConversationId === deleteConversationId) {
        setSelectedConversationId(null);
      }
      setDeleteConversationId(null);
      toast({ title: "Success", description: "Conversation deleted" });
    },
  });

  const createGmailDraftMutation = useMutation({
    mutationFn: async ({ to, subject, body }: { to: string; subject: string; body: string }) => {
      return await apiRequest("POST", "/api/gmail/create-draft", { to, subject, body });
    },
    onSuccess: (data) => {
      toast({
        title: "Success",
        description: data.message || "Gmail draft created successfully!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create Gmail draft. Make sure Gmail is connected in Settings.",
        variant: "destructive",
      });
    },
  });

  const createTemplateMutation = useMutation({
    mutationFn: async (template: { title: string; content: string; tags: string[] }) => {
      return await apiRequest("POST", "/api/templates", template);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/templates"] });
      setNewTemplateTitle("");
      setNewTemplateContent("");
      setNewTemplateTags("");
      toast({ title: "Success", description: "Template saved" });
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (message: string) => {
      const contextData = selectedConversationId
        ? conversations.find(c => c.id === selectedConversationId)?.contextData
        : getPageContext();

      return await apiRequest("POST", "/api/openai/chat", {
        message,
        conversationId: selectedConversationId,
        contextData,
      });
    },
    onSuccess: (data) => {
      if (data.conversationId && !selectedConversationId) {
        setSelectedConversationId(data.conversationId);
      }
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/conversations", selectedConversationId || data.conversationId, "messages"] });
      setMessageInput("");
      setIsSending(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send message",
        variant: "destructive",
      });
      setIsSending(false);
    },
  });

  const handleSendMessage = () => {
    if (!messageInput.trim() || isSending) return;
    setIsSending(true);
    sendMessageMutation.mutate(messageInput);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleCopyTemplate = async (content: string) => {
    // Fill template variables before copying
    const filledContent = replaceTemplateVariables(content, storeContext, user);
    try {
      await navigator.clipboard.writeText(filledContent);
      toast({ title: "Success", description: "Template copied to clipboard" });
    } catch {
      toast({
        title: "Error",
        description: "Failed to copy to clipboard",
        variant: "destructive",
      });
    }
  };

  const handleEmailTemplate = (template: Template) => {
    // Fill template variables
    const filledContent = replaceTemplateVariables(template.content, storeContext, user);
    
    // Try to parse email format
    const emailData = parseEmailFromMessage(filledContent);
    
    if (emailData) {
      // Create Gmail draft
      createGmailDraftMutation.mutate(emailData);
    } else {
      // Fallback: try to use store email or show error
      const email = storeContext?.poc_email || storeContext?.email;
      if (email) {
        const mailtoLink = `mailto:${email}?subject=${encodeURIComponent(
          template.title
        )}&body=${encodeURIComponent(filledContent)}`;
        window.location.href = mailtoLink;
      } else {
        toast({
          title: "Error",
          description: "No email format detected and no recipient email available",
          variant: "destructive",
        });
      }
    }
  };

  const handleSaveTemplate = () => {
    if (!newTemplateTitle.trim() || !newTemplateContent.trim()) {
      toast({
        title: "Error",
        description: "Title and content are required",
        variant: "destructive",
      });
      return;
    }

    const tags = newTemplateTags
      .split(",")
      .map(t => t.trim())
      .filter(Boolean);

    createTemplateMutation.mutate({
      title: newTemplateTitle,
      content: newTemplateContent,
      tags,
    });
  };

  const handleOpenEmail = () => {
    if (!detectedEmail) return;
    const mailtoLink = `mailto:${detectedEmail.to}?subject=${encodeURIComponent(
      detectedEmail.subject
    )}&body=${encodeURIComponent(detectedEmail.body)}`;
    window.location.href = mailtoLink;
  };

  // Group conversations by project
  const conversationsByProject = conversations.reduce((acc, conv) => {
    const projectId = conv.projectId || "none";
    if (!acc[projectId]) acc[projectId] = [];
    acc[projectId].push(conv);
    return acc;
  }, {} as Record<string, Conversation[]>);

  const filteredTemplates = templates.filter(t => {
    if (!templateSearch) return true;
    const search = templateSearch.toLowerCase();
    return (
      t.title.toLowerCase().includes(search) ||
      t.content.toLowerCase().includes(search) ||
      t.tags?.some(tag => tag.toLowerCase().includes(search))
    );
  });

  const selectedConversation = conversations.find(c => c.id === selectedConversationId);

  return (
    <>
      <Sheet open={isPanelOpen} onOpenChange={closePanel}>
        <SheetContent
          side="left"
          className="w-[33.33vw] max-w-[500px] p-0 flex flex-col"
          data-testid="panel-sales-assistant"
        >
          <div className="flex h-full">
            {/* Sidebar */}
            <div
              className={`border-r flex flex-col transition-all duration-300 ${
                sidebarOpen ? "w-64" : "w-0"
              } overflow-hidden`}
            >
              <div className="p-4 border-b flex items-center justify-between">
                <h3 className="font-semibold">Conversations</h3>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSidebarOpen(false)}
                  data-testid="button-toggle-sidebar"
                >
                  <PanelLeft className="h-4 w-4" />
                </Button>
              </div>

              <div className="p-2 space-y-2">
                <Button
                  onClick={() => createConversationMutation.mutate()}
                  className="w-full"
                  disabled={createConversationMutation.isPending}
                  data-testid="button-new-chat"
                >
                  <MessageSquarePlus className="h-4 w-4 mr-2" />
                  New Chat
                </Button>
                <Button
                  onClick={() => setNewProjectDialogOpen(true)}
                  variant="outline"
                  className="w-full"
                  data-testid="button-new-project"
                >
                  <FolderPlus className="h-4 w-4 mr-2" />
                  New Project
                </Button>
              </div>

              <ScrollArea className="flex-1 p-2">
                {/* Conversations without project */}
                {conversationsByProject["none"]?.map((conv) => (
                  <ConversationContextMenu
                    key={conv.id}
                    conversationId={conv.id}
                    onRename={() => {
                      setRenamingConversation(conv);
                      setRenameValue(conv.title);
                      setRenameDialogOpen(true);
                    }}
                    onDelete={() => setDeleteConversationId(conv.id)}
                    onMove={(projectId) =>
                      moveConversationMutation.mutate({ conversationId: conv.id, projectId })
                    }
                    projects={projects}
                    currentProjectId={conv.projectId}
                  >
                    <Button
                      variant={selectedConversationId === conv.id ? "secondary" : "ghost"}
                      className="w-full justify-start mb-1 hover-elevate active-elevate-2"
                      onClick={() => setSelectedConversationId(conv.id)}
                      data-testid={`conversation-item-${conv.id}`}
                    >
                      <Sparkles className="h-4 w-4 mr-2 flex-shrink-0" />
                      <span className="truncate">{conv.title}</span>
                    </Button>
                  </ConversationContextMenu>
                ))}

                {/* Projects with conversations */}
                {projects.map((project) => (
                  <Collapsible key={project.id} defaultOpen className="mb-2">
                    <CollapsibleTrigger className="flex items-center w-full p-2 hover-elevate active-elevate-2 rounded-md" data-testid={`project-folder-${project.id}`}>
                      <ChevronDown className="h-4 w-4 mr-1" />
                      <Folder className="h-4 w-4 mr-2" />
                      <span className="font-medium truncate">{project.name}</span>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="pl-4 space-y-1">
                      {conversationsByProject[project.id]?.map((conv) => (
                        <ConversationContextMenu
                          key={conv.id}
                          conversationId={conv.id}
                          onRename={() => {
                            setRenamingConversation(conv);
                            setRenameValue(conv.title);
                            setRenameDialogOpen(true);
                          }}
                          onDelete={() => setDeleteConversationId(conv.id)}
                          onMove={(projectId) =>
                            moveConversationMutation.mutate({ conversationId: conv.id, projectId })
                          }
                          projects={projects}
                          currentProjectId={conv.projectId}
                        >
                          <Button
                            variant={selectedConversationId === conv.id ? "secondary" : "ghost"}
                            className="w-full justify-start hover-elevate active-elevate-2"
                            onClick={() => setSelectedConversationId(conv.id)}
                            data-testid={`conversation-item-${conv.id}`}
                          >
                            <Sparkles className="h-4 w-4 mr-2 flex-shrink-0" />
                            <span className="truncate">{conv.title}</span>
                          </Button>
                        </ConversationContextMenu>
                      ))}
                    </CollapsibleContent>
                  </Collapsible>
                ))}
              </ScrollArea>
            </div>

            {/* Main Chat Area */}
            <div className="flex-1 flex flex-col">
              {/* Header */}
              <div className="p-4 border-b flex items-center justify-between">
                {!sidebarOpen && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setSidebarOpen(true)}
                    data-testid="button-open-sidebar"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                )}
                <div className="flex items-center gap-2">
                  <Bot className="h-5 w-5" />
                  <h2 className="font-semibold">Sales Assistant</h2>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={closePanel}
                  data-testid="button-close-panel"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Context Indicator */}
              {selectedConversation?.contextData && (
                <div className="px-4 py-2 bg-muted/50 text-sm flex items-center gap-2" data-testid="text-context-info">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <span className="text-muted-foreground">
                    Context:{" "}
                    <span className="font-medium text-foreground">
                      {selectedConversation.contextData.storeName || "Active"}
                    </span>
                  </span>
                </div>
              )}

              {/* Messages */}
              <ScrollArea className="flex-1 p-4" ref={scrollRef}>
                {!selectedConversationId ? (
                  <div className="flex flex-col items-center justify-center h-full text-center p-8">
                    <Bot className="h-16 w-16 mb-4 text-muted-foreground opacity-50" />
                    <h3 className="text-lg font-semibold mb-2">Welcome to Sales Assistant</h3>
                    <p className="text-muted-foreground mb-4">
                      Create a new chat or select an existing conversation to get started
                    </p>
                    <Button onClick={() => createConversationMutation.mutate()} data-testid="button-start-chat">
                      <MessageSquarePlus className="h-4 w-4 mr-2" />
                      Start New Chat
                    </Button>
                  </div>
                ) : messagesLoading ? (
                  <div className="flex items-center justify-center h-full">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <p>No messages yet. Start the conversation!</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {messages.map((msg, index) => (
                      <div
                        key={msg.id || index}
                        className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                        data-testid={`message-${msg.role}-${index}`}
                      >
                        {msg.role === "assistant" && (
                          <div className="flex-shrink-0">
                            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                              <Bot className="h-4 w-4 text-primary" />
                            </div>
                          </div>
                        )}
                        <div
                          className={`max-w-[80%] rounded-lg p-3 ${
                            msg.role === "user"
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted"
                          }`}
                        >
                          <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                        </div>
                        {msg.role === "user" && (
                          <div className="flex-shrink-0">
                            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                              <UserIcon className="h-4 w-4 text-primary" />
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                    {isSending && (
                      <div className="flex gap-3">
                        <div className="flex-shrink-0">
                          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <Bot className="h-4 w-4 text-primary" />
                          </div>
                        </div>
                        <div className="bg-muted rounded-lg p-3">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Thinking...
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </ScrollArea>

              {/* Email Preview */}
              {detectedEmail && (
                <div className="mx-4 mb-2 p-4 border rounded-lg bg-muted/50" data-testid="section-email-preview">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-primary" />
                      <span className="font-semibold text-sm">Email Draft Detected</span>
                    </div>
                    <Button size="sm" onClick={handleOpenEmail} data-testid="button-open-email">
                      <Mail className="h-4 w-4 mr-2" />
                      Open in Email Client
                    </Button>
                  </div>
                  <div className="space-y-1 text-sm">
                    <p>
                      <span className="text-muted-foreground">To:</span> {detectedEmail.to}
                    </p>
                    <p>
                      <span className="text-muted-foreground">Subject:</span> {detectedEmail.subject}
                    </p>
                  </div>
                </div>
              )}

              {/* Input */}
              <div className="p-4 border-t">
                <div className="flex gap-2">
                  <Textarea
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Ask about sales scripts, objections, or product info..."
                    disabled={isSending}
                    className="min-h-[60px] max-h-[200px]"
                    data-testid="input-message"
                  />
                  <Button
                    onClick={handleSendMessage}
                    disabled={isSending || !messageInput.trim()}
                    size="icon"
                    className="h-[60px] w-[60px]"
                    data-testid="button-send-message"
                  >
                    {isSending ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <Send className="h-5 w-5" />
                    )}
                  </Button>
                </div>
              </div>

              {/* Template Library */}
              <Collapsible open={templatesOpen} onOpenChange={setTemplatesOpen}>
                <div className="border-t">
                  <CollapsibleTrigger className="w-full p-3 flex items-center justify-between hover-elevate active-elevate-2" data-testid="button-toggle-templates">
                    <div className="flex items-center gap-2">
                      <Tag className="h-4 w-4" />
                      <span className="font-semibold text-sm">Template Library</span>
                      <Badge variant="secondary">{templates.length}</Badge>
                    </div>
                    <ChevronDown
                      className={`h-4 w-4 transition-transform ${templatesOpen ? "rotate-180" : ""}`}
                    />
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="p-4 space-y-4 max-h-96 overflow-y-auto">
                      {/* Add Template Form */}
                      <div className="space-y-2 p-4 border rounded-lg">
                        <h4 className="font-semibold text-sm">Save New Template</h4>
                        <Input
                          placeholder="Template title..."
                          value={newTemplateTitle}
                          onChange={(e) => setNewTemplateTitle(e.target.value)}
                          data-testid="input-template-title"
                        />
                        <Textarea
                          placeholder="Paste content here..."
                          value={newTemplateContent}
                          onChange={(e) => setNewTemplateContent(e.target.value)}
                          className="min-h-[80px]"
                          data-testid="textarea-template-content"
                        />
                        <Input
                          placeholder="Tags (comma-separated)..."
                          value={newTemplateTags}
                          onChange={(e) => setNewTemplateTags(e.target.value)}
                          data-testid="input-template-tags"
                        />
                        <Button
                          onClick={handleSaveTemplate}
                          disabled={createTemplateMutation.isPending}
                          className="w-full"
                          data-testid="button-save-template"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Save Template
                        </Button>
                      </div>

                      {/* Search Templates */}
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Search templates..."
                          value={templateSearch}
                          onChange={(e) => setTemplateSearch(e.target.value)}
                          className="pl-9"
                          data-testid="input-search-templates"
                        />
                      </div>

                      {/* Templates List */}
                      <div className="space-y-2">
                        {filteredTemplates.map((template) => {
                          const isEmailType = template.tags?.includes("Email");
                          return (
                            <div
                              key={template.id}
                              className="p-3 border rounded-lg"
                              data-testid={`template-item-${template.id}`}
                            >
                              <div className="flex items-start justify-between mb-2">
                                <h5 className="font-semibold text-sm">{template.title}</h5>
                              </div>
                              <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                                {template.content}
                              </p>
                              {template.tags && template.tags.length > 0 && (
                                <div className="flex flex-wrap gap-1 mb-2">
                                  {template.tags.map((tag, idx) => (
                                    <Badge key={idx} variant="outline" className="text-xs">
                                      {tag}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                              <div className="flex gap-2">
                                {isEmailType && (
                                  <Button
                                    variant="default"
                                    size="sm"
                                    onClick={() => handleEmailTemplate(template)}
                                    className="flex-1"
                                    data-testid={`button-email-template-${template.id}`}
                                  >
                                    <Mail className="h-3 w-3 mr-1" />
                                    Email
                                  </Button>
                                )}
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleCopyTemplate(template.content)}
                                  className="flex-1"
                                  data-testid={`button-copy-template-${template.id}`}
                                >
                                  <Copy className="h-3 w-3 mr-1" />
                                  Copy
                                </Button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Rename Dialog */}
      <Dialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
        <DialogContent data-testid="dialog-rename-conversation">
          <DialogHeader>
            <DialogTitle>Rename Conversation</DialogTitle>
            <DialogDescription>Enter a new name for this conversation</DialogDescription>
          </DialogHeader>
          <Input
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            placeholder="Conversation name..."
            data-testid="input-rename-conversation"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (renamingConversation) {
                  renameConversationMutation.mutate({
                    id: renamingConversation.id,
                    title: renameValue,
                  });
                }
              }}
              disabled={renameConversationMutation.isPending || !renameValue.trim()}
              data-testid="button-confirm-rename"
            >
              Rename
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConversationId} onOpenChange={(open) => !open && setDeleteConversationId(null)}>
        <AlertDialogContent data-testid="dialog-delete-conversation">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Conversation?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this conversation and all its messages. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConversationId && deleteConversationMutation.mutate(deleteConversationId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* New Project Dialog */}
      <Dialog open={newProjectDialogOpen} onOpenChange={setNewProjectDialogOpen}>
        <DialogContent data-testid="dialog-new-project">
          <DialogHeader>
            <DialogTitle>Create New Project</DialogTitle>
            <DialogDescription>Enter a name for your new project folder</DialogDescription>
          </DialogHeader>
          <Input
            value={newProjectName}
            onChange={(e) => setNewProjectName(e.target.value)}
            placeholder="Project name..."
            data-testid="input-new-project-name"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewProjectDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => createProjectMutation.mutate(newProjectName)}
              disabled={createProjectMutation.isPending || !newProjectName.trim()}
              data-testid="button-create-project"
            >
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
