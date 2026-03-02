import { useEffect } from "react";
import { buildInlineAiContextData } from "@/components/inline-ai-context-data";
import type { Template } from "@shared/schema";
import type { TimelineItem } from "@/components/inline-ai-chat-enhanced.types";

export function useInlineAiEffects({
  selectedConversationId,
  setTimeline,
  mergedTimeline,
  isSending,
  scrollBottomRef,
  isInjectingScriptRef,
  previousTimelineLengthRef,
  contextUpdateTrigger,
  storeContext,
  updateConversationContextMutation,
  loadDefaultScriptTrigger,
  lastLoadTrigger,
  setLastLoadTrigger,
  templates,
  replaceTemplateVariables,
  user,
}: {
  selectedConversationId: string | null;
  setTimeline: React.Dispatch<React.SetStateAction<TimelineItem[]>>;
  mergedTimeline: TimelineItem[];
  isSending: boolean;
  scrollBottomRef: React.RefObject<HTMLDivElement>;
  isInjectingScriptRef: React.MutableRefObject<boolean>;
  previousTimelineLengthRef: React.MutableRefObject<number>;
  contextUpdateTrigger?: number;
  storeContext: any;
  updateConversationContextMutation: any;
  loadDefaultScriptTrigger?: number;
  lastLoadTrigger: number;
  setLastLoadTrigger: React.Dispatch<React.SetStateAction<number>>;
  templates: Template[];
  replaceTemplateVariables: (content: string, storeData: any, currentUser: any) => string;
  user: any;
}) {
  useEffect(() => {
    setTimeline((prev) => prev.filter((item) => item.type === "script"));
  }, [selectedConversationId]);

  useEffect(() => {
    const newItemAdded = mergedTimeline.length > previousTimelineLengthRef.current;

    if (scrollBottomRef.current && !isInjectingScriptRef.current && newItemAdded) {
      const lastItem = mergedTimeline[mergedTimeline.length - 1];
      const isScriptAdded = lastItem && lastItem.type === "script";

      if (!isScriptAdded) {
        requestAnimationFrame(() => {
          scrollBottomRef.current?.scrollIntoView({
            behavior: "smooth",
            block: "end",
          });
        });
      }
    }

    previousTimelineLengthRef.current = mergedTimeline.length;
    isInjectingScriptRef.current = false;
  }, [mergedTimeline, isSending]);

  useEffect(() => {
    if (contextUpdateTrigger && contextUpdateTrigger > 0 && selectedConversationId && storeContext) {
      const updateContext = async () => {
        const contextData = buildInlineAiContextData(storeContext);
        await updateConversationContextMutation.mutateAsync({
          id: selectedConversationId,
          contextData,
        });
      };
      updateContext();
    }
  }, [contextUpdateTrigger, selectedConversationId]);

  useEffect(() => {
    if (
      loadDefaultScriptTrigger &&
      loadDefaultScriptTrigger > 0 &&
      loadDefaultScriptTrigger !== lastLoadTrigger &&
      templates.length > 0
    ) {
      const defaultScript = templates.find((t) => t.type === "Script" && t.isDefault);
      if (defaultScript && storeContext) {
        isInjectingScriptRef.current = true;

        const filledContent = replaceTemplateVariables(defaultScript.content, storeContext, user);

        const scriptItem: TimelineItem = {
          type: "script",
          id: `script-${Date.now()}`,
          title: defaultScript.title,
          content: filledContent,
          timestamp: Date.now(),
        };
        setTimeline((prev) => [...prev, scriptItem]);

        setLastLoadTrigger(loadDefaultScriptTrigger);
      }
      setLastLoadTrigger(loadDefaultScriptTrigger);
    }
  }, [loadDefaultScriptTrigger, templates, storeContext, lastLoadTrigger]);
}
