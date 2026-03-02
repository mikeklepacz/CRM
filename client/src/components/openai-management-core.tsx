import { useEffect, useState, type ChangeEvent } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Agent, Category, OpenAIFile, OpenAISettings } from "./openai-management/types";
import { KnowledgeBaseCard } from "./openai-management/knowledge-base-card";
import { AiInstructionsCard } from "./openai-management/ai-instructions-card";
import { ApiConfigCard } from "./openai-management/api-config-card";
import { UploadEditFileDialog } from "./openai-management/upload-edit-file-dialog";

export function OpenAIManagement() {
  const { toast } = useToast();
  const [apiKey, setApiKey] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
  const [aiInstructions, setAiInstructions] = useState("");
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [editingFile, setEditingFile] = useState<OpenAIFile | null>(null);
  const [fileContent, setFileContent] = useState("");
  const [fileName, setFileName] = useState("");
  const [fileCategory, setFileCategory] = useState("scripts");
  const [productCategory, setProductCategory] = useState<string>("");
  const [fileDescription, setFileDescription] = useState("");
  const [selectedAgentId, setSelectedAgentId] = useState<string>("none");

  const { data: settings, isLoading: settingsLoading } = useQuery<OpenAISettings>({
    queryKey: ["/api/openai/settings"],
  });

  const { data: files = [], isLoading: filesLoading } = useQuery<OpenAIFile[]>({
    queryKey: ["/api/openai/files"],
  });

  const { data: categoriesData } = useQuery<{ categories: Category[] }>({
    queryKey: ["/api/categories/active"],
  });
  const categories = categoriesData?.categories || [];

  const { data: agentsData } = useQuery<Agent[]>({
    queryKey: ["/api/elevenlabs/agents"],
  });
  const agents = agentsData || [];

  useEffect(() => {
    if (settings) {
      if (!showApiKey) {
        setApiKey("");
      }
      setAiInstructions(settings.aiInstructions || "");
    }
  }, [settings, showApiKey]);

  const saveApiKeyMutation = useMutation({
    mutationFn: async (key: string) => apiRequest("POST", "/api/openai/settings", { apiKey: key }),
    onSuccess: () => {
      toast({ title: "Success", description: "OpenAI API key saved successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/openai/settings"] });
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

  const saveInstructionsMutation = useMutation({
    mutationFn: async (instructions: string) => apiRequest("POST", "/api/openai/settings", { aiInstructions: instructions }),
    onSuccess: () => {
      toast({ title: "Success", description: "AI instructions saved successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/openai/settings"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save instructions",
        variant: "destructive",
      });
    },
  });

  const uploadFileMutation = useMutation({
    mutationFn: async (data: {
      filename: string;
      content: string;
      category: string;
      productCategory?: string;
      description: string;
      agentId?: string;
    }) => apiRequest("POST", "/api/openai/files/upload", data),
    onSuccess: () => {
      toast({ title: "Success", description: "File uploaded successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/openai/files"] });
      setUploadDialogOpen(false);
      setFileContent("");
      setFileName("");
      setProductCategory("");
      setFileDescription("");
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to upload file", variant: "destructive" });
    },
  });

  const editFileMutation = useMutation({
    mutationFn: async (data: { id: string; category?: string; productCategory?: string; description?: string }) =>
      apiRequest("PUT", `/api/openai/files/${data.id}`, data),
    onSuccess: () => {
      toast({ title: "Success", description: "File updated successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/openai/files"] });
      setUploadDialogOpen(false);
      setEditingFile(null);
      setFileCategory("scripts");
      setProductCategory("");
      setFileDescription("");
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to update file", variant: "destructive" });
    },
  });

  const deleteFileMutation = useMutation({
    mutationFn: async (id: string) => apiRequest("DELETE", `/api/openai/files/${id}`),
    onSuccess: () => {
      toast({ title: "Success", description: "File deleted successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/openai/files"] });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to delete file", variant: "destructive" });
    },
  });

  const handleSaveApiKey = () => {
    if (!apiKey) {
      toast({ title: "Error", description: "Please enter an API key", variant: "destructive" });
      return;
    }
    saveApiKeyMutation.mutate(apiKey);
  };

  const handleSaveInstructions = () => {
    saveInstructionsMutation.mutate(aiInstructions);
  };

  const handleUploadFile = () => {
    if (!fileName || !fileContent) {
      toast({ title: "Error", description: "Please provide filename and content", variant: "destructive" });
      return;
    }

    uploadFileMutation.mutate({
      filename: fileName,
      content: fileContent,
      category: fileCategory,
      productCategory: productCategory || undefined,
      description: fileDescription,
      agentId: selectedAgentId && selectedAgentId !== "none" ? selectedAgentId : undefined,
    });
  };

  const handleEditFile = (file: OpenAIFile) => {
    setEditingFile(file);
    setFileCategory(file.category || "scripts");
    setProductCategory(file.productCategory || "");
    setFileDescription(file.description || "");
    setSelectedAgentId(file.agentId || "none");
    setUploadDialogOpen(true);
  };

  const handleSaveEdit = () => {
    if (!editingFile) return;

    editFileMutation.mutate({
      id: editingFile.id,
      category: fileCategory,
      productCategory: productCategory || undefined,
      description: fileDescription,
    });
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      setFileContent(event.target?.result as string);
    };

    if (file.name.endsWith(".pdf") || file.name.endsWith(".docx")) {
      reader.readAsDataURL(file);
    } else {
      reader.readAsText(file);
    }
  };

  const handleDeleteFile = (id: string, name: string) => {
    if (confirm(`Delete ${name}?`)) {
      deleteFileMutation.mutate(id);
    }
  };

  const handleUploadDialogOpenChange = (open: boolean) => {
    setUploadDialogOpen(open);
    if (!open) {
      setEditingFile(null);
      setFileContent("");
      setFileName("");
      setFileCategory("scripts");
      setProductCategory("");
      setFileDescription("");
      setSelectedAgentId("none");
    }
  };

  return (
    <div className="space-y-6">
      <KnowledgeBaseCard
        hasApiKey={!!settings?.hasApiKey}
        filesLoading={filesLoading}
        files={files}
        deletePending={deleteFileMutation.isPending}
        onOpenUpload={() => setUploadDialogOpen(true)}
        onEditFile={handleEditFile}
        onDeleteFile={handleDeleteFile}
      />

      <AiInstructionsCard
        settingsLoading={settingsLoading}
        aiInstructions={aiInstructions}
        savePending={saveInstructionsMutation.isPending}
        onChangeInstructions={setAiInstructions}
        onSave={handleSaveInstructions}
      />

      <ApiConfigCard
        settingsLoading={settingsLoading}
        hasApiKey={!!settings?.hasApiKey}
        apiKeySuffix={settings?.apiKey?.slice(-4)}
        showApiKey={showApiKey}
        apiKey={apiKey}
        savePending={saveApiKeyMutation.isPending}
        onShowApiKey={setShowApiKey}
        onApiKeyChange={setApiKey}
        onSave={handleSaveApiKey}
      />

      <UploadEditFileDialog
        open={uploadDialogOpen}
        editingFile={editingFile}
        fileContent={fileContent}
        fileName={fileName}
        fileCategory={fileCategory}
        productCategory={productCategory}
        fileDescription={fileDescription}
        selectedAgentId={selectedAgentId}
        categories={categories}
        agents={agents}
        uploadPending={uploadFileMutation.isPending}
        editPending={editFileMutation.isPending}
        onOpenChange={handleUploadDialogOpenChange}
        onFileSelect={handleFileSelect}
        onFileNameChange={setFileName}
        onCategoryChange={setFileCategory}
        onProductCategoryChange={setProductCategory}
        onAgentIdChange={setSelectedAgentId}
        onDescriptionChange={setFileDescription}
        onSubmit={editingFile ? handleSaveEdit : handleUploadFile}
      />
    </div>
  );
}
