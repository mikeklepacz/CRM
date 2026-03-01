import type { InlineAIChatEnhancedProps } from "@/components/inline-ai-chat-enhanced.types";
import { InlineAIChatController } from "@/components/inline-ai-chat/inline-ai-chat-controller";

export function InlineAIChatEnhancedPage(props: InlineAIChatEnhancedProps) {
  return <InlineAIChatController {...props} />;
}
