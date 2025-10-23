import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Bot,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Copy,
  Folder,
  FolderPlus,
  Loader2,
  MessageSquarePlus,
  Plus,
  Search,
  Send,
  Sparkles,
  Tag,
  Trash2,
  User as UserIcon,
} from "lucide-react";
import type {
  Conversation,
  Project,
  Template,
  ChatMessage as ChatMessageType,
} from "@shared/schema";
import { ConversationContextMenu } from "./conversation-context-menu";
import { ProjectContextMenu } from "./project-context-menu";
import { EmailPreview } from "./email-preview";

interface InlineAIChatEnhancedProps {
  storeContext?: {
    sales_ready_summary?: string;
    notes?: string;
    point_of_contact?: string;
    poc_email?: string;
    poc_phone?: string;
    status?: string;
    follow_up_date?: string;
    next_action?: string;
    dba?: string;
    name: string;
    type?: string;
    link?: string;
    address?: string;
    city?: string;
    state?: string;
    phone?: string;
    email?: string;
    website?: string;
  };
  contextUpdateTrigger?: number;
}

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

export function InlineAIChatEnhanced({ storeContext, contextUpdateTrigger }: InlineAIChatEnhancedProps) {
  const { toast } = useToast();
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
  const [newProjectDialogOpen, setNewProjectDialogOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [templateBuilderOpen, setTemplateBuilderOpen] = useState(false);
  const [templateBuilderTab, setTemplateBuilderTab] = useState("build");
  
  // Template builder state
  const [builderTitle, setBuilderTitle] = useState("");
  const [builderContent, setBuilderContent] = useState("");
  const [builderTags, setBuilderTags] = useState("");
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);

  // Queries
  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  const { data: conversations = [] } = useQuery<Conversation[]>({
    queryKey: ["/api/conversations"],
  });

  const { data: templates = [] } = useQuery<Template[]>({
    queryKey: ["/api/templates"],
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

  // Handle context update from parent (when Save is clicked and contextUpdateTrigger changes)
  useEffect(() => {
    if (contextUpdateTrigger && contextUpdateTrigger > 0 && selectedConversationId && storeContext) {
      const updateContext = async () => {
        const contextData = {
          sales_ready_summary: storeContext.sales_ready_summary,
          notes: storeContext.notes,
          point_of_contact: storeContext.point_of_contact,
          poc_email: storeContext.poc_email,
          poc_phone: storeContext.poc_phone,
          status: storeContext.status,
          follow_up_date: storeContext.follow_up_date,
          next_action: storeContext.next_action,
          dba: storeContext.dba,
          storeName: storeContext.name,
          type: storeContext.type,
          link: storeContext.link,
          address: storeContext.address,
          city: storeContext.city,
          state: storeContext.state,
          phone: storeContext.phone,
          email: storeContext.email,
          website: storeContext.website,
        };
        await updateConversationContextMutation.mutateAsync({ 
          id: selectedConversationId, 
          contextData 
        });
      };
      updateContext();
    }
  }, [contextUpdateTrigger, selectedConversationId]);

  // Mutations
  const createConversationMutation = useMutation({
    mutationFn: async () => {
      const contextData = storeContext ? {
        sales_ready_summary: storeContext.sales_ready_summary,
        notes: storeContext.notes,
        point_of_contact: storeContext.point_of_contact,
        poc_email: storeContext.poc_email,
        poc_phone: storeContext.poc_phone,
        status: storeContext.status,
        follow_up_date: storeContext.follow_up_date,
        next_action: storeContext.next_action,
        dba: storeContext.dba,
        storeName: storeContext.name,
        type: storeContext.type,
        link: storeContext.link,
        address: storeContext.address,
        city: storeContext.city,
        state: storeContext.state,
        phone: storeContext.phone,
        email: storeContext.email,
        website: storeContext.website,
      } : {};
      
      return await apiRequest("POST", "/api/conversations", {
        title: storeContext?.name ? `Chat about ${storeContext.name}` : "New Chat",
        contextData,
        projectId: null,
      });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      setSelectedConversationId(data.id);
    },
  });

  const updateConversationContextMutation = useMutation({
    mutationFn: async ({ id, contextData }: { id: string; contextData: any }) => {
      return await apiRequest("PATCH", `/api/conversations/${id}`, { contextData });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      toast({ title: "Context updated", description: "Store information refreshed in conversation" });
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

  const deleteProjectMutation = useMutation({
    mutationFn: async (projectId: string) => {
      return await apiRequest("DELETE", `/api/projects/${projectId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      toast({ title: "Success", description: "Project folder deleted" });
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: async ({ conversationId, content }: { conversationId: string | null; content: string }) => {
      const contextData = storeContext ? {
        sales_ready_summary: storeContext.sales_ready_summary,
        notes: storeContext.notes,
        point_of_contact: storeContext.point_of_contact,
        poc_email: storeContext.poc_email,
        poc_phone: storeContext.poc_phone,
        status: storeContext.status,
        follow_up_date: storeContext.follow_up_date,
        next_action: storeContext.next_action,
        dba: storeContext.dba,
        storeName: storeContext.name,
        type: storeContext.type,
        link: storeContext.link,
        address: storeContext.address,
        city: storeContext.city,
        state: storeContext.state,
        phone: storeContext.phone,
        email: storeContext.email,
        website: storeContext.website,
      } : undefined;

      return await apiRequest("POST", "/api/openai/chat", {
        message: content,
        conversationId,
        contextData,
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

  const deleteTemplateMutation = useMutation({
    mutationFn: async (templateId: string) => {
      return await apiRequest("DELETE", `/api/templates/${templateId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/templates"] });
      toast({ title: "Success", description: "Template deleted" });
    },
  });

  const deleteConversationMutation = useMutation({
    mutationFn: async (conversationId: string) => {
      return await apiRequest("DELETE", `/api/conversations/${conversationId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      setSelectedConversationId(null);
      toast({ title: "Success", description: "Conversation deleted" });
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

  const handleSendMessage = async () => {
    if (!messageInput.trim() || isSending) return;

    const content = messageInput.trim();
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

      queryClient.invalidateQueries({ queryKey: ["/api/conversations", selectedConversationId || data.conversationId, "messages"] });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to send message",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
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

  const handleCopyTemplate = (content: string) => {
    navigator.clipboard.writeText(content);
    toast({ title: "Copied", description: "Template copied to clipboard" });
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

  const [conversationsOpen, setConversationsOpen] = useState(true);

  // Mutually exclusive toggle
  const handleConversationsToggle = (isOpen: boolean) => {
    if (isOpen) {
      setTemplatesOpen(false);
    }
    setConversationsOpen(isOpen);
  };

  const handleTemplatesToggle = (isOpen: boolean) => {
    if (isOpen) {
      setConversationsOpen(false);
    }
    setTemplatesOpen(isOpen);
  };

  return (
    <div className="flex h-full overflow-hidden">
      {/* Sidebar */}
      {sidebarOpen && (
        <div className="w-64 border-r flex flex-col min-h-0 h-full">
          <div className="p-3 border-b flex items-center justify-between flex-shrink-0">
            <h3 className="font-semibold text-sm">Sales Assistant</h3>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(false)}
              className="h-7 w-7"
              data-testid="button-close-sidebar"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </div>

          {/* Conversations Collapsible */}
          <Collapsible open={conversationsOpen} onOpenChange={handleConversationsToggle} className={conversationsOpen ? "flex-1 flex flex-col min-h-0" : "flex-shrink-0"}>
              <div className="border-b flex-shrink-0">
                <CollapsibleTrigger className="w-full p-3 flex items-center justify-between hover-elevate active-elevate-2" data-testid="button-toggle-conversations">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4" />
                    <span className="font-semibold text-sm">Conversations</span>
                    <Badge variant="secondary">{conversations.length}</Badge>
                  </div>
                  <ChevronDown
                    className={`h-4 w-4 transition-transform ${conversationsOpen ? "rotate-180" : ""}`}
                  />
                </CollapsibleTrigger>
                <CollapsibleContent className="flex-1 overflow-y-auto min-h-0">
                  <div className="p-2 h-full">
                    <div className="flex gap-1 mb-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => createConversationMutation.mutate()}
                        className="flex-1"
                        data-testid="button-new-chat"
                      >
                        <MessageSquarePlus className="h-4 w-4 mr-1" />
                        New Chat
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setNewProjectDialogOpen(true)}
                        className="flex-1"
                        data-testid="button-new-project"
                      >
                        <FolderPlus className="h-4 w-4 mr-1" />
                        New Project
                      </Button>
                    </div>
                    <div className="space-y-2">
                      {/* Uncategorized */}
                      {conversationsByProject.none && conversationsByProject.none.length > 0 && (
                        <div className="space-y-1">
                          {conversationsByProject.none.map((conv) => (
                            <ConversationContextMenu
                              key={conv.id}
                              conversationId={conv.id}
                              onRename={() => {
                                /* TODO: implement rename */
                              }}
                              onDelete={() => deleteConversationMutation.mutate(conv.id)}
                              onMove={(projectId) => moveConversationMutation.mutate({ conversationId: conv.id, projectId })}
                              projects={projects}
                              currentProjectId={conv.projectId}
                            >
                              <div
                                className={`p-2 rounded-md cursor-pointer hover-elevate ${
                                  selectedConversationId === conv.id ? "bg-accent" : ""
                                }`}
                                onClick={() => setSelectedConversationId(conv.id)}
                                data-testid={`conversation-item-${conv.id}`}
                              >
                                <p className="text-sm font-medium truncate">{conv.title}</p>
                              </div>
                            </ConversationContextMenu>
                          ))}
                        </div>
                      )}

                      {/* Projects */}
                      {projects.map((project) => (
                        <div key={project.id} className="space-y-1">
                          <ProjectContextMenu
                            projectId={project.id}
                            onDelete={() => deleteProjectMutation.mutate(project.id)}
                          >
                            <div className="flex items-center gap-2 px-2 py-1 rounded-md hover-elevate" data-testid={`project-item-${project.id}`}>
                              <Folder className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm font-medium">{project.name}</span>
                            </div>
                          </ProjectContextMenu>
                          {conversationsByProject[project.id]?.map((conv) => (
                            <ConversationContextMenu
                              key={conv.id}
                              conversationId={conv.id}
                              onRename={() => {
                                /* TODO: implement rename */
                              }}
                              onDelete={() => deleteConversationMutation.mutate(conv.id)}
                              onMove={(projectId) => moveConversationMutation.mutate({ conversationId: conv.id, projectId })}
                              projects={projects}
                              currentProjectId={conv.projectId}
                            >
                              <div
                                className={`p-2 rounded-md cursor-pointer ml-4 hover-elevate ${
                                  selectedConversationId === conv.id ? "bg-accent" : ""
                                }`}
                                onClick={() => setSelectedConversationId(conv.id)}
                                data-testid={`conversation-item-${conv.id}`}
                              >
                                <p className="text-sm font-medium truncate">{conv.title}</p>
                              </div>
                            </ConversationContextMenu>
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>

          {/* Template Library */}
          <Collapsible open={templatesOpen} onOpenChange={handleTemplatesToggle} className={templatesOpen ? "flex-1 flex flex-col min-h-0" : "flex-shrink-0"}>
            <div className="border-t flex-shrink-0">
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
              <CollapsibleContent className="flex-1 overflow-y-auto min-h-0">
                <div className="p-2 space-y-3 h-full">
                  {/* Template Builder Button */}
                  <Button
                    onClick={() => setTemplateBuilderOpen(true)}
                    className="w-full"
                    variant="default"
                    data-testid="button-template-builder"
                  >
                    Template Builder
                  </Button>

                  {/* Add Template Form */}
                  <div className="space-y-2 p-3 border rounded-lg bg-muted/50">
                    <h4 className="font-semibold text-xs">Save New Template</h4>
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
                      className="min-h-[60px]"
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
                      size="sm"
                      data-testid="button-save-template"
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Save Template
                    </Button>
                  </div>

                  {/* Search Templates */}
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search templates..."
                      value={templateSearch}
                      onChange={(e) => setTemplateSearch(e.target.value)}
                      className="pl-8"
                      data-testid="input-template-search"
                    />
                  </div>

                  {/* Template List */}
                  <div className="space-y-2">
                    {filteredTemplates.map((template) => (
                      <div key={template.id} className="p-2 border rounded-md hover-elevate cursor-pointer bg-card" onClick={() => handleCopyTemplate(template.content)} data-testid={`template-${template.id}`}>
                        <div className="flex items-start justify-between mb-1">
                          <h5 className="text-xs font-semibold">{template.title}</h5>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-5 w-5"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCopyTemplate(template.content);
                              }}
                              data-testid={`button-copy-template-${template.id}`}
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-5 w-5 text-destructive"
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteTemplateMutation.mutate(template.id);
                              }}
                              disabled={deleteTemplateMutation.isPending}
                              data-testid={`button-delete-template-${template.id}`}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2 mb-1">
                          {template.content}
                        </p>
                        {template.tags && template.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {template.tags.map((tag, idx) => (
                              <Badge key={idx} variant="outline" className="text-xs py-0">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </CollapsibleContent>
            </div>
          </Collapsible>
        </div>
      )}

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-h-0 h-full overflow-hidden">
        {/* Header */}
        <div className="p-3 border-b flex items-center justify-between flex-shrink-0">
          {!sidebarOpen && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(true)}
              className="h-7 w-7"
              data-testid="button-open-sidebar"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          )}
          <div className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            <h2 className="font-semibold">Sales Assistant</h2>
          </div>
        </div>

        {/* Context Indicator - only show when there's actual store context */}
        {selectedConversation?.contextData?.storeName && (
          <div className="px-4 py-2 bg-muted/50 text-sm flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-muted-foreground">
              Context:{" "}
              <span className="font-medium text-foreground">
                {selectedConversation.contextData.storeName}
              </span>
            </span>
          </div>
        )}

        {/* Messages */}
        <ScrollArea className="flex-1 min-h-0 p-4" ref={scrollRef}>
          {!selectedConversationId ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-8">
              <Bot className="h-16 w-16 mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-semibold mb-2">Welcome to Sales Assistant</h3>
              <p className="text-muted-foreground mb-4">
                Create a new chat to get started
              </p>
              <Button onClick={() => createConversationMutation.mutate()} data-testid="button-start-chat">
                <MessageSquarePlus className="h-4 w-4 mr-2" />
                Start New Chat
              </Button>
            </div>
          ) : messagesLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((msg) => {
                const emailData = msg.role === "assistant" ? parseEmailFromMessage(msg.content) : null;
                
                return (
                  <div
                    key={msg.id}
                    className={`flex gap-3 ${msg.role === "user" ? "justify-end" : ""}`}
                  >
                    {msg.role === "assistant" && (
                      <div className="flex-shrink-0">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <Bot className="h-4 w-4 text-primary" />
                        </div>
                      </div>
                    )}
                    <div
                      className={`max-w-[80%] ${
                        msg.role === "user" ? "w-full" : ""
                      }`}
                    >
                      <div
                        className={`rounded-lg p-3 ${
                          msg.role === "user"
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted"
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                      </div>
                      {emailData && (
                        <EmailPreview
                          to={emailData.to}
                          subject={emailData.subject}
                          body={emailData.body}
                        />
                      )}
                    </div>
                    {msg.role === "user" && (
                      <div className="flex-shrink-0">
                        <div className="h-8 w-8 rounded-full bg-accent flex items-center justify-center">
                          <UserIcon className="h-4 w-4" />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>

        {/* Input */}
        <div className="p-4 border-t flex-shrink-0">
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

      </div>

      {/* New Project Dialog */}
      <Dialog open={newProjectDialogOpen} onOpenChange={setNewProjectDialogOpen}>
        <DialogContent data-testid="dialog-new-project">
          <DialogHeader>
            <DialogTitle>New Project</DialogTitle>
            <DialogDescription>Create a new folder to organize your conversations</DialogDescription>
          </DialogHeader>
          <Input
            value={newProjectName}
            onChange={(e) => setNewProjectName(e.target.value)}
            placeholder="Project name..."
            data-testid="input-project-name"
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

      {/* Template Builder Dialog */}
      <Dialog open={templateBuilderOpen} onOpenChange={setTemplateBuilderOpen}>
        <DialogContent className="max-w-full w-screen h-screen max-h-screen m-0 rounded-none p-0 flex flex-col" data-testid="dialog-template-builder">
          <DialogHeader className="px-6 py-4 border-b">
            <DialogTitle>Template Builder</DialogTitle>
          </DialogHeader>
          
          <Tabs value={templateBuilderTab} onValueChange={setTemplateBuilderTab} className="flex-1 flex flex-col min-h-0">
            <TabsList className="mx-6 mt-4 w-fit">
              <TabsTrigger value="build" data-testid="tab-build">BUILD</TabsTrigger>
              <TabsTrigger value="browse" data-testid="tab-browse">BROWSE</TabsTrigger>
            </TabsList>

            {/* BUILD Tab */}
            <TabsContent value="build" className="flex-1 flex flex-col min-h-0 px-6 pb-6">
              <ScrollArea className="flex-1">
                <div className="space-y-4 pr-4">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold">Title</label>
                    <Input
                      placeholder="Template name..."
                      value={builderTitle}
                      onChange={(e) => setBuilderTitle(e.target.value)}
                      data-testid="input-builder-title"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-semibold">Content</label>
                      <Button
                        variant="outline"
                        size="sm"
                        data-testid="button-insert-variable"
                      >
                        Insert Variable
                      </Button>
                    </div>
                    <Textarea
                      placeholder="Template content with {{variables}}..."
                      value={builderContent}
                      onChange={(e) => setBuilderContent(e.target.value)}
                      className="min-h-[300px] font-mono"
                      data-testid="textarea-builder-content"
                    />
                    <p className="text-xs text-muted-foreground">
                      Use variables like: {`{{storeName}}, {{pocName}}, {{pocEmail}}`}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold">Tags</label>
                    <Input
                      placeholder="email, follow-up, introduction..."
                      value={builderTags}
                      onChange={(e) => setBuilderTags(e.target.value)}
                      data-testid="input-builder-tags"
                    />
                    <p className="text-xs text-muted-foreground">Comma-separated tags</p>
                  </div>
                </div>
              </ScrollArea>

              <div className="flex gap-2 mt-4 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => {
                    setBuilderTitle("");
                    setBuilderContent("");
                    setBuilderTags("");
                    setEditingTemplateId(null);
                    setTemplateBuilderOpen(false);
                  }}
                  data-testid="button-cancel-builder"
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1"
                  disabled={!builderTitle.trim() || !builderContent.trim()}
                  data-testid="button-save-template-builder"
                >
                  {editingTemplateId ? "Update Template" : "Save Template"}
                </Button>
              </div>
            </TabsContent>

            {/* BROWSE Tab */}
            <TabsContent value="browse" className="flex-1 flex flex-col min-h-0 px-6 pb-6">
              <div className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search templates..."
                    value={templateSearch}
                    onChange={(e) => setTemplateSearch(e.target.value)}
                    className="pl-8"
                    data-testid="input-search-templates-builder"
                  />
                </div>

                <ScrollArea className="flex-1">
                  <div className="space-y-2 pr-4">
                    {templates
                      .filter(
                        (template) =>
                          template.title.toLowerCase().includes(templateSearch.toLowerCase()) ||
                          template.content.toLowerCase().includes(templateSearch.toLowerCase()) ||
                          template.tags?.some((tag) =>
                            tag.toLowerCase().includes(templateSearch.toLowerCase())
                          )
                      )
                      .map((template) => (
                        <div
                          key={template.id}
                          className="p-4 border rounded-lg hover-elevate bg-card"
                          data-testid={`template-card-${template.id}`}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <h4 className="font-semibold">{template.title}</h4>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                data-testid={`button-use-template-${template.id}`}
                              >
                                Use
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                data-testid={`button-edit-template-${template.id}`}
                              >
                                Edit
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-destructive"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteTemplateMutation.mutate(template.id);
                                }}
                                disabled={deleteTemplateMutation.isPending}
                                data-testid={`button-delete-template-builder-${template.id}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-3 mb-2 font-mono">
                            {template.content}
                          </p>
                          {template.tags && template.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {template.tags.map((tag, idx) => (
                                <Badge key={idx} variant="outline" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    {templates.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        <p>No templates yet</p>
                        <p className="text-sm">Switch to BUILD tab to create your first template</p>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  );
}
