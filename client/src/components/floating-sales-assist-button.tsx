import { createPortal } from 'react-dom';
import { Sparkles } from 'lucide-react';
import { useChatPanel } from '@/hooks/useChatPanel';

export function FloatingSalesAssistButton() {
  const { togglePanel } = useChatPanel();

  // Portal the button to document.body to ensure it sits above dialog overlays
  return createPortal(
    <button
      onClick={togglePanel}
      className="fixed left-0 top-4 z-[60] rounded-r-md shadow-lg bg-primary text-primary-foreground hover-elevate active-elevate-2 px-3 py-2 flex items-center gap-2 text-xs font-medium pointer-events-auto"
      data-testid="button-toggle-sales-assist"
    >
      <Sparkles className="h-4 w-4" />
      <span>Sales Assist</span>
    </button>,
    document.body
  );
}
