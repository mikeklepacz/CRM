import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { AIChat } from "@/components/ai-chat";
import { Bot } from "lucide-react";

interface ChatPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ChatPanel({ open, onOpenChange }: ChatPanelProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:w-[500px] p-0 flex flex-col">
        <SheetHeader className="p-4 border-b">
          <SheetTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            Sales Assistant
          </SheetTitle>
        </SheetHeader>
        <div className="flex-1 overflow-hidden">
          <AIChat className="h-full" />
        </div>
      </SheetContent>
    </Sheet>
  );
}
