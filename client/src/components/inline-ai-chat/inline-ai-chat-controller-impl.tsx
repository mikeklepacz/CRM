import type { InlineAIChatEnhancedProps } from "@/components/inline-ai-chat-enhanced.types";
import { InlineAIChatControllerCore } from "@/components/inline-ai-chat/inline-ai-chat-controller-core";

export function InlineAIChatControllerImpl(props: InlineAIChatEnhancedProps) {
  return <InlineAIChatControllerCore {...props} />;
}
