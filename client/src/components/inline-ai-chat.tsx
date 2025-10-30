import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface InlineAIChatProps {
  storeContext?: {
    name: string;
    address?: string;
    phone?: string;
    email?: string;
    notes?: string;
    status?: string;
  };
}

// Helper function to clean and format AI output
function formatAIContent(content: string): string {
  // Remove source citations like [6:17*source] or [6:0*source]
  let cleaned = content.replace(/\s*\[[\d:]+\*source\]\s*/g, '');
  
  // Remove any remaining bracketed references at the end
  cleaned = cleaned.replace(/\s*\[\d+:\d+\]\s*$/g, '');
  
  // Clean up any extra whitespace
  cleaned = cleaned.trim();
  
  return cleaned;
}

// Helper function to render formatted text with basic markdown support
function renderFormattedText(content: string): JSX.Element[] {
  const formattedContent = formatAIContent(content);
  const lines = formattedContent.split('\n');
  const result: JSX.Element[] = [];
  
  lines.forEach((line, lineIndex) => {
    const parts: (string | JSX.Element)[] = [];
    let lastIndex = 0;
    
    // Find all **text** patterns for bold
    const boldRegex = /\*\*(.+?)\*\*/g;
    let match;
    
    while ((match = boldRegex.exec(line)) !== null) {
      // Add text before the match
      if (match.index > lastIndex) {
        parts.push(line.substring(lastIndex, match.index));
      }
      // Add bold text
      parts.push(<strong key={`bold-${lineIndex}-${match.index}`}>{match[1]}</strong>);
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

export function InlineAIChat({ storeContext }: InlineAIChatProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: storeContext 
        ? `I can help you with "${storeContext.name}". Ask me anything about sales techniques, product information, or how to handle objections.`
        : "I'm your sales assistant. How can I help you today?"
    }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput("");
    
    // Add user message
    setMessages(prev => [...prev, { role: "user", content: userMessage }]);
    setIsLoading(true);

    try {
      // Build context message
      let contextPrompt = userMessage;
      if (storeContext) {
        const contextInfo = [
          `Store: ${storeContext.name}`,
          storeContext.address && `Address: ${storeContext.address}`,
          storeContext.phone && `Phone: ${storeContext.phone}`,
          storeContext.email && `Email: ${storeContext.email}`,
          storeContext.status && `Status: ${storeContext.status}`,
          storeContext.notes && `Notes: ${storeContext.notes}`,
        ].filter(Boolean).join("\n");
        
        contextPrompt = `Context about the current store:\n${contextInfo}\n\nUser question: ${userMessage}`;
      }

      // TODO: Replace with actual API call to OpenAI
      // For now, show a placeholder response
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const assistantMessage = `I understand you're asking about ${storeContext?.name || "this"}. This is a placeholder response. The actual AI assistant integration will connect to OpenAI's API with your configured API key.`;
      
      setMessages(prev => [...prev, { role: "assistant", content: assistantMessage }]);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to get AI response. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Messages Area */}
      <ScrollArea className="flex-1 pr-4 mb-4">
        <div ref={scrollRef} className="space-y-4">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] rounded-lg px-4 py-2 ${
                  message.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted"
                }`}
              >
                {message.role === "assistant" ? (
                  <div className="text-sm leading-relaxed">
                    {renderFormattedText(message.content)}
                  </div>
                ) : (
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                )}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-muted rounded-lg px-4 py-2">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input Area */}
      <div className="flex gap-2">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask about sales techniques, objections, or product info..."
          className="min-h-[60px] resize-none"
          disabled={isLoading}
          data-testid="input-ai-chat"
        />
        <Button
          onClick={handleSend}
          disabled={!input.trim() || isLoading}
          size="icon"
          className="shrink-0"
          data-testid="button-send-message"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  );
}
