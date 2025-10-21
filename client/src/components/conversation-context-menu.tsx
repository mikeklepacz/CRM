import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { Folder, Pencil, Trash2 } from "lucide-react";
import type { Project } from "@shared/schema";

interface ConversationContextMenuProps {
  children: React.ReactNode;
  conversationId: string;
  onRename: () => void;
  onDelete: () => void;
  onMove: (projectId: string | null) => void;
  projects: Project[];
  currentProjectId?: string | null;
}

export function ConversationContextMenu({
  children,
  conversationId,
  onRename,
  onDelete,
  onMove,
  projects,
  currentProjectId,
}: ConversationContextMenuProps) {
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild data-testid={`trigger-conversation-menu-${conversationId}`}>
        {children}
      </ContextMenuTrigger>
      <ContextMenuContent className="w-48">
        <ContextMenuItem onClick={onRename} data-testid="menuitem-rename-conversation">
          <Pencil className="h-4 w-4 mr-2" />
          Rename
        </ContextMenuItem>
        
        <ContextMenuSub>
          <ContextMenuSubTrigger data-testid="menuitem-move-conversation">
            <Folder className="h-4 w-4 mr-2" />
            Move to Project
          </ContextMenuSubTrigger>
          <ContextMenuSubContent className="w-48">
            <ContextMenuItem
              onClick={() => onMove(null)}
              disabled={currentProjectId === null}
              data-testid="menuitem-project-none"
            >
              No Project
            </ContextMenuItem>
            <ContextMenuSeparator />
            {projects.map((project) => (
              <ContextMenuItem
                key={project.id}
                onClick={() => onMove(project.id)}
                disabled={currentProjectId === project.id}
                data-testid={`menuitem-project-${project.id}`}
              >
                {project.name}
              </ContextMenuItem>
            ))}
          </ContextMenuSubContent>
        </ContextMenuSub>
        
        <ContextMenuSeparator />
        
        <ContextMenuItem
          onClick={onDelete}
          className="text-destructive focus:text-destructive"
          data-testid="menuitem-delete-conversation"
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Delete
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
