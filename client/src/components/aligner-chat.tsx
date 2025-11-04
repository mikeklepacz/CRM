import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Send, Loader2, Trash2, User as UserIcon, AlertCircle, Lightbulb, MessageSquarePlus, ChevronLeft, FileCheck } from "lucide-react";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import type { Conversation } from "@shared/schema";

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface AlignerChatProps {
  className?: string;
}

// Helper function to clean and format AI output
function formatAIContent(content: string): string {
  // Remove ALL source citations - match any pattern like [number:number{ANY_CHAR}source]
  let cleaned = content.replace(/\s*\[\d+:\d+[^\]]*source\]\s*/gi, '');
  
  // Remove any remaining bracketed number references
  cleaned = cleaned.replace(/\s*\[\d+:\d+\]\s*/g, '');
  
  // Clean up any extra whitespace
  cleaned = cleaned.trim();
  
  return cleaned;
}

// Helper function to check if message contains JSON proposals
function hasJSONProposals(content: string): boolean {
  const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || content.match(/```\s*(\{[\s\S]*?\})\s*```/);
  if (!jsonMatch) return false;
  
  try {
    const parsed = JSON.parse(jsonMatch[1]);
    return parsed.edits && Array.isArray(parsed.edits) && parsed.edits.length > 0;
  } catch {
    return false;
  }
}

