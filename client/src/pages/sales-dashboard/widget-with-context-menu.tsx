import { EyeOff } from "lucide-react";

import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from "@/components/ui/context-menu";

export function WidgetWithContextMenu({
  widgetId,
  widgetName,
  children,
  onHide,
}: {
  widgetId: string;
  widgetName: string;
  children: React.ReactNode;
  onHide: () => void;
}) {
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div className="h-full w-full">{children}</div>
      </ContextMenuTrigger>
      <ContextMenuContent data-testid={`context-menu-${widgetId}`}>
        <ContextMenuItem onClick={onHide} data-testid={`menu-hide-${widgetId}`}>
          <EyeOff className="h-4 w-4 mr-2" />
          Hide {widgetName}
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
