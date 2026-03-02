import type { InlineAIChatEnhancedProps } from "@/components/inline-ai-chat-enhanced.types";
import { InlineAIChatControllerImpl } from "@/components/inline-ai-chat/inline-ai-chat-controller-impl";

export function InlineAIChatController(props: InlineAIChatEnhancedProps) {
  return <InlineAIChatControllerImpl {...props} />;
}
