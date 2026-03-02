import { Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type InlineAiChatMessageInputProps = {
  isSending: boolean;
  messageInput: string;
  onKeyPress: (e: React.KeyboardEvent) => void;
  onMessageInputChange: (value: string) => void;
  onSendMessage: () => void;
};

export function InlineAiChatMessageInput({
  isSending,
  messageInput,
  onKeyPress,
  onMessageInputChange,
  onSendMessage,
}: InlineAiChatMessageInputProps) {
  return (
    <div className="p-4 border-t flex-shrink-0">
      <div className="flex gap-2">
        <Textarea
          value={messageInput}
          onChange={(e) => onMessageInputChange(e.target.value)}
          onKeyPress={onKeyPress}
          placeholder="Ask about sales scripts, objections, or product info..."
          disabled={isSending}
          className="min-h-[60px] max-h-[200px]"
          data-testid="input-message"
        />
        <Button
          onClick={onSendMessage}
          disabled={isSending || !messageInput.trim()}
          size="icon"
          className="h-[60px] w-[60px]"
          data-testid="button-send-message"
        >
          {isSending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
        </Button>
      </div>
    </div>
  );
}
