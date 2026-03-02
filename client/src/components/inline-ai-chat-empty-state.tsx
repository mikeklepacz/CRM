import { Bot, MessageSquarePlus } from "lucide-react";
import { Button } from "@/components/ui/button";

type InlineAiChatEmptyStateProps = {
  onStartChat: () => void;
};

export function InlineAiChatEmptyState({
  onStartChat,
}: InlineAiChatEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center p-8">
      <Bot className="h-16 w-16 mb-4 text-muted-foreground opacity-50" />
      <h3 className="text-lg font-semibold mb-2">Welcome to Sales Assistant</h3>
      <p className="text-muted-foreground mb-4">
        Inject a script or create a new chat to get started
      </p>
      <Button onClick={onStartChat} data-testid="button-start-chat">
        <MessageSquarePlus className="h-4 w-4 mr-2" />
        Start New Chat
      </Button>
    </div>
  );
}
