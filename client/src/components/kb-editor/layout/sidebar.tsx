import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Loader2, FileText, User, Download, Search } from "lucide-react";
import type { KBEditorLayoutProps } from "./types";

type SidebarProps = Pick<
  KBEditorLayoutProps,
  | "editorMode"
  | "selectedItemId"
  | "fileSearchQuery"
  | "kbLoading"
  | "agentsLoading"
  | "filteredFiles"
  | "agents"
  | "onSetEditorMode"
  | "onSetSelectedItemId"
  | "onSetFileSearchQuery"
  | "onSelectFile"
  | "onSelectAgent"
  | "onDownloadFile"
>;

export function KBEditorSidebar({
  editorMode,
  selectedItemId,
  fileSearchQuery,
  kbLoading,
  agentsLoading,
  filteredFiles,
  agents,
  onSetEditorMode,
  onSetSelectedItemId,
  onSetFileSearchQuery,
  onSelectFile,
  onSelectAgent,
  onDownloadFile,
}: SidebarProps) {
  return (
    <div className="w-64 border-r">
      <div className="p-3 border-b space-y-3">
        <div className="flex gap-2">
          <Button
            variant={editorMode === "file" ? "default" : "outline"}
            size="sm"
            onClick={() => {
              onSetEditorMode("file");
              onSetSelectedItemId(null);
            }}
            className="flex-1"
            data-testid="button-mode-files"
          >
            <FileText className="h-4 w-4 mr-1" />
            Files
          </Button>
          <Button
            variant={editorMode === "agent" ? "default" : "outline"}
            size="sm"
            onClick={() => {
              onSetEditorMode("agent");
              onSetSelectedItemId(null);
            }}
            className="flex-1"
            data-testid="button-mode-agents"
          >
            <User className="h-4 w-4 mr-1" />
            Agents
          </Button>
        </div>

        {editorMode === "file" && (
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Filter files..."
              value={fileSearchQuery}
              onChange={(e) => onSetFileSearchQuery(e.target.value)}
              className="h-8 pl-7 text-xs"
              data-testid="input-file-search"
            />
          </div>
        )}
      </div>

      <ScrollArea className="h-[calc(100vh-300px)]">
        <div className="p-2 space-y-1">
          {editorMode === "file" ? (
            kbLoading ? (
              <div className="text-center py-8">
                <Loader2 className="h-4 w-4 animate-spin mx-auto text-muted-foreground" />
              </div>
            ) : filteredFiles.length === 0 ? (
              <div className="text-center py-8 px-2">
                <p className="text-xs text-muted-foreground">
                  {fileSearchQuery.trim() ? "No files match your search" : "No KB files"}
                </p>
              </div>
            ) : (
              filteredFiles.map((file: any) => {
                const isEmpty = !file.currentContent || file.currentContent.trim() === "";
                return (
                  <div key={file.id} className="flex items-center gap-1">
                    <Button
                      variant={selectedItemId === file.id ? "secondary" : "ghost"}
                      size="sm"
                      onClick={() => onSelectFile(file)}
                      className="flex-1 justify-start text-left"
                      data-testid={`button-select-file-${file.id}`}
                    >
                      <FileText className="h-3 w-3 mr-2 flex-shrink-0" />
                      <span className={`truncate text-xs ${isEmpty ? "bg-pink-100 dark:bg-pink-950/50 px-1 rounded" : ""}`}>
                        {file.filename}
                      </span>
                      {file.matchCount > 0 && (
                        <Badge variant="secondary" className="ml-auto text-xs">
                          {file.matchCount}
                        </Badge>
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 flex-shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDownloadFile(file);
                      }}
                      data-testid={`button-download-file-${file.id}`}
                      title="Download file"
                    >
                      <Download className="h-3 w-3" />
                    </Button>
                  </div>
                );
              })
            )
          ) : agentsLoading ? (
            <div className="text-center py-8">
              <Loader2 className="h-4 w-4 animate-spin mx-auto text-muted-foreground" />
            </div>
          ) : agents.length === 0 ? (
            <div className="text-center py-8 px-2">
              <p className="text-xs text-muted-foreground">No agents configured</p>
            </div>
          ) : (
            agents.map((agent: any) => (
              <Button
                key={agent.agent_id}
                variant={selectedItemId === agent.agent_id ? "secondary" : "ghost"}
                size="sm"
                onClick={() => onSelectAgent(agent.agent_id)}
                className="w-full justify-start text-left"
                data-testid={`button-select-agent-${agent.agent_id}`}
              >
                <User className="h-3 w-3 mr-2 flex-shrink-0" />
                <span className="truncate text-xs">{agent.name}</span>
              </Button>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
