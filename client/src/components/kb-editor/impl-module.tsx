import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { filterFilesBySearch, findMatchesInContent } from "./helpers";
import { KBEditorLayout } from "./layout-module";
import { EditorMode, SaveStatus } from "./types";
import { useKBEditorMutations } from "./mutations";

interface KBEditorProps {
  className?: string;
}

export function KBEditor({ className }: KBEditorProps) {
  const { toast } = useToast();
  const [editorMode, setEditorMode] = useState<EditorMode>("file");
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [content, setContent] = useState("");
  const [originalContent, setOriginalContent] = useState("");
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [fileSearchQuery, setFileSearchQuery] = useState("");

  const [showFindReplace, setShowFindReplace] = useState(false);
  const [findQuery, setFindQuery] = useState("");
  const [replaceQuery, setReplaceQuery] = useState("");
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
  const [textareaRef, setTextareaRef] = useState<HTMLTextAreaElement | null>(null);
  const [highlightRef, setHighlightRef] = useState<HTMLDivElement | null>(null);
  const preserveFindOnSelectRef = useRef(false);

  const { data: kbData, isLoading: kbLoading } = useQuery<any>({ queryKey: ["/api/kb/files"] });
  const kbFiles = kbData?.files || [];

  const { data: agentsData, isLoading: agentsLoading } = useQuery<any>({ queryKey: ["/api/elevenlabs/agents"] });
  const agents = agentsData?.agents || agentsData || [];

  const { data: fileData, isLoading: fileLoading } = useQuery<any>({
    queryKey: ["/api/kb/files", selectedItemId],
    enabled: editorMode === "file" && !!selectedItemId,
  });

  const { data: agentData, isLoading: agentLoading } = useQuery<any>({
    queryKey: ["/api/elevenlabs/agents", selectedItemId, "details"],
    enabled: editorMode === "agent" && !!selectedItemId,
  });

  useEffect(() => {
    if (editorMode === "file" && fileData && selectedItemId) {
      const fileContent = fileData.currentContent || "";
      setContent(fileContent);
      setOriginalContent(fileContent);
      setSaveStatus("idle");
    }
  }, [fileData, editorMode, selectedItemId]);

  useEffect(() => {
    if (editorMode === "agent" && agentData) {
      console.log("[KB Editor] Agent data received:", agentData);
      console.log("[KB Editor] Prompt field:", agentData.prompt);

      const promptContent = agentData.prompt?.prompt || agentData.prompt || "";
      console.log("[KB Editor] Extracted prompt content:", promptContent);
      console.log("[KB Editor] Setting content with length:", promptContent.length);

      setContent(promptContent);
      setOriginalContent(promptContent);
      setSaveStatus("idle");
    }
  }, [agentData, editorMode, selectedItemId]);

  useEffect(() => {
    setContent("");
    setOriginalContent("");
    setSaveStatus("idle");
  }, [editorMode]);

  const { handleSave } = useKBEditorMutations({
    kbFiles,
    selectedItemId,
    content,
    editorMode,
    setSaveStatus,
    setOriginalContent,
    toast,
  });

  const hasUnsavedChanges = content !== originalContent;
  const isLoading = editorMode === "file" ? fileLoading : agentLoading;

  const filteredFiles = filterFilesBySearch(kbFiles, fileSearchQuery);
  const matches = findMatchesInContent(content, findQuery, caseSensitive);
  const matchCount = matches.length;

  const navigateToMatch = (index: number) => {
    if (matches.length === 0 || !textareaRef) return;
    const matchPosition = matches[index];
    textareaRef.setSelectionRange(matchPosition, matchPosition + findQuery.length);
    textareaRef.scrollTop = textareaRef.scrollHeight * (matchPosition / content.length);
  };

  const handleNextMatch = () => {
    if (matches.length === 0 || !textareaRef) return;
    const nextIndex = (currentMatchIndex + 1) % matches.length;
    setCurrentMatchIndex(nextIndex);
    textareaRef.focus();
    navigateToMatch(nextIndex);
  };

  const handlePreviousMatch = () => {
    if (matches.length === 0 || !textareaRef) return;
    const prevIndex = currentMatchIndex === 0 ? matches.length - 1 : currentMatchIndex - 1;
    setCurrentMatchIndex(prevIndex);
    textareaRef.focus();
    navigateToMatch(prevIndex);
  };

  const handleReplace = () => {
    if (matches.length === 0 || !textareaRef) return;

    const matchPosition = matches[currentMatchIndex];
    const before = content.substring(0, matchPosition);
    const after = content.substring(matchPosition + findQuery.length);
    const newContent = before + replaceQuery + after;

    setContent(newContent);
    if (currentMatchIndex >= matches.length - 1 && matches.length > 1) {
      setCurrentMatchIndex(0);
    }
  };

  const handleReplaceAll = () => {
    if (matches.length === 0) return;

    let newContent = content;
    if (caseSensitive) {
      newContent = content.replaceAll(findQuery, replaceQuery);
    } else {
      const regex = new RegExp(findQuery.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
      newContent = content.replace(regex, replaceQuery);
    }

    setContent(newContent);
    setCurrentMatchIndex(0);

    toast({
      title: "Replaced All",
      description: `Replaced ${matches.length} occurrence${matches.length !== 1 ? "s" : ""}`,
    });
  };

  useEffect(() => {
    if (findQuery && matches.length > 0 && currentMatchIndex >= matches.length) {
      setCurrentMatchIndex(Math.min(currentMatchIndex, matches.length - 1));
    }
  }, [findQuery, matches.length, content, caseSensitive, currentMatchIndex]);

  const handleTextareaScroll = () => {
    if (textareaRef && highlightRef) {
      highlightRef.scrollTop = textareaRef.scrollTop;
      highlightRef.scrollLeft = textareaRef.scrollLeft;
    }
  };

  useEffect(() => {
    if (textareaRef && highlightRef && findQuery && matches.length > 0) {
      highlightRef.scrollTop = textareaRef.scrollTop;
      highlightRef.scrollLeft = textareaRef.scrollLeft;
    }
  }, [highlightRef, textareaRef, findQuery, matches.length]);

  useEffect(() => {
    if (!preserveFindOnSelectRef.current) {
      setShowFindReplace(false);
      setFindQuery("");
      setReplaceQuery("");
      setCurrentMatchIndex(0);
    } else {
      preserveFindOnSelectRef.current = false;
    }
  }, [selectedItemId]);

  return (
    <KBEditorLayout
      className={className}
      editorMode={editorMode}
      selectedItemId={selectedItemId}
      content={content}
      saveStatus={saveStatus}
      fileSearchQuery={fileSearchQuery}
      showFindReplace={showFindReplace}
      findQuery={findQuery}
      replaceQuery={replaceQuery}
      caseSensitive={caseSensitive}
      currentMatchIndex={currentMatchIndex}
      matchCount={matchCount}
      matches={matches}
      kbLoading={kbLoading}
      agentsLoading={agentsLoading}
      filteredFiles={filteredFiles}
      agents={agents}
      kbFiles={kbFiles}
      hasUnsavedChanges={hasUnsavedChanges}
      isLoading={isLoading}
      textareaRef={textareaRef}
      onSetEditorMode={setEditorMode}
      onSetSelectedItemId={setSelectedItemId}
      onSetFileSearchQuery={setFileSearchQuery}
      onSelectFile={(file: any) => {
        if (fileSearchQuery.trim()) {
          preserveFindOnSelectRef.current = true;
          setFindQuery(fileSearchQuery);
          setShowFindReplace(true);
          setCurrentMatchIndex(0);
        } else {
          preserveFindOnSelectRef.current = false;
        }
        setSelectedItemId(file.id);
      }}
      onSelectAgent={setSelectedItemId}
      onDownloadFile={(file: any) => {
        const blob = new Blob([file.currentContent || ""], { type: "text/plain" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = file.filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast({
          title: "Success",
          description: `Downloaded ${file.filename}`,
        });
      }}
      onToggleFindReplace={() => setShowFindReplace(!showFindReplace)}
      onSave={handleSave}
      onSetFindQuery={(value) => {
        setFindQuery(value);
        setCurrentMatchIndex(0);
      }}
      onSetReplaceQuery={setReplaceQuery}
      onCloseFindReplace={() => setShowFindReplace(false)}
      onPreviousMatch={handlePreviousMatch}
      onNextMatch={handleNextMatch}
      onToggleCaseSensitive={() => setCaseSensitive(!caseSensitive)}
      onReplace={handleReplace}
      onReplaceAll={handleReplaceAll}
      highlightRef={highlightRef}
      onSetHighlightRef={setHighlightRef}
      onSetTextareaRef={setTextareaRef}
      onTextareaScroll={handleTextareaScroll}
      onContentChange={setContent}
    />
  );
}
