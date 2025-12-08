import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Upload, FileText, Trash2, Loader2, Save, Bot, AlertCircle, Sparkles, Info } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";

export function AlignerManagement() {
  const { toast } = useToast();
  const { user } = useAuth();

  // File upload state
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [fileContent, setFileContent] = useState("");
  const [fileName, setFileName] = useState("");
  const [fileCategory, setFileCategory] = useState("call-data");

  // Local state for textarea values to prevent cursor jumping
  const [localInstructions, setLocalInstructions] = useState("");
  const [localTaskPromptTemplate, setLocalTaskPromptTemplate] = useState("");

  // Get tenantId for query key - ensures refetch when tenant changes
  const tenantId = user?.tenantId;

  // Fetch Aligner assistant - include tenantId in query key for proper cache invalidation on tenant switch
  const { data: alignerData, isLoading: alignerLoading } = useQuery({
    queryKey: ['/api/aligner', tenantId],
    enabled: !!tenantId,
  });

  // Fetch OpenAI settings to check if API key is configured
  const { data: settings } = useQuery({
    queryKey: ['/api/openai/settings'],
  });

  const aligner = alignerData?.assistant;
  const alignerFiles = aligner?.files || [];

  // Sync local state when aligner data changes (including tenant switch)
  useEffect(() => {
    if (aligner) {
      setLocalInstructions(aligner.instructions || "");
      setLocalTaskPromptTemplate(aligner.taskPromptTemplate || "");
    }
  }, [aligner?.id, aligner?.instructions, aligner?.taskPromptTemplate]);

  // Update instructions mutation
  const updateInstructionsMutation = useMutation({
    mutationFn: async (instructions: string) => {
      return await apiRequest("PATCH", "/api/aligner/instructions", { instructions });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Aligner instructions saved successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/aligner', tenantId] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save instructions",
        variant: "destructive",
      });
    },
  });

  // Update task prompt template mutation
  const updateTaskPromptMutation = useMutation({
    mutationFn: async (taskPromptTemplate: string) => {
      return await apiRequest("PATCH", "/api/aligner/task-prompt", { taskPromptTemplate });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Task prompt template saved successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/aligner', tenantId] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save task prompt template",
        variant: "destructive",
      });
    },
  });

  // Upload file mutation
  const uploadFileMutation = useMutation({
    mutationFn: async (data: { filename: string; category: string }) => {
      // For now, just create the file record
      // Later this will upload to OpenAI first
      return await apiRequest("POST", "/api/aligner/files", {
        filename: data.filename,
        category: data.category,
        openaiFileId: null,
        fileSize: 0,
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "File uploaded successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/aligner', tenantId] });
      setUploadDialogOpen(false);
      setFileContent("");
      setFileName("");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to upload file",
        variant: "destructive",
      });
    },
  });

  // Delete file mutation
  const deleteFileMutation = useMutation({
    mutationFn: async (fileId: string) => {
      return await apiRequest("DELETE", `/api/aligner/files/${fileId}`);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "File deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/aligner', tenantId] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete file",
        variant: "destructive",
      });
    },
  });

  // Sync KB to OpenAI mutation
  const syncKbMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/aligner/sync-kb");
    },
    onSuccess: (data: any) => {
      toast({
        title: "Sync Complete",
        description: `Successfully synced ${data.synced} KB files to OpenAI. ${data.failed > 0 ? `${data.failed} failed.` : ''}`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/aligner', tenantId] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to sync KB files",
        variant: "destructive",
      });
    },
  });

  const handleSaveInstructions = () => {
    if (!localInstructions.trim()) {
      toast({
        title: "Error",
        description: "Please enter instructions",
        variant: "destructive",
      });
      return;
    }
    updateInstructionsMutation.mutate(localInstructions);
  };

  const handleSaveTaskPrompt = () => {
    if (!localTaskPromptTemplate.trim()) {
      toast({
        title: "Error",
        description: "Please enter task prompt template",
        variant: "destructive",
      });
      return;
    }
    updateTaskPromptMutation.mutate(localTaskPromptTemplate);
  };

  const handleUploadFile = () => {
    if (!fileName) {
      toast({
        title: "Error",
        description: "Please provide a filename",
        variant: "destructive",
      });
      return;
    }
    uploadFileMutation.mutate({
      filename: fileName,
      category: fileCategory,
    });
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFileName(file.name);
      const reader = new FileReader();
      reader.onload = (event) => {
        setFileContent(event.target?.result as string);
      };
      reader.readAsText(file);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (!bytes) return 'N/A';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  // Show loading state when auth is resolving (tenantId not yet available) or when fetching aligner data
  if (!tenantId || alignerLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!aligner) {
    return (
      <div className="flex items-center gap-2 p-4 border rounded-md bg-muted/50">
        <AlertCircle className="h-5 w-5 text-amber-600" />
        <span className="text-sm">Aligner assistant not found. Please check database configuration.</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Instructions Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            Aligner Assistant Instructions
          </CardTitle>
          <CardDescription>
            Configure how the Aligner analyzes call data and proposes knowledge base improvements
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="aligner-instructions">System Prompt</Label>
            <Textarea
              id="aligner-instructions"
              value={localInstructions}
              onChange={(e) => setLocalInstructions(e.target.value)}
              placeholder="You are the Aligner AI, responsible for analyzing call transcripts and insights to propose improvements to the knowledge base.

Your role:
- Analyze call performance data
- Identify patterns and areas for improvement
- Propose knowledge base updates based on real-world conversations"
              rows={12}
              className="font-mono text-sm"
              data-testid="textarea-aligner-instructions"
            />
            <p className="text-xs text-muted-foreground">
              The Aligner uses these instructions when analyzing call performance and generating KB improvement proposals
            </p>
          </div>
          <Button
            onClick={handleSaveInstructions}
            disabled={updateInstructionsMutation.isPending}
            data-testid="button-save-aligner-instructions"
          >
            {updateInstructionsMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Instructions
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Task Prompt Template Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Task Prompt Template
          </CardTitle>
          <CardDescription>
            Template for dynamic task prompts sent to Aligner for each analysis job. Use placeholders like {'{{transcriptContext}}'}, {'{{kbContext}}'}, {'{{wickCoachSection}}'}.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="task-prompt-template">Prompt Template</Label>
            <Textarea
              id="task-prompt-template"
              value={localTaskPromptTemplate}
              onChange={(e) => setLocalTaskPromptTemplate(e.target.value)}
              placeholder="MISSION
Analyze call performance and propose knowledge base improvements.

CONTEXT
Transcript: {{transcriptContext}}
Knowledge Base: {{kbContext}}

INSTRUCTIONS
1. Compare the transcript against knowledge base content
2. Identify gaps, inconsistencies, or opportunities
3. Propose specific, actionable improvements"
              rows={16}
              className="font-mono text-sm"
              data-testid="textarea-task-prompt-template"
            />
            <p className="text-xs text-muted-foreground">
              This template is used for each analysis job. Variables like {'{{transcriptContext}}'} and {'{{kbContext}}'} are replaced with actual data at runtime.
            </p>
          </div>
          <Button
            onClick={handleSaveTaskPrompt}
            disabled={updateTaskPromptMutation.isPending}
            data-testid="button-save-task-prompt"
          >
            {updateTaskPromptMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Template
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Knowledge Base Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Aligner Knowledge Base
              </CardTitle>
              <CardDescription>
                Reference materials the Aligner uses when analyzing calls and proposing changes
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={() => syncKbMutation.mutate()}
                disabled={!settings?.hasApiKey || !aligner?.assistantId || syncKbMutation.isPending}
                variant="outline"
                data-testid="button-sync-kb-to-openai"
              >
                {syncKbMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Syncing...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Sync to OpenAI
                  </>
                )}
              </Button>
              <Button
                onClick={() => setUploadDialogOpen(true)}
                disabled={!settings?.hasApiKey}
                data-testid="button-upload-aligner-file"
              >
                <Upload className="h-4 w-4 mr-2" />
                Upload File
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {aligner?.assistantId && (
            <div className="flex items-center gap-2 p-3 mb-4 border rounded-md bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900">
              <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
              <div className="text-sm text-blue-900 dark:text-blue-100">
                <strong>Connected to OpenAI:</strong> Assistant ID {aligner.assistantId.substring(0, 20)}...
                <br />
                Click "Sync to OpenAI" to upload KB files to this assistant.
              </div>
            </div>
          )}
          {!settings?.hasApiKey ? (
            <div className="flex items-center gap-2 p-4 border rounded-md bg-muted/50">
              <AlertCircle className="h-5 w-5 text-amber-600" />
              <span className="text-sm">Configure your OpenAI API key first in the OpenAI Management section</span>
            </div>
          ) : alignerFiles.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No files uploaded yet</p>
              <p className="text-sm mt-1">Upload call analysis guidelines, objection patterns, or best practices</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Filename</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>Uploaded</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {alignerFiles.map((file: any) => (
                  <TableRow key={file.id} data-testid={`row-aligner-file-${file.id}`}>
                    <TableCell className="font-medium">{file.filename}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{file.category || 'general'}</Badge>
                    </TableCell>
                    <TableCell>{formatFileSize(file.fileSize)}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {file.uploadedAt ? new Date(file.uploadedAt).toLocaleDateString() : 'N/A'}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (confirm(`Delete ${file.filename}?`)) {
                            deleteFileMutation.mutate(file.id);
                          }
                        }}
                        disabled={deleteFileMutation.isPending}
                        data-testid={`button-delete-aligner-file-${file.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Upload File Dialog */}
      <Dialog open={uploadDialogOpen} onOpenChange={(open) => {
        setUploadDialogOpen(open);
        if (!open) {
          setFileContent("");
          setFileName("");
          setFileCategory("call-data");
        }
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Upload Aligner Knowledge Base File</DialogTitle>
            <DialogDescription>
              Add reference materials for call analysis and KB improvement proposals
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Upload File</Label>
              <Input
                type="file"
                accept=".txt,.md"
                onChange={handleFileSelect}
                data-testid="input-aligner-file-upload"
              />
              <p className="text-xs text-muted-foreground">
                Supported formats: .txt, .md
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="aligner-filename">Filename</Label>
              <Input
                id="aligner-filename"
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
                placeholder="e.g., call-analysis-guidelines.txt"
                data-testid="input-aligner-filename"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="aligner-category">Category</Label>
              <Select value={fileCategory} onValueChange={setFileCategory}>
                <SelectTrigger data-testid="select-aligner-category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="call-data">Call Analysis Data</SelectItem>
                  <SelectItem value="objections">Objection Patterns</SelectItem>
                  <SelectItem value="best-practices">Best Practices</SelectItem>
                  <SelectItem value="product-info">Product Information</SelectItem>
                  <SelectItem value="general">General</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setUploadDialogOpen(false)}
              data-testid="button-cancel-aligner-upload"
            >
              Cancel
            </Button>
            <Button
              onClick={handleUploadFile}
              disabled={uploadFileMutation.isPending}
              data-testid="button-confirm-aligner-upload"
              data-primary="true"
            >
              {uploadFileMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Placeholder for Sales Assistant details - if needed elsewhere in the component */}
      {/* The following div is a placeholder and should be removed or adapted if not used */}
      {/* The original code snippet did not include fetch for salesAssistant, so this might be unused */}
      {/* If salesAssistant is intended to be fetched, add a useQuery hook for it */}
      {/* Example: const { data: salesAssistantData } = useQuery({ queryKey: ['/api/sales-assistant'] }); */}
      {/* const salesAssistant = salesAssistantData?.assistant; */}

      {/* The following block was taken from the changes and needs to be placed in the correct context, potentially near the top if it's meant for overall status display */}
      {/* Since it's not related to the Aligner specific logic and the AlignerManagement component's primary focus, */}
      {/* it's commented out here. If it's meant to be part of this component, its placement needs careful consideration. */}
      {/*
      <div className="space-y-2">
        <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
          <div>
            <h4 className="font-semibold">Sales Assistant</h4>
            <p className="text-sm text-muted-foreground">{salesAssistant?.assistantId || 'Not configured'}</p>
          </div>
          <Badge variant="secondary">Used in Store Details</Badge>
        </div>

        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div>
            <h4 className="font-semibold">Aligner</h4>
            <p className="text-sm text-muted-foreground">{alignerAssistant?.assistantId || 'Not configured'}</p>
          </div>
          <Badge variant="secondary">KB Analysis System</Badge>
        </div>
      </div>
      */}
    </div>
  );
}