import React from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import {
  Loader2,
  FileText,
  User,
  Save,
  AlertCircle,
  CheckCircle2,
  Search,
  ChevronUp,
  ChevronDown,
  X,
} from "lucide-react";
import type { KBEditorLayoutProps } from "./types";

type EditorContentProps = Pick<
  KBEditorLayoutProps,
  | "editorMode"
  | "selectedItemId"
  | "content"
  | "saveStatus"
  | "showFindReplace"
  | "findQuery"
  | "replaceQuery"
  | "caseSensitive"
  | "currentMatchIndex"
  | "matchCount"
  | "matches"
  | "agents"
  | "kbFiles"
  | "hasUnsavedChanges"
  | "isLoading"
  | "onToggleFindReplace"
  | "onSave"
  | "onSetFindQuery"
  | "onSetReplaceQuery"
  | "onCloseFindReplace"
  | "onPreviousMatch"
  | "onNextMatch"
  | "onToggleCaseSensitive"
  | "onReplace"
  | "onReplaceAll"
  | "onSetHighlightRef"
  | "onSetTextareaRef"
  | "onTextareaScroll"
  | "onContentChange"
>;

export function KBEditorContent({
  editorMode,
  selectedItemId,
  content,
  saveStatus,
  showFindReplace,
  findQuery,
  replaceQuery,
  caseSensitive,
  currentMatchIndex,
  matchCount,
  matches,
  agents,
  kbFiles,
  hasUnsavedChanges,
  isLoading,
  onToggleFindReplace,
  onSave,
  onSetFindQuery,
  onSetReplaceQuery,
  onCloseFindReplace,
  onPreviousMatch,
  onNextMatch,
  onToggleCaseSensitive,
  onReplace,
  onReplaceAll,
  onSetHighlightRef,
  onSetTextareaRef,
  onTextareaScroll,
  onContentChange,
}: EditorContentProps) {
  if (!selectedItemId) {
    return (
      <div className="flex-1 flex items-center justify-center bg-muted/20 rounded-lg">
        <div className="text-center">
          <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">Select a {editorMode === "file" ? "file" : "agent"} to edit</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between p-3 border-b">
        <div className="flex items-center gap-2">
          {editorMode === "file" ? (
            <>
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium text-sm">{kbFiles.find((f: any) => f.id === selectedItemId)?.filename}</span>
            </>
          ) : (
            <>
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium text-sm">{agents.find((a: any) => a.agent_id === selectedItemId)?.name} System Prompt</span>
            </>
          )}
          {hasUnsavedChanges && (
            <Badge variant="outline" className="text-xs">
              Unsaved changes
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2">
          {saveStatus === "saved" && (
            <div className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
              <CheckCircle2 className="h-3 w-3" />
              Saved
            </div>
          )}
          {saveStatus === "error" && (
            <div className="flex items-center gap-1 text-xs text-destructive">
              <AlertCircle className="h-3 w-3" />
              Error
            </div>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={onToggleFindReplace}
            className={showFindReplace ? "bg-accent" : ""}
            data-testid="button-toggle-find-replace"
            title="Find and Replace (Cmd+F)"
          >
            <Search className="h-3 w-3 mr-1" />Find
          </Button>
          <Button size="sm" onClick={onSave} disabled={!hasUnsavedChanges || saveStatus === "saving"} data-testid="button-save-editor">
            {saveStatus === "saving" ? (
              <>
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />Saving...
              </>
            ) : (
              <>
                <Save className="h-3 w-3 mr-1" />Save & Sync
              </>
            )}
          </Button>
        </div>
      </div>

      {showFindReplace && (
        <div className="border-b bg-muted/20 p-3 space-y-2">
          <div className="flex items-center gap-2">
            <div className="flex-1 flex items-center gap-2">
              <Input
                type="text"
                placeholder="Find..."
                value={findQuery}
                onChange={(e) => onSetFindQuery(e.target.value)}
                className="h-8 text-sm"
                data-testid="input-find-query"
              />
              <Input
                type="text"
                placeholder="Replace..."
                value={replaceQuery}
                onChange={(e) => onSetReplaceQuery(e.target.value)}
                className="h-8 text-sm"
                data-testid="input-replace-query"
              />
            </div>
            <Button size="sm" variant="ghost" onClick={onCloseFindReplace} data-testid="button-close-find-replace">
              <X className="h-3 w-3" />
            </Button>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                <Button size="sm" variant="outline" onClick={onPreviousMatch} disabled={matchCount === 0} data-testid="button-previous-match">
                  <ChevronUp className="h-3 w-3" />
                </Button>
                <Button size="sm" variant="outline" onClick={onNextMatch} disabled={matchCount === 0} data-testid="button-next-match">
                  <ChevronDown className="h-3 w-3" />
                </Button>
                <span className="text-xs text-muted-foreground ml-2">
                  {matchCount > 0 ? `${currentMatchIndex + 1} of ${matchCount}` : "No matches"}
                </span>
              </div>
              <Separator orientation="vertical" className="h-4" />
              <Button
                size="sm"
                variant="outline"
                onClick={onToggleCaseSensitive}
                className={caseSensitive ? "bg-accent" : ""}
                data-testid="button-case-sensitive"
                title="Case sensitive"
              >
                Aa
              </Button>
            </div>
            <div className="flex items-center gap-1">
              <Button size="sm" variant="outline" onClick={onReplace} disabled={matchCount === 0} data-testid="button-replace">
                Replace
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={onReplaceAll}
                disabled={matchCount === 0}
                data-testid="button-replace-all"
              >
                Replace All
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 p-3 relative">
        {findQuery && matches.length > 0 && (
          <div
            ref={onSetHighlightRef}
            className="absolute inset-3 pointer-events-none overflow-auto whitespace-pre-wrap break-words font-mono text-sm"
            style={{ lineHeight: "1.5", padding: "0.5rem 0.75rem", color: "transparent", userSelect: "none" }}
            data-testid="highlight-overlay"
          >
            {(() => {
              let lastIndex = 0;
              const parts: React.ReactNode[] = [];

              matches.forEach((matchIndex, idx) => {
                if (matchIndex > lastIndex) {
                  parts.push(<span key={`text-${idx}`}>{content.substring(lastIndex, matchIndex)}</span>);
                }

                const isCurrentMatch = idx === currentMatchIndex;
                parts.push(
                  <mark
                    key={`match-${idx}`}
                    className={isCurrentMatch ? "bg-yellow-400 dark:bg-yellow-600" : "bg-yellow-200 dark:bg-yellow-800"}
                    style={{ color: "transparent" }}
                  >
                    {content.substring(matchIndex, matchIndex + findQuery.length)}
                  </mark>,
                );

                lastIndex = matchIndex + findQuery.length;
              });

              if (lastIndex < content.length) {
                parts.push(<span key="text-end">{content.substring(lastIndex)}</span>);
              }

              return parts;
            })()}
          </div>
        )}

        <Textarea
          ref={onSetTextareaRef}
          value={content}
          onChange={(e) => onContentChange(e.target.value)}
          onScroll={onTextareaScroll}
          className="w-full h-full resize-none font-mono text-sm relative bg-transparent"
          style={{ caretColor: "auto", color: "inherit" }}
          placeholder={editorMode === "file" ? "Edit KB file content..." : "Edit agent system prompt..."}
          data-testid="textarea-editor-content"
        />
      </div>

      <div className="p-3 border-t bg-muted/20">
        <p className="text-xs text-muted-foreground">
          {editorMode === "file"
            ? "Changes will create a new version, sync to ElevenLabs, and backup to Google Drive."
            : "Changes will immediately update the agent's system prompt on ElevenLabs."}
        </p>
      </div>
    </>
  );
}
