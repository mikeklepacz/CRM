import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Trash2, Lightbulb, MessageSquarePlus, ChevronLeft } from "lucide-react";
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from "@/components/ui/context-menu";
import type { Conversation } from "@shared/schema";

interface AlignerSidebarPanelProps {
  sidebarOpen: boolean;
  conversationsLoading: boolean;
  conversations: Conversation[];
  selectedConversationId: string | null;
  onCloseSidebar: () => void;
  onNewConversation: () => void;
  onSelectConversation: (conversationId: string) => void;
  onDeleteConversation: (conversationId: string) => void;
}

export function AlignerSidebarPanel({
  sidebarOpen,
  conversationsLoading,
  conversations,
  selectedConversationId,
  onCloseSidebar,
  onNewConversation,
  onSelectConversation,
  onDeleteConversation,
}: AlignerSidebarPanelProps) {
  if (!sidebarOpen) return null;

  return (
    <div className="w-64 border-r flex flex-col">
      <div className="p-3 border-b flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Lightbulb className="h-4 w-4 text-amber-500" />
          <h3 className="font-semibold text-sm">Aligner</h3>
        </div>
        <Button variant="ghost" size="icon" onClick={onCloseSidebar} className="h-7 w-7" data-testid="button-close-sidebar">
          <ChevronLeft className="h-4 w-4" />
        </Button>
      </div>

      <div className="p-2 border-b">
        <Button variant="outline" size="sm" onClick={onNewConversation} className="w-full" data-testid="button-new-aligner-chat">
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
                    className={`p-2 rounded-md cursor-pointer hover-elevate ${selectedConversationId === conv.id ? "bg-accent" : ""}`}
                    onClick={() => onSelectConversation(conv.id)}
                    data-testid={`aligner-conversation-${conv.id}`}
                  >
                    <p className="text-sm font-medium truncate">{conv.title}</p>
                  </div>
                </ContextMenuTrigger>
                <ContextMenuContent className="w-48">
                  <ContextMenuItem
                    onClick={() => {
                      if (confirm("Delete this conversation?")) {
                        onDeleteConversation(conv.id);
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
  );
}
