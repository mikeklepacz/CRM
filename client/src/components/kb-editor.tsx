import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Loader2, FileText, User, Save, AlertCircle, CheckCircle2, Download, Search, ChevronUp, ChevronDown, X, Replace } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";

interface KBEditorProps {
  className?: string;
}

type EditorMode = 'file' | 'agent';
type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export function KBEditor({ className }: KBEditorProps) {
  const { toast } = useToast();
  const [editorMode, setEditorMode] = useState<EditorMode>('file');
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [content, setContent] = useState("");
  const [originalContent, setOriginalContent] = useState("");
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [fileSearchQuery, setFileSearchQuery] = useState("");
  
  // Find and Replace state
  const [showFindReplace, setShowFindReplace] = useState(false);
  const [findQuery, setFindQuery] = useState("");
  const [replaceQuery, setReplaceQuery] = useState("");
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
  const [textareaRef, setTextareaRef] = useState<HTMLTextAreaElement | null>(null);
  const [highlightRef, setHighlightRef] = useState<HTMLDivElement | null>(null);

  // Fetch KB files
  const { data: kbData, isLoading: kbLoading } = useQuery({
    queryKey: ['/api/kb/files'],
  });
  const kbFiles = kbData?.files || [];

  // Fetch agents
  const { data: agentsData, isLoading: agentsLoading } = useQuery({
    queryKey: ['/api/elevenlabs/agents'],
  });
  const agents = agentsData?.agents || agentsData || [];

  // Fetch selected KB file content
  const { data: fileData, isLoading: fileLoading } = useQuery({
    queryKey: ['/api/kb/files', selectedItemId],
    enabled: editorMode === 'file' && !!selectedItemId,
  });

  // Fetch selected agent details
  const { data: agentData, isLoading: agentLoading } = useQuery({
    queryKey: ['/api/elevenlabs/agents', selectedItemId, 'details'],
    enabled: editorMode === 'agent' && !!selectedItemId,
  });

  // Update content when file data loads
  useEffect(() => {
    if (editorMode === 'file' && fileData && selectedItemId) {
      // Load content even if empty - fileData exists means file was found
      const fileContent = fileData.currentContent || '';
      setContent(fileContent);
      setOriginalContent(fileContent);
      setSaveStatus('idle');
    }
  }, [fileData, editorMode, selectedItemId]);

  // Update content when agent data loads
  useEffect(() => {
    if (editorMode === 'agent' && agentData) {
      console.log('[KB Editor] Agent data received:', agentData);
      console.log('[KB Editor] Prompt field:', agentData.prompt);

      // ElevenLabs API returns nested structure: { prompt: { prompt: "actual content" } }
      const promptContent = agentData.prompt?.prompt || agentData.prompt || '';
      console.log('[KB Editor] Extracted prompt content:', promptContent);
      console.log('[KB Editor] Setting content with length:', promptContent.length);

      setContent(promptContent);
      setOriginalContent(promptContent);
      setSaveStatus('idle');
    }
  }, [agentData, editorMode, selectedItemId]);

  // Reset when switching modes only (not when switching files/agents)
  useEffect(() => {
    setContent("");
    setOriginalContent("");
    setSaveStatus('idle');
  }, [editorMode]);

  // Save KB file mutation
  const saveFileMutation = useMutation({
    mutationFn: async ({ fileId, newContent }: { fileId: string; newContent: string }) => {
      // Update file and create new version
      const file = kbFiles.find((f: any) => f.id === fileId);
      if (!file) throw new Error('File not found');

      return await apiRequest("PATCH", `/api/kb/files/${fileId}`, {
        content: newContent,
      });
    },
    onMutate: () => {
      setSaveStatus('saving');
    },
    onSuccess: (data: any) => {
      setSaveStatus('saved');
      setOriginalContent(content);
      queryClient.invalidateQueries({ queryKey: ['/api/kb/files'] });
      queryClient.invalidateQueries({ queryKey: ['/api/kb/files', selectedItemId] });
      
      // Show success with agent count if available
      const agentsUpdated = data?.agentsUpdated;
      const description = agentsUpdated
        ? `Saved and synced to ElevenLabs (${agentsUpdated} agent${agentsUpdated !== 1 ? 's' : ''} updated)`
        : "KB file saved and synced to ElevenLabs";
      
      toast({
        title: "Success",
        description,
      });
      setTimeout(() => setSaveStatus('idle'), 2000);
    },
    onError: (error: any) => {
      setSaveStatus('error');
      toast({
        title: "Error",
        description: error.message || "Failed to save KB file",
        variant: "destructive",
      });
      setTimeout(() => setSaveStatus('idle'), 3000);
    },
  });

  // Save agent prompt mutation
  const savePromptMutation = useMutation({
    mutationFn: async ({ agentId, prompt }: { agentId: string; prompt: string }) => {
      return await apiRequest("PATCH", `/api/elevenlabs/agents/${agentId}/prompt`, { prompt });
    },
    onMutate: () => {
      setSaveStatus('saving');
    },
    onSuccess: async () => {
      setSaveStatus('saved');
      const savedContent = content;
      setOriginalContent(savedContent);

      toast({
        title: "Success",
        description: "Agent system prompt updated. Waiting for ElevenLabs sync...",
      });

      // Poll ElevenLabs API until the content matches (with timeout)
      const maxAttempts = 10; // 10 attempts = 30 seconds max
      const delayMs = 3000; // 3 seconds between attempts
      let attempts = 0;
      let synced = false;

      while (attempts < maxAttempts && !synced) {
        attempts++;
        console.log(`[KB Editor] Polling ElevenLabs (attempt ${attempts}/${maxAttempts})...`);

        await new Promise(resolve => setTimeout(resolve, delayMs));

        // Fetch fresh data from ElevenLabs
        const response = await apiRequest("GET", `/api/elevenlabs/agents/${selectedItemId}/details`);
        const freshPrompt = response?.prompt?.prompt || response?.prompt || '';

        console.log('[KB Editor] Fresh prompt length:', freshPrompt.length, 'Expected length:', savedContent.length);

        // Check if the content matches (trim to avoid whitespace issues)
        if (freshPrompt.trim() === savedContent.trim()) {
          synced = true;
          console.log('[KB Editor] ✅ ElevenLabs sync confirmed!');

          // Force cache invalidation with fresh data
          queryClient.setQueryData(['/api/elevenlabs/agents', selectedItemId, 'details'], response);

          toast({
            title: "Synced",
            description: "ElevenLabs confirmed prompt update",
          });
        } else {
          console.log('[KB Editor] ⏳ Still waiting for ElevenLabs to sync...');
        }
      }

      if (!synced) {
        console.warn('[KB Editor] ⚠️ Sync timeout - ElevenLabs may still be processing');
        toast({
          title: "Warning",
          description: "Sync timeout. ElevenLabs may still be processing the update.",
          variant: "default",
        });
      }

      setTimeout(() => setSaveStatus('idle'), 2000);
    },
    onError: (error: any) => {
      setSaveStatus('error');
      toast({
        title: "Error",
        description: error.message || "Failed to update agent prompt",
        variant: "destructive",
      });
      setTimeout(() => setSaveStatus('idle'), 3000);
    },
  });

  const handleSave = () => {
    if (!selectedItemId) return;

    if (editorMode === 'file') {
      saveFileMutation.mutate({ fileId: selectedItemId, newContent: content });
    } else {
      savePromptMutation.mutate({ agentId: selectedItemId, prompt: content });
    }
  };

  const hasUnsavedChanges = content !== originalContent;
  const isLoading = (editorMode === 'file' ? fileLoading : agentLoading);

  // Fuzzy filter files based on search query (word-based matching)
  const filteredFiles = kbFiles.filter((file: any) => {
    if (!fileSearchQuery.trim()) return true;
    
    const searchWords = fileSearchQuery.toLowerCase().split(/\s+/).filter(w => w.length > 0);
    const filename = file.filename.toLowerCase();
    
    // Match if filename contains all search words
    return searchWords.every(word => filename.includes(word));
  });

  // Find and Replace logic
  const findMatches = (): number[] => {
    if (!findQuery) return [];
    
    const matches: number[] = [];
    const searchText = caseSensitive ? content : content.toLowerCase();
    const query = caseSensitive ? findQuery : findQuery.toLowerCase();
    
    let index = searchText.indexOf(query);
    while (index !== -1) {
      matches.push(index);
      index = searchText.indexOf(query, index + 1);
    }
    
    return matches;
  };

  const matches = findMatches();
  const matchCount = matches.length;

  const navigateToMatch = (index: number) => {
    if (matches.length === 0 || !textareaRef) return;
    
    const matchPosition = matches[index];
    textareaRef.focus();
    textareaRef.setSelectionRange(matchPosition, matchPosition + findQuery.length);
    textareaRef.scrollTop = textareaRef.scrollHeight * (matchPosition / content.length);
  };

  const handleNextMatch = () => {
    if (matches.length === 0) return;
    const nextIndex = (currentMatchIndex + 1) % matches.length;
    setCurrentMatchIndex(nextIndex);
    navigateToMatch(nextIndex);
  };

  const handlePreviousMatch = () => {
    if (matches.length === 0) return;
    const prevIndex = currentMatchIndex === 0 ? matches.length - 1 : currentMatchIndex - 1;
    setCurrentMatchIndex(prevIndex);
    navigateToMatch(prevIndex);
  };

  const handleReplace = () => {
    if (matches.length === 0 || !textareaRef) return;
    
    const matchPosition = matches[currentMatchIndex];
    const before = content.substring(0, matchPosition);
    const after = content.substring(matchPosition + findQuery.length);
    const newContent = before + replaceQuery + after;
    
    setContent(newContent);
    
    // After replace, stay at same index (it will point to next match automatically)
    // or wrap to 0 if we were at the last match
    if (currentMatchIndex >= matches.length - 1 && matches.length > 1) {
      setCurrentMatchIndex(0);
    }
  };

  const handleReplaceAll = () => {
    if (matches.length === 0) return;
    
    const searchText = caseSensitive ? content : content.toLowerCase();
    const query = caseSensitive ? findQuery : findQuery.toLowerCase();
    
    let newContent = content;
    if (caseSensitive) {
      newContent = content.replaceAll(findQuery, replaceQuery);
    } else {
      // Case-insensitive replace preserving original case pattern
      const regex = new RegExp(findQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
      newContent = content.replace(regex, replaceQuery);
    }
    
    setContent(newContent);
    setCurrentMatchIndex(0);
    
    toast({
      title: "Replaced All",
      description: `Replaced ${matches.length} occurrence${matches.length !== 1 ? 's' : ''}`,
    });
  };

  // Update current match when find query, content, or match index changes
  useEffect(() => {
    if (findQuery && matches.length > 0) {
      // Clamp index if it's out of bounds after content changes
      const validIndex = Math.min(currentMatchIndex, matches.length - 1);
      if (validIndex !== currentMatchIndex) {
        setCurrentMatchIndex(validIndex);
      } else {
        navigateToMatch(validIndex);
      }
    }
  }, [findQuery, currentMatchIndex, content, caseSensitive]);

  // Sync overlay scroll with textarea scroll
  const handleTextareaScroll = () => {
    if (textareaRef && highlightRef) {
      highlightRef.scrollTop = textareaRef.scrollTop;
      highlightRef.scrollLeft = textareaRef.scrollLeft;
    }
  };

  // Sync overlay position immediately when it appears or matches change
  useEffect(() => {
    if (textareaRef && highlightRef && findQuery && matches.length > 0) {
      highlightRef.scrollTop = textareaRef.scrollTop;
      highlightRef.scrollLeft = textareaRef.scrollLeft;
    }
  }, [highlightRef, textareaRef, findQuery, matches.length]);

  // Reset find/replace when changing files
  useEffect(() => {
    setShowFindReplace(false);
    setFindQuery("");
    setReplaceQuery("");
    setCurrentMatchIndex(0);
  }, [selectedItemId]);

  return (
    <div className={`flex gap-4 ${className || ''}`}>
      {/* Sidebar */}
      <div className="w-64 border-r">
        <div className="p-3 border-b space-y-3">
          <div className="flex gap-2">
            <Button
              variant={editorMode === 'file' ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                setEditorMode('file');
                setSelectedItemId(null);
              }}
              className="flex-1"
              data-testid="button-mode-files"
            >
              <FileText className="h-4 w-4 mr-1" />
              Files
            </Button>
            <Button
              variant={editorMode === 'agent' ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                setEditorMode('agent');
                setSelectedItemId(null);
              }}
              className="flex-1"
              data-testid="button-mode-agents"
            >
              <User className="h-4 w-4 mr-1" />
              Agents
            </Button>
          </div>
          
          {editorMode === 'file' && (
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Filter files..."
                value={fileSearchQuery}
                onChange={(e) => setFileSearchQuery(e.target.value)}
                className="h-8 pl-7 text-xs"
                data-testid="input-file-search"
              />
            </div>
          )}
        </div>

        <ScrollArea className="h-[calc(100vh-300px)]">
          <div className="p-2 space-y-1">
            {editorMode === 'file' ? (
              kbLoading ? (
                <div className="text-center py-8">
                  <Loader2 className="h-4 w-4 animate-spin mx-auto text-muted-foreground" />
                </div>
              ) : filteredFiles.length === 0 ? (
                <div className="text-center py-8 px-2">
                  <p className="text-xs text-muted-foreground">
                    {fileSearchQuery.trim() ? 'No files match your search' : 'No KB files'}
                  </p>
                </div>
              ) : (
                filteredFiles.map((file: any) => {
                  const isEmpty = !file.currentContent || file.currentContent.trim() === '';
                  return (
                    <div key={file.id} className="flex items-center gap-1">
                    <Button
                      variant={selectedItemId === file.id ? 'secondary' : 'ghost'}
                      size="sm"
                      onClick={() => setSelectedItemId(file.id)}
                      className="flex-1 justify-start text-left"
                      data-testid={`button-select-file-${file.id}`}
                    >
                      <FileText className="h-3 w-3 mr-2 flex-shrink-0" />
                      <span className={`truncate text-xs ${isEmpty ? 'bg-pink-100 dark:bg-pink-950/50 px-1 rounded' : ''}`}>
                        {file.filename}
                      </span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 flex-shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        const blob = new Blob([file.currentContent || ''], { type: 'text/plain' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
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
                      data-testid={`button-download-file-${file.id}`}
                      title="Download file"
                    >
                      <Download className="h-3 w-3" />
                    </Button>
                  </div>
                  );
                })
              )
            ) : (
              agentsLoading ? (
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
                    variant={selectedItemId === agent.agent_id ? 'secondary' : 'ghost'}
                    size="sm"
                    onClick={() => setSelectedItemId(agent.agent_id)}
                    className="w-full justify-start text-left"
                    data-testid={`button-select-agent-${agent.agent_id}`}
                  >
                    <User className="h-3 w-3 mr-2 flex-shrink-0" />
                    <span className="truncate text-xs">{agent.name}</span>
                  </Button>
                ))
              )
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Editor */}
      <div className="flex-1 flex flex-col min-w-0">
        {!selectedItemId ? (
          <div className="flex-1 flex items-center justify-center bg-muted/20 rounded-lg">
            <div className="text-center">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">
                Select a {editorMode === 'file' ? 'file' : 'agent'} to edit
              </p>
            </div>
          </div>
        ) : isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="flex items-center justify-between p-3 border-b">
              <div className="flex items-center gap-2">
                {editorMode === 'file' ? (
                  <>
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium text-sm">
                      {kbFiles.find((f: any) => f.id === selectedItemId)?.filename}
                    </span>
                  </>
                ) : (
                  <>
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium text-sm">
                      {agents.find((a: any) => a.agent_id === selectedItemId)?.name} System Prompt
                    </span>
                  </>
                )}
                {hasUnsavedChanges && (
                  <Badge variant="outline" className="text-xs">
                    Unsaved changes
                  </Badge>
                )}
              </div>

              <div className="flex items-center gap-2">
                {saveStatus === 'saved' && (
                  <div className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                    <CheckCircle2 className="h-3 w-3" />
                    Saved
                  </div>
                )}
                {saveStatus === 'error' && (
                  <div className="flex items-center gap-1 text-xs text-destructive">
                    <AlertCircle className="h-3 w-3" />
                    Error
                  </div>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowFindReplace(!showFindReplace)}
                  data-testid="button-toggle-find-replace"
                  title="Find and Replace (Cmd+F)"
                >
                  <Search className="h-3 w-3" />
                </Button>
                <Button
                  size="sm"
                  onClick={handleSave}
                  disabled={!hasUnsavedChanges || saveStatus === 'saving'}
                  data-testid="button-save-editor"
                >
                  {saveStatus === 'saving' ? (
                    <>
                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-3 w-3 mr-1" />
                      Save & Sync
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Find and Replace */}
            {showFindReplace && (
              <div className="border-b bg-muted/20 p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="flex-1 flex items-center gap-2">
                    <Input
                      type="text"
                      placeholder="Find..."
                      value={findQuery}
                      onChange={(e) => {
                        setFindQuery(e.target.value);
                        setCurrentMatchIndex(0);
                      }}
                      className="h-8 text-sm"
                      data-testid="input-find-query"
                    />
                    <Input
                      type="text"
                      placeholder="Replace..."
                      value={replaceQuery}
                      onChange={(e) => setReplaceQuery(e.target.value)}
                      className="h-8 text-sm"
                      data-testid="input-replace-query"
                    />
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setShowFindReplace(false)}
                    data-testid="button-close-find-replace"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handlePreviousMatch}
                        disabled={matchCount === 0}
                        data-testid="button-previous-match"
                      >
                        <ChevronUp className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleNextMatch}
                        disabled={matchCount === 0}
                        data-testid="button-next-match"
                      >
                        <ChevronDown className="h-3 w-3" />
                      </Button>
                      <span className="text-xs text-muted-foreground ml-2">
                        {matchCount > 0 ? `${currentMatchIndex + 1} of ${matchCount}` : 'No matches'}
                      </span>
                    </div>
                    <Separator orientation="vertical" className="h-4" />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setCaseSensitive(!caseSensitive)}
                      className={caseSensitive ? 'bg-accent' : ''}
                      data-testid="button-case-sensitive"
                      title="Case sensitive"
                    >
                      Aa
                    </Button>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleReplace}
                      disabled={matchCount === 0}
                      data-testid="button-replace"
                    >
                      Replace
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleReplaceAll}
                      disabled={matchCount === 0}
                      data-testid="button-replace-all"
                    >
                      Replace All
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Editor Area with Highlights */}
            <div className="flex-1 p-3 relative">
              {/* Highlight overlay */}
              {findQuery && matches.length > 0 && (
                <div 
                  ref={(el) => setHighlightRef(el)}
                  className="absolute inset-3 pointer-events-none overflow-auto whitespace-pre-wrap break-words font-mono text-sm"
                  style={{
                    lineHeight: '1.5',
                    padding: '0.5rem 0.75rem',
                    color: 'transparent',
                    userSelect: 'none',
                  }}
                  data-testid="highlight-overlay"
                >
                  {(() => {
                    let lastIndex = 0;
                    const parts: React.ReactNode[] = [];
                    
                    matches.forEach((matchIndex, idx) => {
                      // Add text before match
                      if (matchIndex > lastIndex) {
                        parts.push(
                          <span key={`text-${idx}`}>
                            {content.substring(lastIndex, matchIndex)}
                          </span>
                        );
                      }
                      
                      // Add highlighted match
                      const isCurrentMatch = idx === currentMatchIndex;
                      parts.push(
                        <mark
                          key={`match-${idx}`}
                          className={isCurrentMatch ? 'bg-yellow-400 dark:bg-yellow-600' : 'bg-yellow-200 dark:bg-yellow-800'}
                          style={{ color: 'transparent' }}
                        >
                          {content.substring(matchIndex, matchIndex + findQuery.length)}
                        </mark>
                      );
                      
                      lastIndex = matchIndex + findQuery.length;
                    });
                    
                    // Add remaining text
                    if (lastIndex < content.length) {
                      parts.push(
                        <span key="text-end">
                          {content.substring(lastIndex)}
                        </span>
                      );
                    }
                    
                    return parts;
                  })()}
                </div>
              )}
              
              {/* Textarea */}
              <Textarea
                ref={(el) => setTextareaRef(el)}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                onScroll={handleTextareaScroll}
                className="w-full h-full resize-none font-mono text-sm relative bg-transparent"
                style={{
                  caretColor: 'auto',
                  color: 'inherit',
                }}
                placeholder={
                  editorMode === 'file'
                    ? "Edit KB file content..."
                    : "Edit agent system prompt..."
                }
                data-testid="textarea-editor-content"
              />
            </div>

            {/* Footer Info */}
            <div className="p-3 border-t bg-muted/20">
              <p className="text-xs text-muted-foreground">
                {editorMode === 'file' ? (
                  <>
                    Changes will create a new version, sync to ElevenLabs, and backup to Google Drive.
                  </>
                ) : (
                  <>
                    Changes will immediately update the agent's system prompt on ElevenLabs.
                  </>
                )}
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}