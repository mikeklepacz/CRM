import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Key, Upload, FileText, Trash2, Loader2, Save, CheckCircle2, AlertCircle, BookOpen, Bot } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export function OpenAIManagement() {
  const { toast } = useToast();
  const [apiKey, setApiKey] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
  const [activeTab, setActiveTab] = useState("sales-assistant");
  
  // File upload state
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [fileContent, setFileContent] = useState("");
  const [fileName, setFileName] = useState("");
  const [fileCategory, setFileCategory] = useState("scripts");

  // Fetch all assistants
  const { data: assistantsData, isLoading: assistantsLoading } = useQuery({
    queryKey: ['/api/assistants'],
  });

  const assistants = assistantsData?.assistants || [];

  // Fetch OpenAI settings (for API key)
  const { data: settings, isLoading: settingsLoading } = useQuery({
    queryKey: ['/api/openai/settings'],
  });

  // Fetch current assistant details
  const { data: currentAssistantData, isLoading: currentAssistantLoading } = useQuery({
    queryKey: ['/api/assistants', activeTab],
    enabled: !!activeTab,
  });

  const currentAssistant = currentAssistantData?.assistant;
  const currentFiles = currentAssistant?.files || [];

  useEffect(() => {
    if (settings && !showApiKey) {
      setApiKey("");
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

  // Update assistant instructions mutation
  const updateInstructionsMutation = useMutation({
    mutationFn: async ({ id, instructions }: { id: string; instructions: string }) => {
      return await apiRequest("PATCH", `/api/assistants/${id}`, { instructions });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Assistant instructions saved successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/assistants', activeTab] });
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
    mutationFn: async (data: { filename: string; content: string; category: string }) => {
      // First upload to OpenAI (this will be implemented later)
      // For now, just create the file record
      return await apiRequest("POST", `/api/assistants/${currentAssistant.id}/files`, {
        filename: data.filename,
        category: data.category,
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "File uploaded successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/assistants', activeTab] });
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
    mutationFn: async ({ assistantId, fileId }: { assistantId: string; fileId: string }) => {
      return await apiRequest("DELETE", `/api/assistants/${assistantId}/files/${fileId}`);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "File deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/assistants', activeTab] });
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
    if (!currentAssistant) return;
    updateInstructionsMutation.mutate({
      id: currentAssistant.id,
      instructions: currentAssistant.instructions,
    });
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

  if (assistantsLoading || settingsLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* API Key Card - Shared across all assistants */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            OpenAI API Configuration
          </CardTitle>
          <CardDescription>
            Configure your OpenAI API key to enable all AI assistants
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
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
        </CardContent>
      </Card>

      {/* Assistants Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          {assistants.map((assistant: any) => (
            <TabsTrigger 
              key={assistant.slug} 
              value={assistant.slug}
              data-testid={`tab-${assistant.slug}`}
            >
              <Bot className="h-4 w-4 mr-2" />
              {assistant.name}
            </TabsTrigger>
          ))}
        </TabsList>

        {assistants.map((assistant: any) => (
          <TabsContent key={assistant.slug} value={assistant.slug} className="space-y-6">
            {/* Instructions Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  {assistant.name} Instructions
                </CardTitle>
                <CardDescription>
                  {assistant.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {currentAssistantLoading ? (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading...
                  </div>
                ) : (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor={`instructions-${assistant.slug}`}>System Prompt</Label>
                      <Textarea
                        id={`instructions-${assistant.slug}`}
                        value={currentAssistant?.instructions || ""}
                        onChange={(e) => {
                          // Update local state
                          queryClient.setQueryData(['/api/assistants', activeTab], {
                            assistant: {
                              ...currentAssistant,
                              instructions: e.target.value,
                            }
                          });
                        }}
                        rows={12}
                        className="font-mono text-sm"
                        data-testid={`textarea-instructions-${assistant.slug}`}
                      />
                      <p className="text-xs text-muted-foreground">
                        These instructions define how this assistant behaves and responds
                      </p>
                    </div>
                    <Button 
                      onClick={handleSaveInstructions} 
                      disabled={updateInstructionsMutation.isPending}
                      data-testid={`button-save-instructions-${assistant.slug}`}
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
                  </>
                )}
              </CardContent>
            </Card>

            {/* Knowledge Base Card */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      {assistant.name} Knowledge Base
                    </CardTitle>
                    <CardDescription>
                      Files that {assistant.name} can reference when responding
                    </CardDescription>
                  </div>
                  <Button 
                    onClick={() => setUploadDialogOpen(true)}
                    disabled={!settings?.hasApiKey}
                    data-testid={`button-upload-file-${assistant.slug}`}
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
                ) : currentAssistantLoading ? (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading files...
                  </div>
                ) : currentFiles.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No files uploaded yet</p>
                    <p className="text-sm mt-1">Upload documents to enhance this assistant's knowledge</p>
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
                      {currentFiles.map((file: any) => (
                        <TableRow key={file.id} data-testid={`row-file-${file.id}`}>
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
                                  deleteFileMutation.mutate({
                                    assistantId: currentAssistant.id,
                                    fileId: file.id,
                                  });
                                }
                              }}
                              disabled={deleteFileMutation.isPending}
                              data-testid={`button-delete-file-${file.id}`}
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
          </TabsContent>
        ))}
      </Tabs>

      {/* Upload File Dialog */}
      <Dialog open={uploadDialogOpen} onOpenChange={(open) => {
        setUploadDialogOpen(open);
        if (!open) {
          setFileContent("");
          setFileName("");
          setFileCategory("scripts");
        }
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Upload Knowledge Base File</DialogTitle>
            <DialogDescription>
              Add a document to {currentAssistant?.name}'s knowledge base
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Upload File</Label>
              <Input
                type="file"
                accept=".txt,.md"
                onChange={handleFileSelect}
                data-testid="input-file-upload"
              />
              <p className="text-xs text-muted-foreground">
                Supported formats: .txt, .md
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="filename">Filename</Label>
              <Input
                id="filename"
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
                placeholder="e.g., sales-script.txt"
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
                  <SelectItem value="call-data">Call Analysis Data</SelectItem>
                  <SelectItem value="general">General</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setUploadDialogOpen(false)}
              data-testid="button-cancel-upload"
            >
              Cancel
            </Button>
            <Button
              onClick={handleUploadFile}
              disabled={uploadFileMutation.isPending}
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
