import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Loader2, FileText, User, Save, AlertCircle, CheckCircle2 } from "lucide-react";
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
    if (editorMode === 'file' && fileData?.currentContent) {
      setContent(fileData.currentContent);
      setOriginalContent(fileData.currentContent);
      setSaveStatus('idle');
    }
  }, [fileData, editorMode]);

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

  // Reset when switching modes or items
  useEffect(() => {
    setContent("");
    setOriginalContent("");
    setSaveStatus('idle');
  }, [editorMode, selectedItemId]);

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
    onSuccess: () => {
      setSaveStatus('saved');
      setOriginalContent(content);
      queryClient.invalidateQueries({ queryKey: ['/api/kb/files'] });
      queryClient.invalidateQueries({ queryKey: ['/api/kb/files', selectedItemId] });
      toast({
        title: "Success",
        description: "KB file saved and synced to ElevenLabs",
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

  return (
    <div className={`flex gap-4 ${className || ''}`}>
      {/* Sidebar */}
      <div className="w-64 border-r">
        <div className="p-3 border-b">
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
        </div>

        <ScrollArea className="h-[calc(100vh-300px)]">
          <div className="p-2 space-y-1">
            {editorMode === 'file' ? (
              kbLoading ? (
                <div className="text-center py-8">
                  <Loader2 className="h-4 w-4 animate-spin mx-auto text-muted-foreground" />
                </div>
              ) : kbFiles.length === 0 ? (
                <div className="text-center py-8 px-2">
                  <p className="text-xs text-muted-foreground">No KB files</p>
                </div>
              ) : (
                kbFiles.map((file: any) => (
                  <Button
                    key={file.id}
                    variant={selectedItemId === file.id ? 'secondary' : 'ghost'}
                    size="sm"
                    onClick={() => setSelectedItemId(file.id)}
                    className="w-full justify-start text-left"
                    data-testid={`button-select-file-${file.id}`}
                  >
                    <FileText className="h-3 w-3 mr-2 flex-shrink-0" />
                    <span className="truncate text-xs">{file.filename}</span>
                  </Button>
                ))
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

            {/* Editor Area */}
            <div className="flex-1 p-3">
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="w-full h-full resize-none font-mono text-sm"
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