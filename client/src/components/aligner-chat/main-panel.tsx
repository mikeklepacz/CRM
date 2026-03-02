import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Send, Loader2, User as UserIcon, Lightbulb, ChevronLeft, FileCheck } from "lucide-react";
import type { Conversation } from "@shared/schema";
import type { Message } from "./types";

interface AlignerMainPanelProps {
  sidebarOpen: boolean;
  selectedConversationId: string | null;
  conversations: Conversation[];
  messages: Message[];
  messagesLoading: boolean;
  sendPending: boolean;
  agreePending: boolean;
  createPending: boolean;
  message: string;
  messagesEndRef: React.RefObject<HTMLDivElement>;
  hasJSONProposals: (content: string) => boolean;
  renderFormattedText: (content: string) => JSX.Element[];
  onOpenSidebar: () => void;
  onMessageChange: (value: string) => void;
  onMessageKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  onSendMessage: () => void;
  onAgreeAndCreateProposals: () => void;
  onCreateProposals: () => void;
}

export function AlignerMainPanel({
  sidebarOpen,
  selectedConversationId,
  conversations,
  messages,
  messagesLoading,
  sendPending,
  agreePending,
  createPending,
  message,
  messagesEndRef,
  hasJSONProposals,
  renderFormattedText,
  onOpenSidebar,
  onMessageChange,
  onMessageKeyDown,
  onSendMessage,
  onAgreeAndCreateProposals,
  onCreateProposals,
}: AlignerMainPanelProps) {
  return (
    <div className="flex-1 flex flex-col min-w-0">
      <div className="p-4 border-b flex items-center justify-between">
        {!sidebarOpen && (
          <Button variant="ghost" size="icon" onClick={onOpenSidebar} className="h-8 w-8 mr-2" data-testid="button-open-sidebar">
            <ChevronLeft className="h-4 w-4 rotate-180" />
          </Button>
        )}
        <div className="flex items-center gap-2 flex-1">
          <Lightbulb className="h-5 w-5 text-amber-500" />
          <h3 className="font-semibold">
            {selectedConversationId ? conversations.find((c) => c.id === selectedConversationId)?.title || "Aligner Chat" : "New Conversation"}
          </h3>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4 max-w-4xl mx-auto">
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
                <div className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`} data-testid={`aligner-message-${msg.role}-${index}`}>
                  {msg.role === "assistant" && (
                    <div className="flex-shrink-0">
                      <div className="h-8 w-8 rounded-full bg-amber-500/10 flex items-center justify-center">
                        <Lightbulb className="h-4 w-4 text-amber-500" />
                      </div>
                    </div>
                  )}
                  <div className={`rounded-lg px-4 py-2 max-w-[80%] ${msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                    <div className="text-sm whitespace-pre-wrap">{msg.role === "assistant" ? renderFormattedText(msg.content) : msg.content}</div>
                  </div>
                  {msg.role === "user" && (
                    <div className="flex-shrink-0">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <UserIcon className="h-4 w-4 text-primary" />
                      </div>
                    </div>
                  )}
                </div>

                {msg.role === "assistant" && selectedConversationId && index === messages.length - 1 && (
                  <div className="flex gap-2 justify-start mt-2 ml-11">
                    {!hasJSONProposals(msg.content) && (
                      <Button
                        onClick={onAgreeAndCreateProposals}
                        disabled={agreePending}
                        size="sm"
                        variant="default"
                        className="gap-2"
                        data-testid="button-agree-create-proposals"
                      >
                        {agreePending ? (
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

                    {hasJSONProposals(msg.content) && (
                      <Button
                        onClick={onCreateProposals}
                        disabled={createPending}
                        size="sm"
                        variant="outline"
                        className="gap-2"
                        data-testid="button-create-proposals-from-chat"
                      >
                        {createPending ? (
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

          {sendPending && (
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

          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      <div className="p-4 border-t">
        <div className="max-w-4xl mx-auto">
          <div className="flex gap-2">
            <Textarea
              value={message}
              onChange={(e) => onMessageChange(e.target.value)}
              onKeyDown={onMessageKeyDown}
              placeholder="Ask the Aligner about calls, insights, or KB improvements..."
              className="flex-1 min-h-[60px] max-h-[200px]"
              disabled={sendPending}
              data-testid="input-aligner-message"
            />
            <Button onClick={onSendMessage} disabled={!message.trim() || sendPending} size="icon" className="h-[60px] w-[60px]" data-testid="button-send-aligner-message">
              {sendPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">The Aligner can analyze calls, discuss improvements, and create KB proposals</p>
        </div>
      </div>
    </div>
  );
}
