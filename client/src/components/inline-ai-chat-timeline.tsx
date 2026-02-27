import type { RefObject } from "react";
import { Bot, Copy, FileText, Loader2, User as UserIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { InlineAiChatEmptyState } from "@/components/inline-ai-chat-empty-state";
import { InlineAiScriptItem } from "@/components/inline-ai-script-item";
import { EmailPreview } from "@/components/email-preview";
import {
  parseEmailFromMessage,
  renderFormattedText,
  replaceSimpleTemplateVariables,
} from "@/components/inline-ai-chat-utils";
import type { TimelineItem } from "@/components/inline-ai-chat-enhanced.types";

type InlineAiChatTimelineProps = {
  isSending: boolean;
  mergedTimeline: TimelineItem[];
  messagesLoading: boolean;
  scrollBottomRef: RefObject<HTMLDivElement>;
  scrollRef: RefObject<HTMLDivElement>;
  selectedConversationId: string | null;
  storeContext: any;
  user: any;
  onCopyMessageToClipboard: (content: string) => void;
  onMakeTemplateFromMessage: (content: string) => void;
  onRetryMessage: (messageId: string, content: string) => void;
  onStartChat: () => void;
};

export function InlineAiChatTimeline({
  isSending,
  mergedTimeline,
  messagesLoading,
  scrollBottomRef,
  scrollRef,
  selectedConversationId,
  storeContext,
  user,
  onCopyMessageToClipboard,
  onMakeTemplateFromMessage,
  onRetryMessage,
  onStartChat,
}: InlineAiChatTimelineProps) {
  return (
    <ScrollArea className="flex-1 min-h-0 p-4" ref={scrollRef}>
      {!selectedConversationId && mergedTimeline.length === 0 ? (
        <InlineAiChatEmptyState onStartChat={onStartChat} />
      ) : messagesLoading && selectedConversationId ? (
        <div className="flex items-center justify-center h-full">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : (
        <div className="space-y-4">
          {mergedTimeline.map((item) => {
            if (item.type === "script") {
              return (
                <InlineAiScriptItem
                  key={item.id}
                  id={item.id}
                  title={item.title}
                  content={item.content}
                />
              );
            }

            const messageItem = item as Extract<TimelineItem, { type: "message" }>;
            const emailData = messageItem.role === "assistant" ? parseEmailFromMessage(messageItem.content) : null;
            const processedEmailData = emailData ? {
              to: replaceSimpleTemplateVariables(emailData.to, storeContext, user),
              subject: replaceSimpleTemplateVariables(emailData.subject, storeContext, user),
              body: replaceSimpleTemplateVariables(emailData.body, storeContext, user),
            } : null;

            return (
              <div
                key={messageItem.id}
                className={`flex gap-3 ${messageItem.role === "user" ? "justify-end" : ""}`}
                data-testid={`message-${messageItem.id}`}
              >
                {messageItem.role === "assistant" && (
                  <div className="flex-shrink-0">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <Bot className="h-4 w-4 text-primary" />
                    </div>
                  </div>
                )}
                <div className={`max-w-[80%] ${messageItem.role === "user" ? "w-full" : ""}`}>
                  {messageItem.role === "assistant" ? (
                    <ContextMenu>
                      <ContextMenuTrigger>
                        <div className="rounded-lg p-3 bg-muted">
                          <div className="text-sm leading-relaxed">
                            {renderFormattedText(messageItem.content)}
                          </div>
                        </div>
                      </ContextMenuTrigger>
                      <ContextMenuContent>
                        <ContextMenuItem
                          onClick={() => onCopyMessageToClipboard(messageItem.content)}
                          data-testid="context-menu-copy"
                        >
                          <Copy className="mr-2 h-4 w-4" />
                          Copy
                        </ContextMenuItem>
                        <ContextMenuItem
                          onClick={() => onMakeTemplateFromMessage(messageItem.content)}
                          data-testid="context-menu-make-template"
                        >
                          <FileText className="mr-2 h-4 w-4" />
                          Make Template
                        </ContextMenuItem>
                      </ContextMenuContent>
                    </ContextMenu>
                  ) : (
                    <div className={`rounded-lg p-3 ${
                      messageItem.status === "error"
                        ? "bg-destructive/20 border border-destructive"
                        : messageItem.status === "pending"
                        ? "bg-primary/70 text-primary-foreground"
                        : "bg-primary text-primary-foreground"
                    }`}>
                      <p className="text-sm whitespace-pre-wrap">{messageItem.content}</p>
                      {messageItem.status === "error" && (
                        <div className="mt-2 flex items-center gap-2">
                          <p className="text-xs text-destructive">{messageItem.error}</p>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onRetryMessage(messageItem.id, messageItem.content)}
                            data-testid={`button-retry-${messageItem.id}`}
                          >
                            Retry
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                  {processedEmailData && (
                    <EmailPreview
                      to={processedEmailData.to}
                      subject={processedEmailData.subject}
                      body={processedEmailData.body}
                    />
                  )}
                </div>
                {messageItem.role === "user" && (
                  <div className="flex-shrink-0">
                    <div className="h-8 w-8 rounded-full bg-accent flex items-center justify-center">
                      <UserIcon className="h-4 w-4" />
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {isSending && (
            <div className="flex gap-3">
              <div className="flex-shrink-0">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Bot className="h-4 w-4 text-primary" />
                </div>
              </div>
              <div className="rounded-lg p-3 bg-muted">
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm text-muted-foreground">AI is thinking...</span>
                </div>
              </div>
            </div>
          )}

          <div ref={scrollBottomRef} />
        </div>
      )}
    </ScrollArea>
  );
}
