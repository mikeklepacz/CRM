import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Send, Loader2, Trash2, Bot, User as UserIcon, AlertCircle, Lightbulb } from "lucide-react";

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

export function AlignerChat({ className }: AlignerChatProps) {
  const { toast } = useToast();
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Check if API key is configured
  const { data: settings, isLoading: settingsLoading } = useQuery({
    queryKey: ['/api/openai/settings'],
  });

  // Load chat history
  const { data: history = [], isLoading: historyLoading } = useQuery({
    queryKey: ['/api/aligner/chat/history'],
  });

  useEffect(() => {
    if (history && history.length > 0) {
      const formattedHistory = history.map((msg: any) => ({
        role: msg.role,
        content: msg.content
      }));
      setMessages(formattedHistory);
    }
  }, [history]);

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
        message: content 
      });
    },
    onSuccess: (data) => {
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: data.message }
      ]);
      queryClient.invalidateQueries({ queryKey: ['/api/aligner/chat/history'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to get Aligner response",
        variant: "destructive",
      });
    },
  });

  // Clear history mutation
  const clearHistoryMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("DELETE", "/api/aligner/chat/history");
    },
    onSuccess: () => {
      setMessages([]);
      queryClient.invalidateQueries({ queryKey: ['/api/aligner/chat/history'] });
      toast({
        title: "Success",
        description: "Chat history cleared",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to clear history",
        variant: "destructive",
      });
    },
  });

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

  if (settingsLoading || historyLoading) {
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
    <div className={`flex flex-col h-full ${className || ''}`}>
      {/* Chat Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <Lightbulb className="h-5 w-5 text-amber-500" />
          <h3 className="font-semibold">Aligner Chat</h3>
        </div>
        {messages.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              if (confirm('Clear all chat history?')) {
                clearHistoryMutation.mutate();
              }
            }}
            disabled={clearHistoryMutation.isPending}
            data-testid="button-clear-aligner-history"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="space-y-4">
          {messages.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Lightbulb className="h-12 w-12 mx-auto mb-4 opacity-50 text-amber-500" />
              <p className="font-medium mb-2">Talk to the Aligner</p>
              <p className="text-sm">Ask about call patterns, discuss KB improvements, or request specific changes to sales scripts.</p>
            </div>
          ) : (
            messages.map((msg, index) => (
              <div
                key={index}
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
  );
}
