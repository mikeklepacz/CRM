import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { Trash2 } from "lucide-react";

interface ProjectContextMenuProps {
  children: React.ReactNode;
  projectId: string;
  onDelete: () => void;
}

export function ProjectContextMenu({
  children,
  projectId,
  onDelete,
}: ProjectContextMenuProps) {
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild data-testid={`trigger-project-menu-${projectId}`}>
        {children}
      </ContextMenuTrigger>
      <ContextMenuContent className="w-48">
        <ContextMenuItem
          onClick={onDelete}
          className="text-destructive focus:text-destructive"
          data-testid="menuitem-delete-project"
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Delete Folder
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
