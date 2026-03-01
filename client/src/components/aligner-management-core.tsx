import { useEffect, useState, type ChangeEvent } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Loader2, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { AlignerInstructionsCard } from "./aligner-management/instructions-card";
import { TaskPromptCard } from "./aligner-management/task-prompt-card";
import { KbCard } from "./aligner-management/kb-card";
import { AlignerUploadDialog } from "./aligner-management/upload-dialog";
import { AlignerAssistant } from "./aligner-management/types";

interface AlignerManagementProps {
  tenantId?: string;
}

export function AlignerManagement({ tenantId }: AlignerManagementProps) {
  const { toast } = useToast();
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileCategory, setFileCategory] = useState("call-data");
  const [localInstructions, setLocalInstructions] = useState("");
  const [localTaskPromptTemplate, setLocalTaskPromptTemplate] = useState("");
  const [localAssistantId, setLocalAssistantId] = useState("");

  const { data: alignerData, isLoading: alignerLoading } = useQuery<any>({
    queryKey: ["/api/aligner", tenantId],
    queryFn: async () => {
      const res = await fetch("/api/aligner", { credentials: "include" });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Failed to fetch aligner");
      }
      return res.json();
    },
    enabled: !!tenantId,
  });

  const { data: settings } = useQuery<{ hasApiKey?: boolean }>({
    queryKey: ["/api/openai/settings"],
  });

  const aligner: AlignerAssistant | undefined = alignerData?.assistant;
  const alignerFiles = aligner?.files || [];

  useEffect(() => {
    if (aligner) {
      setLocalInstructions(aligner.instructions || "");
      setLocalTaskPromptTemplate(aligner.taskPromptTemplate || "");
      setLocalAssistantId(aligner.assistantId || "");
    }
  }, [aligner?.id, aligner?.instructions, aligner?.taskPromptTemplate, aligner?.assistantId]);

  const updateInstructionsMutation = useMutation({
    mutationFn: async (instructions: string) => apiRequest("PATCH", "/api/aligner/instructions", { instructions }),
    onSuccess: () => {
      toast({ title: "Success", description: "Aligner instructions saved successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/aligner", tenantId] });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to save instructions", variant: "destructive" });
    },
  });

  const updateTaskPromptMutation = useMutation({
    mutationFn: async (taskPromptTemplate: string) => apiRequest("PATCH", "/api/aligner/task-prompt", { taskPromptTemplate }),
    onSuccess: () => {
      toast({ title: "Success", description: "Task prompt template saved successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/aligner", tenantId] });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to save task prompt template", variant: "destructive" });
    },
  });

  const updateAssistantIdMutation = useMutation({
    mutationFn: async (assistantId: string) => apiRequest("PATCH", "/api/aligner/assistant-id", { assistantId }),
    onSuccess: () => {
      toast({ title: "Success", description: "Assistant ID saved successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/aligner", tenantId] });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to save assistant ID", variant: "destructive" });
    },
  });

  const uploadFileMutation = useMutation({
    mutationFn: async (data: { file: File; category: string }) => {
      const formData = new FormData();
      formData.append("file", data.file);
      formData.append("category", data.category);
      const res = await fetch("/api/aligner/files", { method: "POST", credentials: "include", body: formData });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to upload file");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Success", description: "File uploaded successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/aligner", tenantId] });
      setUploadDialogOpen(false);
      setSelectedFile(null);
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to upload file", variant: "destructive" });
    },
  });

  const deleteFileMutation = useMutation({
    mutationFn: async (fileId: string) => apiRequest("DELETE", `/api/aligner/files/${fileId}`),
    onSuccess: () => {
      toast({ title: "Success", description: "File deleted successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/aligner", tenantId] });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to delete file", variant: "destructive" });
    },
  });

  const syncKbMutation = useMutation({
    mutationFn: async () => apiRequest("POST", "/api/aligner/sync-kb"),
    onSuccess: (data: any) => {
      const message =
        data.resynced > 0
          ? `Re-synced ${data.resynced} files to OpenAI. ${data.alreadySynced} already synced. ${data.failed > 0 ? `${data.failed} failed.` : ""}`
          : `All ${data.totalInDb} files already synced to OpenAI vector store.`;
      toast({ title: "Sync Complete", description: message, variant: data.failed > 0 ? "destructive" : "default" });
      queryClient.invalidateQueries({ queryKey: ["/api/aligner", tenantId] });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to sync KB files", variant: "destructive" });
    },
  });

  const handleSaveInstructions = () => {
    if (!localInstructions.trim()) {
      toast({ title: "Error", description: "Please enter instructions", variant: "destructive" });
      return;
    }
    updateInstructionsMutation.mutate(localInstructions);
  };

  const handleSaveTaskPrompt = () => {
    if (!localTaskPromptTemplate.trim()) {
      toast({ title: "Error", description: "Please enter task prompt template", variant: "destructive" });
      return;
    }
    updateTaskPromptMutation.mutate(localTaskPromptTemplate);
  };

  const handleUploadFile = () => {
    if (!selectedFile) {
      toast({ title: "Error", description: "Please select a file", variant: "destructive" });
      return;
    }
    uploadFileMutation.mutate({ file: selectedFile, category: fileCategory });
  };

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setSelectedFile(file);
  };

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
      <AlignerInstructionsCard
        value={localInstructions}
        isPending={updateInstructionsMutation.isPending}
        onChange={setLocalInstructions}
        onSave={handleSaveInstructions}
      />

      <TaskPromptCard
        value={localTaskPromptTemplate}
        isPending={updateTaskPromptMutation.isPending}
        onChange={setLocalTaskPromptTemplate}
        onSave={handleSaveTaskPrompt}
      />

      <KbCard
        settingsHasApiKey={!!settings?.hasApiKey}
        aligner={aligner}
        alignerFiles={alignerFiles}
        localAssistantId={localAssistantId}
        syncPending={syncKbMutation.isPending}
        updateAssistantPending={updateAssistantIdMutation.isPending}
        deletePending={deleteFileMutation.isPending}
        onSyncKb={() => syncKbMutation.mutate()}
        onOpenUpload={() => setUploadDialogOpen(true)}
        onAssistantIdChange={setLocalAssistantId}
        onSaveAssistantId={() => updateAssistantIdMutation.mutate(localAssistantId)}
        onDeleteFile={(fileId, filename) => {
          if (confirm(`Delete ${filename}?`)) {
            deleteFileMutation.mutate(fileId);
          }
        }}
      />

      <AlignerUploadDialog
        open={uploadDialogOpen}
        selectedFile={selectedFile}
        fileCategory={fileCategory}
        uploadPending={uploadFileMutation.isPending}
        onOpenChange={(open) => {
          setUploadDialogOpen(open);
          if (!open) {
            setSelectedFile(null);
            setFileCategory("call-data");
          }
        }}
        onFileSelect={handleFileSelect}
        onCategoryChange={setFileCategory}
        onUpload={handleUploadFile}
      />
    </div>
  );
}
