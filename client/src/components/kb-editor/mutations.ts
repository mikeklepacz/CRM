import { useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { EditorMode, SaveStatus } from "./types";

interface ToastApi {
  (input: { title: string; description: string; variant?: "default" | "destructive" }): void;
}

interface UseKBEditorMutationsParams {
  kbFiles: any[];
  selectedItemId: string | null;
  content: string;
  editorMode: EditorMode;
  setSaveStatus: (status: SaveStatus) => void;
  setOriginalContent: (value: string) => void;
  toast: ToastApi;
}

export function useKBEditorMutations({
  kbFiles,
  selectedItemId,
  content,
  editorMode,
  setSaveStatus,
  setOriginalContent,
  toast,
}: UseKBEditorMutationsParams) {
  const saveFileMutation = useMutation({
    mutationFn: async ({ fileId, newContent }: { fileId: string; newContent: string }) => {
      const file = kbFiles.find((f: any) => f.id === fileId);
      if (!file) throw new Error("File not found");

      return await apiRequest("PATCH", `/api/kb/files/${fileId}`, { content: newContent });
    },
    onMutate: () => {
      setSaveStatus("saving");
    },
    onSuccess: (data: any) => {
      setSaveStatus("saved");
      setOriginalContent(content);
      queryClient.invalidateQueries({ queryKey: ["/api/kb/files"] });
      queryClient.invalidateQueries({ queryKey: ["/api/kb/files", selectedItemId] });

      const agentsUpdated = data?.agentsUpdated;
      const description = agentsUpdated
        ? `Saved and synced to ElevenLabs (${agentsUpdated} agent${agentsUpdated !== 1 ? "s" : ""} updated)`
        : "KB file saved and synced to ElevenLabs";

      toast({ title: "Success", description });
      setTimeout(() => setSaveStatus("idle"), 2000);
    },
    onError: (error: any) => {
      setSaveStatus("error");
      toast({
        title: "Error",
        description: error.message || "Failed to save KB file",
        variant: "destructive",
      });
      setTimeout(() => setSaveStatus("idle"), 3000);
    },
  });

  const savePromptMutation = useMutation({
    mutationFn: async ({ agentId, prompt }: { agentId: string; prompt: string }) => {
      return await apiRequest("PATCH", `/api/elevenlabs/agents/${agentId}/prompt`, { prompt });
    },
    onMutate: () => {
      setSaveStatus("saving");
    },
    onSuccess: async () => {
      setSaveStatus("saved");
      const savedContent = content;
      setOriginalContent(savedContent);

      toast({
        title: "Success",
        description: "Agent system prompt updated. Waiting for ElevenLabs sync...",
      });

      const maxAttempts = 10;
      const delayMs = 3000;
      let attempts = 0;
      let synced = false;

      while (attempts < maxAttempts && !synced) {
        attempts++;
        console.log(`[KB Editor] Polling ElevenLabs (attempt ${attempts}/${maxAttempts})...`);

        await new Promise((resolve) => setTimeout(resolve, delayMs));

        const response = await apiRequest("GET", `/api/elevenlabs/agents/${selectedItemId}/details`);
        const freshPrompt = response?.prompt?.prompt || response?.prompt || "";

        console.log("[KB Editor] Fresh prompt length:", freshPrompt.length, "Expected length:", savedContent.length);

        if (freshPrompt.trim() === savedContent.trim()) {
          synced = true;
          console.log("[KB Editor] ✅ ElevenLabs sync confirmed!");

          queryClient.setQueryData(["/api/elevenlabs/agents", selectedItemId, "details"], response);

          toast({
            title: "Synced",
            description: "ElevenLabs confirmed prompt update",
          });
        } else {
          console.log("[KB Editor] ⏳ Still waiting for ElevenLabs to sync...");
        }
      }

      if (!synced) {
        console.warn("[KB Editor] ⚠️ Sync timeout - ElevenLabs may still be processing");
        toast({
          title: "Warning",
          description: "Sync timeout. ElevenLabs may still be processing the update.",
          variant: "default",
        });
      }

      setTimeout(() => setSaveStatus("idle"), 2000);
    },
    onError: (error: any) => {
      setSaveStatus("error");
      toast({
        title: "Error",
        description: error.message || "Failed to update agent prompt",
        variant: "destructive",
      });
      setTimeout(() => setSaveStatus("idle"), 3000);
    },
  });

  const handleSave = () => {
    if (!selectedItemId) return;
    if (editorMode === "file") {
      saveFileMutation.mutate({ fileId: selectedItemId, newContent: content });
    } else {
      savePromptMutation.mutate({ agentId: selectedItemId, prompt: content });
    }
  };

  return {
    handleSave,
  };
}