// Helper function to render formatted text with comprehensive markdown support
function renderFormattedText(content: string): JSX.Element[] {
  const formattedContent = formatAIContent(content);
  const lines = formattedContent.split('\n');
  const result: JSX.Element[] = [];
  
  lines.forEach((line, lineIndex) => {
    // Check for headers first
    const h3Match = line.match(/^###\s+(.+)$/);
    const h2Match = line.match(/^##\s+(.+)$/);
    const h1Match = line.match(/^#\s+(.+)$/);
    
    if (h3Match) {
      result.push(<h3 key={`line-${lineIndex}`} className="text-base font-semibold mt-3 mb-2">{h3Match[1]}</h3>);
      return;
    }
    if (h2Match) {
      result.push(<h2 key={`line-${lineIndex}`} className="text-lg font-semibold mt-4 mb-2">{h2Match[1]}</h2>);
      return;
    }
    if (h1Match) {
      result.push(<h1 key={`line-${lineIndex}`} className="text-xl font-bold mt-4 mb-3">{h1Match[1]}</h1>);
      return;
    }
    
    // Process inline markdown (bold, italic, code)
    const parts: (string | JSX.Element)[] = [];
    let partIndex = 0;
    
    // Process bold **text**, italic *text*, and inline code `text`
    const inlineRegex = /(\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`)/g;
    let lastIndex = 0;
    let match;
    
    while ((match = inlineRegex.exec(line)) !== null) {
      // Add text before the match
      if (match.index > lastIndex) {
        parts.push(line.substring(lastIndex, match.index));
      }
      
      // Determine what type of match this is
      if (match[0].startsWith('**')) {
        // Bold
        parts.push(<strong key={`part-${lineIndex}-${partIndex++}`}>{match[2]}</strong>);
      } else if (match[0].startsWith('`')) {
        // Inline code
        parts.push(<code key={`part-${lineIndex}-${partIndex++}`} className="bg-muted px-1 rounded text-xs">{match[4]}</code>);
      } else if (match[0].startsWith('*')) {
        // Italic
        parts.push(<em key={`part-${lineIndex}-${partIndex++}`}>{match[3]}</em>);
      }
      
      lastIndex = match.index + match[0].length;
    }
    
    // Add remaining text
    if (lastIndex < line.length) {
      parts.push(line.substring(lastIndex));
    }
    
    // If no parts were added, add the whole line
    if (parts.length === 0) {
      parts.push(line);
    }
    
    result.push(
      <span key={`line-${lineIndex}`}>
        {parts}
        {lineIndex < lines.length - 1 && <br />}
      </span>
    );
  });
  
  return result;
}

const STORAGE_KEY = 'aligner-selected-conversation';

export function AlignerChat({ className }: AlignerChatProps) {
  const { toast } = useToast();
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(() => {
    // Restore from localStorage on mount
    try {
      return localStorage.getItem(STORAGE_KEY);
    } catch {
      return null;
    }
  });
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Check if API key is configured
  const { data: settings, isLoading: settingsLoading } = useQuery({
    queryKey: ['/api/openai/settings'],
  });

  // Load all conversations
  const { data: conversations = [], isLoading: conversationsLoading } = useQuery<Conversation[]>({
    queryKey: ['/api/aligner/chat/history'],
  });

  // Load messages for selected conversation
  const { data: conversationMessages = [], isLoading: messagesLoading } = useQuery({
    queryKey: ['/api/aligner/conversations', selectedConversationId, 'messages'],
    enabled: !!selectedConversationId,
  });

  // Persist selected conversation to localStorage
  useEffect(() => {
    if (selectedConversationId) {
      try {
        localStorage.setItem(STORAGE_KEY, selectedConversationId);
      } catch {
        // Ignore localStorage errors
      }
    }
  }, [selectedConversationId]);

  // Set messages when conversation messages load
  useEffect(() => {
    if (conversationMessages && conversationMessages.length > 0) {
      const formattedMessages = conversationMessages.map((msg: any) => ({
        role: msg.role,
        content: msg.content
      }));
      setMessages(formattedMessages);
    } else if (selectedConversationId) {
      setMessages([]);
    }
  }, [conversationMessages, selectedConversationId]);

  // Auto-select most recent conversation if none selected or if selected one no longer exists
  useEffect(() => {
    if (conversations.length > 0) {
      // Check if currently selected conversation still exists
      const selectedExists = selectedConversationId && conversations.some(c => c.id === selectedConversationId);
      
      if (!selectedExists) {
        // Select most recent conversation
        setSelectedConversationId(conversations[0].id);
      }
    } else if (selectedConversationId) {
      // No conversations exist, clear selection
      setSelectedConversationId(null);
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch {
        // Ignore localStorage errors
      }
    }
  }, [conversations, selectedConversationId]);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      return await apiRequest("POST", "/api/aligner/chat", { 
        message: content,
        conversationId: selectedConversationId
      });
    },
    onSuccess: (data) => {
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: data.message }
      ]);
      
      // Update selected conversation if a new one was created
      if (data.conversationId && data.conversationId !== selectedConversationId) {
        setSelectedConversationId(data.conversationId);
      }
      
      queryClient.invalidateQueries({ queryKey: ['/api/aligner/chat/history'] });
      queryClient.invalidateQueries({ queryKey: ['/api/aligner/conversations', selectedConversationId || data.conversationId, 'messages'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to get Aligner response",
        variant: "destructive",
      });
    },
  });

  // Delete conversation mutation
  const deleteConversationMutation = useMutation({
    mutationFn: async (conversationId: string) => {
      return await apiRequest("DELETE", `/api/conversations/${conversationId}`);
    },
    onSuccess: (_, deletedId) => {
      if (deletedId === selectedConversationId) {
        setSelectedConversationId(null);
        setMessages([]);
      }
      queryClient.invalidateQueries({ queryKey: ['/api/aligner/chat/history'] });
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

  // Agree and create proposals in one action
  const agreeAndCreateProposalsMutation = useMutation({
    mutationFn: async (conversationId: string) => {
      return await apiRequest("POST", "/api/aligner/agree-and-create-proposals", { conversationId });
    },
    onSuccess: (data) => {
      toast({
        title: "Success",
        description: data.message || `Created ${data.proposalsCreated} proposal(s)`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/kb/proposals'] });
      queryClient.invalidateQueries({ queryKey: ['/api/aligner/chat/history'] });
      queryClient.invalidateQueries({ queryKey: ['/api/aligner/conversations', selectedConversationId, 'messages'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create proposals",
        variant: "destructive",
      });
    },
  });

  // Create proposals from chat mutation (for when JSON already exists)
  const createProposalsMutation = useMutation({
    mutationFn: async (conversationId: string) => {
      return await apiRequest("POST", "/api/aligner/create-proposals-from-chat", { conversationId });
    },
    onSuccess: (data) => {
      toast({
        title: "Success",
        description: `Created ${data.proposalsCreated} proposal(s). Review them in the Proposals tab.`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/kb/proposals'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create proposals from chat",
        variant: "destructive",
      });
    },
  });

  // New conversation handler
  const handleNewConversation = () => {
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
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setMessage("");
    sendMessageMutation.mutate(userMessage);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
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
            <p className="text-sm text-muted-foreground">
              Configure the OpenAI API key in the Admin Dashboard to use the Aligner
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex h-full overflow-hidden ${className || ''}`}>
      {/* Sidebar */}
      {sidebarOpen && (
        <div className="w-64 border-r flex flex-col">
          <div className="p-3 border-b flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-amber-500" />
              <h3 className="font-semibold text-sm">Aligner</h3>
            </div>
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

          <div className="p-2 border-b">
            <Button
              variant="outline"
              size="sm"
              onClick={handleNewConversation}
              className="w-full"
              data-testid="button-new-aligner-chat"
            >
              <MessageSquarePlus className="h-4 w-4 mr-2" />
              New Conversation
            </Button>
          </div>

          <ScrollArea className="flex-1">
            <div className="p-2 space-y-1">
              {conversationsLoading ? (
                <div className="text-center py-4">
                  <Loader2 className="h-4 w-4 animate-spin mx-auto text-muted-foreground" />
                </div>
              ) : conversations.length === 0 ? (
                <div className="text-center py-8 px-2">
                  <p className="text-sm text-muted-foreground">No conversations yet</p>
                </div>
              ) : (
                conversations.map((conv) => (
                  <ContextMenu key={conv.id}>
                    <ContextMenuTrigger asChild data-testid={`trigger-aligner-conversation-menu-${conv.id}`}>
                      <div
                        className={`p-2 rounded-md cursor-pointer hover-elevate ${
                          selectedConversationId === conv.id ? "bg-accent" : ""
                        }`}
                        onClick={() => setSelectedConversationId(conv.id)}
                        data-testid={`aligner-conversation-${conv.id}`}
                      >
                        <p className="text-sm font-medium truncate">{conv.title}</p>
                      </div>
                    </ContextMenuTrigger>
                    <ContextMenuContent className="w-48">
                      <ContextMenuItem
                        onClick={() => {
                          if (confirm('Delete this conversation?')) {
                            deleteConversationMutation.mutate(conv.id);
                          }
                        }}
                        className="text-destructive focus:text-destructive"
                        data-testid={`menuitem-delete-conversation-${conv.id}`}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </ContextMenuItem>
                    </ContextMenuContent>
                  </ContextMenu>
                ))
              )}
            </div>
          </ScrollArea>
        </div>
      )}

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="p-4 border-b flex items-center justify-between">
          {!sidebarOpen && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(true)}
              className="h-8 w-8 mr-2"
              data-testid="button-open-sidebar"
            >
              <ChevronLeft className="h-4 w-4 rotate-180" />
            </Button>
          )}
          <div className="flex items-center gap-2 flex-1">
            <Lightbulb className="h-5 w-5 text-amber-500" />
            <h3 className="font-semibold">
              {selectedConversationId 
                ? conversations.find(c => c.id === selectedConversationId)?.title || 'Aligner Chat'
                : 'New Conversation'}
            </h3>
          </div>
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1 p-4" ref={scrollRef}>
          <div className="space-y-4 max-w-4xl mx-auto">
            {messages.length === 0 && !messagesLoading ? (
              <div className="text-center py-12 text-muted-foreground">
                <Lightbulb className="h-12 w-12 mx-auto mb-4 opacity-50 text-amber-500" />
                <p className="font-medium mb-2">Talk to the Aligner</p>
                <p className="text-sm">Ask about call patterns, discuss KB improvements, or request specific changes to sales scripts.</p>
              </div>
            ) : messagesLoading ? (
              <div className="text-center py-12">
                <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
                <p className="text-muted-foreground mt-4">Loading messages...</p>
              </div>
            ) : (
              messages.map((msg, index) => (
                <div key={index}>
                  <div
                    className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    data-testid={`aligner-message-${msg.role}-${index}`}
                  >
                    {msg.role === 'assistant' && (
                      <div className="flex-shrink-0">
                        <div className="h-8 w-8 rounded-full bg-amber-500/10 flex items-center justify-center">
                          <Lightbulb className="h-4 w-4 text-amber-500" />
                        </div>
                      </div>
                    )}
                    <div
                      className={`rounded-lg px-4 py-2 max-w-[80%] ${
                        msg.role === 'user'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      }`}
                    >
                      <div className="text-sm whitespace-pre-wrap">
                        {msg.role === 'assistant' ? renderFormattedText(msg.content) : msg.content}
                      </div>
                    </div>
                    {msg.role === 'user' && (
                      <div className="flex-shrink-0">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <UserIcon className="h-4 w-4 text-primary" />
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Show action buttons after assistant messages */}
                  {msg.role === 'assistant' && selectedConversationId && index === messages.length - 1 && (
                    <div className="flex gap-2 justify-start mt-2 ml-11">
                      {/* Agree button - creates proposals directly without showing JSON */}
                      {!hasJSONProposals(msg.content) && (
                        <Button
                          onClick={() => agreeAndCreateProposalsMutation.mutate(selectedConversationId)}
                          disabled={agreeAndCreateProposalsMutation.isPending}
                          size="sm"
                          variant="default"
                          className="gap-2"
                          data-testid="button-agree-create-proposals"
                        >
                          {agreeAndCreateProposalsMutation.isPending ? (
                            <>
                              <Loader2 className="h-3 w-3 animate-spin" />
                              Creating Proposals...
                            </>
                          ) : (
                            <>
                              <FileCheck className="h-3 w-3" />
                              Agree & Create Proposals
                            </>
                          )}
                        </Button>
                      )}
                      
                      {/* Create proposals button - appears after JSON output (fallback for manual JSON creation) */}
                      {hasJSONProposals(msg.content) && (
                        <Button
                          onClick={() => createProposalsMutation.mutate(selectedConversationId)}
                          disabled={createProposalsMutation.isPending}
                          size="sm"
                          variant="outline"
                          className="gap-2"
                          data-testid="button-create-proposals-from-chat"
                        >
                          {createProposalsMutation.isPending ? (
                            <>
                              <Loader2 className="h-3 w-3 animate-spin" />
                              Creating Proposals...
                            </>
                          ) : (
                            <>
                              <FileCheck className="h-3 w-3" />
                              Create Proposals
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
            {sendMessageMutation.isPending && (
              <div className="flex gap-3 justify-start">
                <div className="flex-shrink-0">
                  <div className="h-8 w-8 rounded-full bg-amber-500/10 flex items-center justify-center">
                    <Lightbulb className="h-4 w-4 text-amber-500" />
                  </div>
                </div>
                <div className="rounded-lg px-4 py-2 bg-muted">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Thinking...
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Input */}
        <div className="p-4 border-t">
          <div className="max-w-4xl mx-auto">
            <div className="flex gap-2">
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Ask the Aligner about calls, insights, or KB improvements..."
                className="flex-1 min-h-[60px] max-h-[200px]"
                disabled={sendMessageMutation.isPending}
                data-testid="input-aligner-message"
              />
              <Button
                onClick={handleSendMessage}
                disabled={!message.trim() || sendMessageMutation.isPending}
                size="icon"
                className="h-[60px] w-[60px]"
                data-testid="button-send-aligner-message"
              >
                {sendMessageMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              The Aligner can analyze calls, discuss improvements, and create KB proposals
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
