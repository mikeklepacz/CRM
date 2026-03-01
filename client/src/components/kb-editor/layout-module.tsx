import { KBEditorContent } from "@/components/kb-editor/layout/editor-content";
import { KBEditorSidebar } from "@/components/kb-editor/layout/sidebar";
import type { KBEditorLayoutProps } from "@/components/kb-editor/layout/types";

export function KBEditorLayout(props: KBEditorLayoutProps) {
  const {
    className,
    editorMode,
    selectedItemId,
    content,
    saveStatus,
    fileSearchQuery,
    showFindReplace,
    findQuery,
    replaceQuery,
    caseSensitive,
    currentMatchIndex,
    matchCount,
    matches,
    kbLoading,
    agentsLoading,
    filteredFiles,
    agents,
    kbFiles,
    hasUnsavedChanges,
    isLoading,
    onSetEditorMode,
    onSetSelectedItemId,
    onSetFileSearchQuery,
    onSelectFile,
    onSelectAgent,
    onDownloadFile,
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
  } = props;

  return (
    <div className={`flex gap-4 ${className || ""}`}>
      <KBEditorSidebar
        editorMode={editorMode}
        selectedItemId={selectedItemId}
        fileSearchQuery={fileSearchQuery}
        kbLoading={kbLoading}
        agentsLoading={agentsLoading}
        filteredFiles={filteredFiles}
        agents={agents}
        onSetEditorMode={onSetEditorMode}
        onSetSelectedItemId={onSetSelectedItemId}
        onSetFileSearchQuery={onSetFileSearchQuery}
        onSelectFile={onSelectFile}
        onSelectAgent={onSelectAgent}
        onDownloadFile={onDownloadFile}
      />
      <div className="flex-1 flex flex-col min-w-0">
        <KBEditorContent
          editorMode={editorMode}
          selectedItemId={selectedItemId}
          content={content}
          saveStatus={saveStatus}
          showFindReplace={showFindReplace}
          findQuery={findQuery}
          replaceQuery={replaceQuery}
          caseSensitive={caseSensitive}
          currentMatchIndex={currentMatchIndex}
          matchCount={matchCount}
          matches={matches}
          agents={agents}
          kbFiles={kbFiles}
          hasUnsavedChanges={hasUnsavedChanges}
          isLoading={isLoading}
          onToggleFindReplace={onToggleFindReplace}
          onSave={onSave}
          onSetFindQuery={onSetFindQuery}
          onSetReplaceQuery={onSetReplaceQuery}
          onCloseFindReplace={onCloseFindReplace}
          onPreviousMatch={onPreviousMatch}
          onNextMatch={onNextMatch}
          onToggleCaseSensitive={onToggleCaseSensitive}
          onReplace={onReplace}
          onReplaceAll={onReplaceAll}
          onSetHighlightRef={onSetHighlightRef}
          onSetTextareaRef={onSetTextareaRef}
          onTextareaScroll={onTextareaScroll}
          onContentChange={onContentChange}
        />
      </div>
    </div>
  );
}
