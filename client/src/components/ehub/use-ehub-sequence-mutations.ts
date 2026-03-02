import { useMutation } from "@tanstack/react-query";
import type { EhubContact } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface UseEhubSequenceMutationsProps {
  currentProjectId?: string;
  deleteSequenceId: string | null;
  selectedSequenceId: string | null;
  setDeleteSequenceId: (value: string | null) => void;
  setIsAddToSequenceDialogOpen: (open: boolean) => void;
  setIsCreateDialogOpen: (open: boolean) => void;
  setIsImportDialogOpen: (open: boolean) => void;
  setIsTestDialogOpen: (open: boolean) => void;
  setName: (value: string) => void;
  setSelectedContacts: (value: EhubContact[]) => void;
  setSelectedSequenceId: (value: string | null) => void;
  setSelectAllMode: (mode: "all" | "none" | "page") => void;
  setSenderEmailAccountId: (value: string | null) => void;
  setSheetId: (value: string) => void;
  setTargetSequenceId: (value: string) => void;
  setTestEmail: (value: string) => void;
  toast: (props: { title: string; description: string; variant?: "default" | "destructive" }) => void;
}

export function useEhubSequenceMutations(props: UseEhubSequenceMutationsProps) {
  const createMutation = useMutation({
    mutationFn: (data: any) =>
      apiRequest("POST", "/api/sequences", {
        ...data,
        projectId: props.currentProjectId,
      }),
    onSuccess: () => {
      props.toast({
        title: "Sequence Created",
        description: "Your email sequence has been created successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/sequences"] });
      props.setIsCreateDialogOpen(false);
      props.setName("");
      props.setSenderEmailAccountId(null);
    },
    onError: (error: any) => {
      props.toast({
        title: "Error",
        description: error.message || "Failed to create sequence",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (sequenceId: string) => apiRequest("DELETE", `/api/sequences/${sequenceId}`),
    onSuccess: (_, sequenceId) => {
      props.toast({
        title: "Sequence Deleted",
        description: "The sequence and all its data have been permanently deleted.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/sequences"] });
      queryClient.invalidateQueries({
        predicate: (query) => query.queryKey[0] === "/api/sequences" && query.queryKey[1] === sequenceId,
      });
      props.setDeleteSequenceId(null);
      if (props.selectedSequenceId === props.deleteSequenceId) {
        props.setSelectedSequenceId(null);
      }
    },
    onError: (error: any) => {
      props.toast({
        title: "Error",
        description: error.message || "Failed to delete sequence",
        variant: "destructive",
      });
    },
  });

  const updateSequenceStatusMutation = useMutation({
    mutationFn: async ({ sequenceId, status }: { sequenceId: string; status: string }) => {
      return await apiRequest("PATCH", `/api/sequences/${sequenceId}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sequences"] });
      queryClient.invalidateQueries({
        predicate: (query) => query.queryKey[0] === "/api/ehub/queue",
      });
      props.toast({
        title: "Success",
        description: "Sequence status updated successfully",
      });
    },
    onError: (error: any) => {
      props.toast({
        title: "Error",
        description: error.message || "Failed to update sequence status",
        variant: "destructive",
      });
    },
  });

  const updateSequenceSenderMutation = useMutation({
    mutationFn: async ({
      sequenceId,
      senderEmailAccountId,
    }: {
      senderEmailAccountId: string | null;
      sequenceId: string;
    }) => {
      return await apiRequest("PATCH", `/api/sequences/${sequenceId}`, { senderEmailAccountId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sequences"] });
      props.toast({
        title: "Saved",
        description: "Sender email updated",
      });
    },
    onError: (error: any) => {
      props.toast({
        title: "Error",
        description: error.message || "Failed to update sender email",
        variant: "destructive",
      });
    },
  });

  const importMutation = useMutation({
    mutationFn: ({ sequenceId, sheetId }: { sequenceId: string; sheetId: string }) =>
      apiRequest("POST", `/api/sequences/${sequenceId}/recipients`, { sheetId }),
    onSuccess: (data: any, variables) => {
      props.toast({
        title: "Import Complete",
        description: `${data.count} recipients imported successfully.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/sequences"] });
      queryClient.invalidateQueries({
        predicate: (query) =>
          query.queryKey[0] === "/api/sequences" &&
          query.queryKey[1] === variables.sequenceId &&
          query.queryKey[2] === "recipients",
      });
      props.setIsImportDialogOpen(false);
      props.setSheetId("");
    },
    onError: (error: any) => {
      props.toast({
        title: "Import Failed",
        description: error.message || "Failed to import recipients",
        variant: "destructive",
      });
    },
  });

  const testSendMutation = useMutation({
    mutationFn: ({ sequenceId, testEmail }: { sequenceId: string; testEmail: string }) =>
      apiRequest("POST", `/api/sequences/${sequenceId}/test-send`, { testEmail }),
    onSuccess: (data: any, variables) => {
      props.toast({
        title: "Test Email Sent",
        description: data.message || `Test email sent to ${variables.testEmail}`,
      });
      props.setIsTestDialogOpen(false);
      props.setTestEmail("");
    },
    onError: (error: any) => {
      props.toast({
        title: "Send Failed",
        description: error.message || "Failed to send test email",
        variant: "destructive",
      });
    },
  });

  const addContactsMutation = useMutation({
    mutationFn: ({
      sequenceId,
      contacts,
      selectAll,
      search,
      statusFilter,
    }: {
      contacts?: EhubContact[];
      search?: string;
      selectAll?: boolean;
      sequenceId: string;
      statusFilter?: string;
    }) =>
      apiRequest("POST", `/api/sequences/${sequenceId}/contacts`, {
        contacts,
        selectAll,
        search,
        statusFilter,
      }),
    onSuccess: (data: any) => {
      props.toast({
        title: "Contacts Added",
        description: `${data.count} contacts added to sequence successfully.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/sequences"] });
      queryClient.invalidateQueries({ queryKey: ["/api/ehub/all-contacts"] });
      props.setSelectedContacts([]);
      props.setSelectAllMode("none");
      props.setIsAddToSequenceDialogOpen(false);
      props.setTargetSequenceId("");
    },
    onError: (error: any) => {
      props.toast({
        title: "Error",
        description: error.message || "Failed to add contacts to sequence",
        variant: "destructive",
      });
    },
  });

  return {
    addContactsMutation,
    createMutation,
    deleteMutation,
    importMutation,
    testSendMutation,
    updateSequenceSenderMutation,
    updateSequenceStatusMutation,
  };
}
