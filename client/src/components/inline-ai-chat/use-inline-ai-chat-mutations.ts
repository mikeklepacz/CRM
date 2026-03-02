import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { buildInlineAiContextData } from "@/components/inline-ai-context-data";

export function useInlineAiChatMutations({
  storeContext,
  toast,
  trackerSheetId,
  onStatusChange,
  setSelectedConversationId,
  setNewProjectDialogOpen,
  setNewProjectName,
  setRenameDialogOpen,
  setRenamingConversationId,
  setNewConversationTitle,
}: {
  storeContext: any;
  toast: any;
  trackerSheetId?: string;
  onStatusChange?: (status: string) => void;
  setSelectedConversationId: (id: string | null) => void;
  setNewProjectDialogOpen: (open: boolean) => void;
  setNewProjectName: (name: string) => void;
  setRenameDialogOpen: (open: boolean) => void;
  setRenamingConversationId: (id: string | null) => void;
  setNewConversationTitle: (title: string) => void;
}) {
  const createConversationMutation = useMutation({
    mutationFn: async () => {
      const contextData = buildInlineAiContextData(storeContext) || {};

      return await apiRequest("POST", "/api/conversations", {
        title: storeContext?.name ? `Chat about ${storeContext.name}` : "New Chat",
        contextData,
        projectId: null,
      });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      setSelectedConversationId(data.id);
    },
  });

  const updateConversationContextMutation = useMutation({
    mutationFn: async ({ id, contextData }: { id: string; contextData: any }) => {
      return await apiRequest("PATCH", `/api/conversations/${id}`, { contextData });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      toast({ title: "Context updated", description: "Store information refreshed in conversation" });
    },
  });

  const createProjectMutation = useMutation({
    mutationFn: async (name: string) => {
      return await apiRequest("POST", "/api/projects", { name });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      setNewProjectDialogOpen(false);
      setNewProjectName("");
      toast({ title: "Success", description: "Project created" });
    },
  });

  const deleteProjectMutation = useMutation({
    mutationFn: async (projectId: string) => {
      return await apiRequest("DELETE", `/api/projects/${projectId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      toast({ title: "Success", description: "Project folder deleted" });
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: async ({
      conversationId,
      content,
    }: {
      conversationId: string | null;
      content: string;
    }) => {
      const contextData = buildInlineAiContextData(storeContext);

      return await apiRequest("POST", "/api/openai/chat", {
        message: content,
        conversationId,
        contextData,
      });
    },
  });

  const deleteConversationMutation = useMutation({
    mutationFn: async (conversationId: string) => {
      return await apiRequest("DELETE", `/api/conversations/${conversationId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      setSelectedConversationId(null);
      toast({ title: "Success", description: "Conversation deleted" });
    },
  });

  const moveConversationMutation = useMutation({
    mutationFn: async ({
      conversationId,
      projectId,
    }: {
      conversationId: string;
      projectId: string | null;
    }) => {
      return await apiRequest("POST", `/api/conversations/${conversationId}/move`, {
        projectId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      toast({ title: "Success", description: "Conversation moved" });
    },
  });

  const renameConversationMutation = useMutation({
    mutationFn: async ({
      conversationId,
      title,
    }: {
      conversationId: string;
      title: string;
    }) => {
      return await apiRequest("PATCH", `/api/conversations/${conversationId}`, { title });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      toast({
        title: "Success",
        description: "Conversation renamed successfully",
      });
      setRenameDialogOpen(false);
      setRenamingConversationId(null);
      setNewConversationTitle("");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to rename conversation",
        variant: "destructive",
      });
    },
  });

  const createGmailDraftMutation = useMutation({
    mutationFn: async ({
      to,
      subject,
      body,
      clientLink,
    }: {
      to: string;
      subject: string;
      body: string;
      clientLink?: string | null;
    }) => {
      const draftResult = await apiRequest("POST", "/api/gmail/create-draft", {
        to,
        subject,
        body,
        clientLink: clientLink || null,
      });

      try {
        await apiRequest("POST", "/api/email-drafts", {
          recipientEmail: to,
          subject,
          body,
          clientLink: clientLink || null,
        });
      } catch (error) {
        console.error("Failed to enroll in Manual Follow-Ups:", error);
      }

      return draftResult;
    },
    onSuccess: async (data) => {
      toast({
        title: "Success",
        description: data.message || "Gmail draft created successfully!",
      });
      if (storeContext?.link && trackerSheetId) {
        try {
          await apiRequest("POST", "/api/sheets/tracker/upsert", {
            link: storeContext.link,
            updates: { Status: "Emailed" },
          });
          onStatusChange?.("Emailed");
        } catch (err) {
          console.error("[EmailDraft] Failed to update status to Emailed:", err);
        }
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description:
          error.message ||
          "Failed to create Gmail draft. Make sure Gmail is connected in Settings.",
        variant: "destructive",
      });
    },
  });

  return {
    createConversationMutation,
    updateConversationContextMutation,
    createProjectMutation,
    deleteProjectMutation,
    sendMessageMutation,
    deleteConversationMutation,
    moveConversationMutation,
    renameConversationMutation,
    createGmailDraftMutation,
  };
}
