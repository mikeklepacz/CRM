import { Bot, ChevronRight, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";

type InlineAiChatHeaderProps = {
  contextStoreName: string | undefined;
  hasInjectedScripts: boolean;
  sidebarOpen: boolean;
  onClearScripts: () => void;
  onOpenSidebar: () => void;
};

export function InlineAiChatHeader({
  contextStoreName,
  hasInjectedScripts,
  sidebarOpen,
  onClearScripts,
  onOpenSidebar,
}: InlineAiChatHeaderProps) {
  return (
    <>
      <div className="p-3 border-b flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          {!sidebarOpen && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onOpenSidebar}
              className="h-7 w-7"
              data-testid="button-open-sidebar"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          )}
          <Bot className="h-5 w-5" />
          <h2 className="font-semibold">Sales Assistant</h2>
        </div>
        {hasInjectedScripts && (
          <Button
            variant="outline"
            size="sm"
            onClick={onClearScripts}
            data-testid="button-clear-scripts"
          >
            <X className="h-3 w-3 mr-1" />
            Clear Scripts
          </Button>
        )}
      </div>

      {contextStoreName && (
        <div className="px-4 py-2 bg-muted/50 text-sm flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="text-muted-foreground">
            Context:{" "}
            <span className="font-medium text-foreground">
              {contextStoreName}
            </span>
          </span>
        </div>
      )}
    </>
  );
}
