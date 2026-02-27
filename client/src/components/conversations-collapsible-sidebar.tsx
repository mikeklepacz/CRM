import { ChevronDown, Folder, FolderPlus, MessageSquarePlus, Sparkles } from "lucide-react";
import type { Conversation, Project } from "@shared/schema";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ConversationContextMenu } from "@/components/conversation-context-menu";
import { ProjectContextMenu } from "@/components/project-context-menu";

type ConversationsByProject = Record<string, Conversation[]>;

type ConversationsCollapsibleSidebarProps = {
  conversations: Conversation[];
  conversationsByProject: ConversationsByProject;
  conversationsOpen: boolean;
  projects: Project[];
  selectedConversationId: string | null;
  onCreateConversation: () => void;
  onDeleteConversation: (conversationId: string) => void;
  onDeleteProject: (projectId: string) => void;
  onMoveConversation: (conversationId: string, projectId: string | null) => void;
  onNewProject: () => void;
  onRenameConversation: (conversation: Conversation) => void;
  onSelectConversation: (conversationId: string) => void;
  onToggle: (open: boolean) => void;
};

export function ConversationsCollapsibleSidebar({
  conversations,
  conversationsByProject,
  conversationsOpen,
  projects,
  selectedConversationId,
  onCreateConversation,
  onDeleteConversation,
  onDeleteProject,
  onMoveConversation,
  onNewProject,
  onRenameConversation,
  onSelectConversation,
  onToggle,
}: ConversationsCollapsibleSidebarProps) {
  return (
    <Collapsible open={conversationsOpen} onOpenChange={onToggle} className={conversationsOpen ? "flex-1 flex flex-col min-h-0 overflow-hidden" : "flex-shrink-0"}>
      <div className="border-b flex-shrink-0">
        <CollapsibleTrigger className="w-full p-3 flex items-center justify-between hover-elevate active-elevate-2" data-testid="button-toggle-conversations">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            <span className="font-semibold text-sm">Conversations</span>
            <Badge variant="secondary">{conversations.length}</Badge>
          </div>
          <ChevronDown className={`h-4 w-4 transition-transform ${conversationsOpen ? "rotate-180" : ""}`} />
        </CollapsibleTrigger>
        <CollapsibleContent className="flex-1 min-h-0 overflow-hidden">
          <div className="p-2 h-full overflow-y-auto">
            <div className="flex gap-1 mb-2">
              <Button
                variant="outline"
                size="sm"
                onClick={onCreateConversation}
                className="flex-1"
                data-testid="button-new-chat"
              >
                <MessageSquarePlus className="h-4 w-4 mr-1" />
                New Chat
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={onNewProject}
                className="flex-1"
                data-testid="button-new-project"
              >
                <FolderPlus className="h-4 w-4 mr-1" />
                New Project
              </Button>
            </div>
            <div className="space-y-2">
              {conversationsByProject.none && conversationsByProject.none.length > 0 && (
                <div className="space-y-1">
                  {conversationsByProject.none.map((conv) => (
                    <ConversationContextMenu
                      key={conv.id}
                      conversationId={conv.id}
                      onRename={() => onRenameConversation(conv)}
                      onDelete={() => onDeleteConversation(conv.id)}
                      onMove={(projectId) => onMoveConversation(conv.id, projectId)}
                      projects={projects}
                      currentProjectId={conv.projectId}
                    >
                      <div
                        className={`p-2 rounded-md cursor-pointer hover-elevate ${selectedConversationId === conv.id ? "bg-accent" : ""}`}
                        onClick={() => onSelectConversation(conv.id)}
                        data-testid={`conversation-item-${conv.id}`}
                      >
                        <p className="text-sm font-medium truncate">{conv.title}</p>
                      </div>
                    </ConversationContextMenu>
                  ))}
                </div>
              )}

              {projects.map((project) => (
                <div key={project.id} className="space-y-1">
                  <ProjectContextMenu projectId={project.id} onDelete={() => onDeleteProject(project.id)}>
                    <div className="flex items-center gap-2 px-2 py-1 rounded-md hover-elevate" data-testid={`project-item-${project.id}`}>
                      <Folder className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">{project.name}</span>
                    </div>
                  </ProjectContextMenu>
                  {conversationsByProject[project.id]?.map((conv) => (
                    <ConversationContextMenu
                      key={conv.id}
                      conversationId={conv.id}
                      onRename={() => onRenameConversation(conv)}
                      onDelete={() => onDeleteConversation(conv.id)}
                      onMove={(projectId) => onMoveConversation(conv.id, projectId)}
                      projects={projects}
                      currentProjectId={conv.projectId}
                    >
                      <div
                        className={`p-2 rounded-md cursor-pointer ml-4 hover-elevate ${selectedConversationId === conv.id ? "bg-accent" : ""}`}
                        onClick={() => onSelectConversation(conv.id)}
                        data-testid={`conversation-item-${conv.id}`}
                      >
                        <p className="text-sm font-medium truncate">{conv.title}</p>
                      </div>
                    </ConversationContextMenu>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
