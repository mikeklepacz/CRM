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
import { Key, Upload, FileText, Trash2, Loader2, Save, CheckCircle2, AlertCircle, BookOpen } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export function OpenAIManagement() {
  const { toast } = useToast();
  const [apiKey, setApiKey] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
  const [aiInstructions, setAiInstructions] = useState("");
  
  // File upload state
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [fileContent, setFileContent] = useState("");
  const [fileName, setFileName] = useState("");
  const [fileCategory, setFileCategory] = useState("scripts");
  const [fileDescription, setFileDescription] = useState("");

  // Fetch OpenAI settings
  const { data: settings, isLoading: settingsLoading } = useQuery({
    queryKey: ['/api/openai/settings'],
  });

  // Fetch knowledge base files
  const { data: files = [], isLoading: filesLoading } = useQuery({
    queryKey: ['/api/openai/files'],
  });

  useEffect(() => {
    if (settings) {
      if (!showApiKey) {
        setApiKey("");
      }
      setAiInstructions(settings.aiInstructions || "");
    }
  }, [settings, showApiKey]);

  // Save API key mutation
  const saveApiKeyMutation = useMutation({
    mutationFn: async (key: string) => {
      return await apiRequest("POST", "/api/openai/settings", { apiKey: key });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "OpenAI API key saved successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/openai/settings'] });
      setApiKey("");
      setShowApiKey(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save API key",
        variant: "destructive",
      });
    },
  });

  // Save instructions mutation
  const saveInstructionsMutation = useMutation({
    mutationFn: async (instructions: string) => {
      return await apiRequest("POST", "/api/openai/settings", { aiInstructions: instructions });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "AI instructions saved successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/openai/settings'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save instructions",
        variant: "destructive",
      });
    },
  });

  // Upload file mutation
  const uploadFileMutation = useMutation({
    mutationFn: async (data: { filename: string; content: string; category: string; description: string }) => {
      return await apiRequest("POST", "/api/openai/files/upload", data);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "File uploaded successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/openai/files'] });
      setUploadDialogOpen(false);
      setFileContent("");
      setFileName("");
      setFileDescription("");
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
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/openai/files/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "File deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/openai/files'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete file",
        variant: "destructive",
      });
    },
  });

  const handleSaveApiKey = () => {
    if (!apiKey) {
      toast({
        title: "Error",
        description: "Please enter an API key",
        variant: "destructive",
      });
      return;
    }
    saveApiKeyMutation.mutate(apiKey);
  };

  const handleSaveInstructions = () => {
    saveInstructionsMutation.mutate(aiInstructions);
  };

  const handleUploadFile = () => {
    if (!fileName || !fileContent) {
      toast({
        title: "Error",
        description: "Please provide filename and content",
        variant: "destructive",
      });
      return;
    }
    uploadFileMutation.mutate({
      filename: fileName,
      content: fileContent,
      category: fileCategory,
      description: fileDescription,
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
      
      // Handle different file types
      if (file.name.endsWith('.pdf') || file.name.endsWith('.docx')) {
        // For binary files, read as base64
        reader.readAsDataURL(file);
      } else {
        // For text files, read as text
        reader.readAsText(file);
      }
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="space-y-6">
      {/* Card 1: Knowledge Base */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Knowledge Base
              </CardTitle>
              <CardDescription>
                Upload sales scripts, objection handlers, and product information
              </CardDescription>
            </div>
            <Button 
              onClick={() => setUploadDialogOpen(true)}
              disabled={!settings?.hasApiKey}
              data-testid="button-upload-file"
            >
              <Upload className="h-4 w-4 mr-2" />
              Upload File
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {!settings?.hasApiKey ? (
            <div className="flex items-center gap-2 p-4 border rounded-md bg-muted/50">
              <AlertCircle className="h-5 w-5 text-amber-600" />
              <span className="text-sm">Configure your API key first to upload files</span>
            </div>
          ) : filesLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading files...
            </div>
          ) : files.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No files uploaded yet</p>
              <p className="text-sm mt-1">Upload sales scripts and resources to get started</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Filename</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>Uploaded</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {files.map((file: any) => {
                  const getStatusBadge = (status: string) => {
                    switch (status) {
                      case 'uploading':
                        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200"><Loader2 className="h-3 w-3 mr-1 animate-spin inline" />Uploading</Badge>;
                      case 'processing':
                        return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200"><Loader2 className="h-3 w-3 mr-1 animate-spin inline" />Processing</Badge>;
                      case 'ready':
                        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200"><CheckCircle2 className="h-3 w-3 mr-1 inline" />Ready</Badge>;
                      case 'failed':
                        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200"><AlertCircle className="h-3 w-3 mr-1 inline" />Failed</Badge>;
                      default:
                        return <Badge variant="secondary">{status}</Badge>;
                    }
                  };

                  return (
                    <TableRow key={file.id}>
                      <TableCell className="font-medium">{file.originalName}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{file.category}</Badge>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(file.processingStatus || 'ready')}
                      </TableCell>
                      <TableCell>{formatFileSize(file.fileSize)}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(file.uploadedAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            if (confirm(`Delete ${file.originalName}?`)) {
                              deleteFileMutation.mutate(file.id);
                            }
                          }}
                          disabled={deleteFileMutation.isPending}
                          data-testid={`button-delete-file-${file.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Card 2: Instructions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            AI Instructions
          </CardTitle>
          <CardDescription>
            Configure the AI assistant's personality and behavior
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {settingsLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading...
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="ai-instructions">System Prompt</Label>
                <Textarea
                  id="ai-instructions"
                  value={aiInstructions}
                  onChange={(e) => setAiInstructions(e.target.value)}
                  placeholder="You are the 'Hemp-Wick Sales Assistant' for Natural Materials Unlimited.
Your role is to teach sales reps how to sell hemp wick intelligently.

Core truths:
- All hemp wick is made in Poland.
- Single beeswax formula only.
- 3-hour self-dispensing roll.
- World's largest white-label manufacturer.

Rules:
- Speak in clear, direct English.
- No emojis, no marketing fluff.
- When uncertain, list assumptions.
- Always give concrete examples."
                  rows={12}
                  className="font-mono text-sm"
                  data-testid="textarea-instructions"
                />
                <p className="text-xs text-muted-foreground">
                  These instructions will be used as the system message for every chat request
                </p>
              </div>
              <Button 
                onClick={handleSaveInstructions} 
                disabled={saveInstructionsMutation.isPending}
                data-testid="button-save-instructions"
              >
                {saveInstructionsMutation.isPending ? (
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
            </>
          )}
        </CardContent>
      </Card>

      {/* Card 3: API Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            OpenAI API Configuration
          </CardTitle>
          <CardDescription>
            Configure your OpenAI API key to enable the Sales Assistant
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {settingsLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading settings...
            </div>
          ) : (
            <div className="space-y-4">
              {settings?.hasApiKey && !showApiKey ? (
                <div className="flex items-center gap-2 p-4 border rounded-md bg-muted/50">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  <span className="text-sm">API key is configured (ending in ...{settings.apiKey?.slice(-4)})</span>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="ml-auto"
                    onClick={() => setShowApiKey(true)}
                    data-testid="button-change-api-key"
                  >
                    Change Key
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="api-key">OpenAI API Key</Label>
                  <div className="flex gap-2">
                    <Input
                      id="api-key"
                      type="password"
                      placeholder="sk-..."
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      data-testid="input-api-key"
                    />
                    <Button 
                      onClick={handleSaveApiKey} 
                      disabled={saveApiKeyMutation.isPending}
                      data-testid="button-save-api-key"
                    >
                      {saveApiKeyMutation.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-2" />
                          Save
                        </>
                      )}
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Get your API key from{" "}
                    <a 
                      href="https://platform.openai.com/api-keys" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      OpenAI Platform
                    </a>
                  </p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upload File Dialog */}
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Upload Knowledge Base File</DialogTitle>
            <DialogDescription>
              Add sales scripts, product info, or objection handlers to help agents
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Upload File</Label>
              <Input
                type="file"
                accept=".txt,.md,.pdf,.docx"
                onChange={handleFileSelect}
                data-testid="input-file-upload"
              />
              <p className="text-xs text-muted-foreground">
                Supported formats: .txt, .md, .pdf, .docx
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="filename">Filename</Label>
              <Input
                id="filename"
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
                placeholder="e.g., cold-call-script.txt"
                data-testid="input-filename"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select value={fileCategory} onValueChange={setFileCategory}>
                <SelectTrigger data-testid="select-category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="scripts">Sales Scripts</SelectItem>
                  <SelectItem value="objections">Objection Handlers</SelectItem>
                  <SelectItem value="product-info">Product Information</SelectItem>
                  <SelectItem value="best-practices">Best Practices</SelectItem>
                  <SelectItem value="general">General</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                value={fileDescription}
                onChange={(e) => setFileDescription(e.target.value)}
                placeholder="Brief description of what this file contains..."
                rows={3}
                data-testid="input-description"
              />
            </div>

            {fileContent && !fileName.endsWith('.pdf') && !fileName.endsWith('.docx') && (
              <div className="space-y-2">
                <Label>File Preview</Label>
                <div className="border rounded-md p-3 bg-muted/50 max-h-48 overflow-y-auto">
                  <pre className="text-xs whitespace-pre-wrap">{fileContent.slice(0, 500)}{fileContent.length > 500 && '...'}</pre>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUploadDialogOpen(false)} data-testid="button-cancel-upload">
              Cancel
            </Button>
            <Button 
              onClick={handleUploadFile} 
              disabled={uploadFileMutation.isPending || !fileName || !fileContent}
              data-testid="button-confirm-upload"
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
    </div>
  );
}
