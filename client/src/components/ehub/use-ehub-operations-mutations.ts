import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface UseEhubOperationsMutationsProps {
  nukeEmailPattern: string;
  selectedSequenceId: string | null;
  setBulkDeleteConfirmDialogOpen: (open: boolean) => void;
  setFollowUpBody: (value: string) => void;
  setFollowUpDialogOpen: (open: boolean) => void;
  setFollowUpSubject: (value: string) => void;
  setNukeConfirmText: (value: string) => void;
  setNukeCounts: (
    value: {
      messagesCount: number;
      recipientsCount: number;
      slotsCount: number;
      testEmailsCount: number;
    } | null,
  ) => void;
  setNukeDialogOpen: (open: boolean) => void;
  setNukeEmailPattern: (value: string) => void;
  setRecipientSelectAll: (value: boolean) => void;
  setReplyScannerDialogOpen: (open: boolean) => void;
  setScanPreviewResults: (value: any) => void;
  setSelectedRecipientIds: (value: Set<string>) => void;
  setSelectedScanEmails: (value: Set<string>) => void;
  setSelectedTestEmailId: (value: string | null) => void;
  setSyntheticPreview: (value: Array<{ body: string; stepNumber: number; subject: string }> | null) => void;
  setSyntheticStoreContext: (
    value: {
      link: string | null;
      name: string;
      salesSummary: string | null;
      state: string | null;
      timezone: string;
    } | null,
  ) => void;
  setTestBody: (value: string) => void;
  setTestRecipientEmail: (value: string) => void;
  setTestSubject: (value: string) => void;
  toast: (props: { title: string; description: string; variant?: "default" | "destructive" }) => void;
}

export function useEhubOperationsMutations(props: UseEhubOperationsMutationsProps) {
  const scanRepliesMutation = useMutation({
    mutationFn: async ({ dryRun, selectedEmails }: { dryRun: boolean; selectedEmails?: string[] }) => {
      return await apiRequest("POST", `/api/ehub/scan-replies`, { dryRun, selectedEmails });
    },
    onSuccess: (data: any) => {
      if (data.dryRun) {
        props.setScanPreviewResults(data);
        const enrollable = data.details
          .filter((d: any) => d.status === "newly_enrolled" || d.status === "promoted")
          .map((d: any) => d.email);
        props.setSelectedScanEmails(new Set(enrollable));
      } else {
        queryClient.invalidateQueries({ queryKey: ["/api/sequences"] });
        queryClient.invalidateQueries({
          predicate: (query) => query.queryKey[0] === "/api/ehub/queue",
        });
        queryClient.invalidateQueries({
          predicate: (query) => query.queryKey[0] === "/api/sequences" && query.queryKey[2] === "recipients",
        });

        const newEnrolled = data.newEnrollments || 0;
        const promoted = data.promoted || 0;

        props.toast({
          title: "Enrollment Complete",
          description: `Enrolled ${newEnrolled} new contacts at Step 0. Promoted ${promoted} to Step 1 for AI follow-ups.`,
        });
        props.setReplyScannerDialogOpen(false);
        props.setScanPreviewResults(null);
      }
    },
    onError: (error: any) => {
      props.toast({
        title: "Error",
        description: error.message || "Failed to scan for replies",
        variant: "destructive",
      });
    },
  });

  const sendTestEmailMutation = useMutation({
    mutationFn: (payload: { body: string; recipientEmail: string; subject: string }) => apiRequest("POST", "/api/test-email/send", payload),
    onSuccess: () => {
      props.toast({
        title: "Test Email Sent",
        description: "Your test email has been sent successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/test-email/history"] });
      props.setTestRecipientEmail("");
      props.setTestSubject("");
      props.setTestBody("");
    },
    onError: (error: any) => {
      if (error.status === 429) {
        props.toast({
          title: "Rate Limit Exceeded",
          description: "Maximum 10 test emails per hour. Please wait before sending another.",
          variant: "destructive",
        });
      } else {
        props.toast({
          title: "Send Failed",
          description: error.message || "Unable to send test email",
          variant: "destructive",
        });
      }
    },
  });

  const checkReplyMutation = useMutation({
    mutationFn: (id: string) => apiRequest("GET", `/api/test-email/check-reply/${id}`),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/test-email/history"] });
      props.toast({
        title: data.hasReply ? "Reply Detected" : "No Reply Yet",
        description: data.hasReply
          ? `Found ${data.replyCount} ${data.replyCount === 1 ? "reply" : "replies"}`
          : "This email has not received any replies.",
      });
    },
    onError: (error: any) => {
      props.toast({
        title: "Check Failed",
        description: error.message || "Unable to check for replies",
        variant: "destructive",
      });
    },
  });

  const sendFollowUpMutation = useMutation({
    mutationFn: ({ id, subject, body }: { body: string; id: string; subject: string }) =>
      apiRequest("POST", `/api/test-email/send-followup/${id}`, { subject, body }),
    onSuccess: () => {
      props.toast({
        title: "Follow-up Sent",
        description: "Your threaded follow-up has been sent successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/test-email/history"] });
      props.setFollowUpDialogOpen(false);
      props.setSelectedTestEmailId(null);
      props.setFollowUpSubject("");
      props.setFollowUpBody("");
    },
    onError: (error: any) => {
      props.toast({
        title: "Follow-up Failed",
        description: error.message || "Unable to send follow-up",
        variant: "destructive",
      });
    },
  });

  const syntheticTestMutation = useMutation({
    mutationFn: () => apiRequest("POST", `/api/ehub/sequences/${props.selectedSequenceId}/synthetic-test`),
    onSuccess: (data: any) => {
      props.setSyntheticPreview(data.emails);
      props.setSyntheticStoreContext(data.storeContext);
      props.toast({
        title: "Test Sequence Generated",
        description: `Generated ${data.emails.length} email previews using: ${data.storeContext.name}`,
      });
    },
    onError: (error: any) => {
      props.toast({
        title: "Test Generation Failed",
        description: error.message || "Unable to generate synthetic emails",
        variant: "destructive",
      });
    },
  });

  const bulkDeleteRecipientsMutation = useMutation({
    mutationFn: (recipientIds: string[]) => apiRequest("POST", "/api/ehub/recipients/bulk-delete", { recipientIds }),
    onSuccess: (data: any) => {
      props.toast({
        title: "Recipients Deleted",
        description: `Deleted ${data.deleted} recipient(s)${data.failed > 0 ? ` (${data.failed} failed)` : ""}.`,
      });
      queryClient.invalidateQueries({
        predicate: (query) => query.queryKey[0] === "/api/sequences" && query.queryKey[2] === "recipients",
      });
      props.setSelectedRecipientIds(new Set());
      props.setRecipientSelectAll(false);
      props.setBulkDeleteConfirmDialogOpen(false);
    },
    onError: (error: any) => {
      props.toast({
        title: "Error",
        description: error.message || "Failed to delete recipients",
        variant: "destructive",
      });
    },
  });

  const nukeTestDataMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/ehub/test-data/nuke", { emailPattern: props.nukeEmailPattern || undefined }),
    onSuccess: (data: any) => {
      props.toast({
        title: "Test Data Deleted",
        description: `Deleted ${data.recipientsDeleted} recipients, ${data.messagesDeleted} messages, ${data.slotsDeleted || 0} slots, and ${data.testEmailsDeleted} test emails.`,
      });
      props.setNukeDialogOpen(false);
      props.setNukeCounts(null);
      props.setNukeEmailPattern("");
      props.setNukeConfirmText("");
      queryClient.invalidateQueries({ queryKey: ["/api/test-email/history"] });
      queryClient.invalidateQueries({ queryKey: ["/api/sequences"] });
      queryClient.invalidateQueries({ queryKey: ["/api/ehub/all-contacts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/ehub/queue"] });
      queryClient.invalidateQueries({ queryKey: ["/api/ehub/paused-recipients"] });
      queryClient.invalidateQueries({ queryKey: ["/api/ehub/scheduled-sends"] });
      props.setNukeDialogOpen(false);
    },
    onError: (error: any) => {
      props.toast({
        title: "Delete Failed",
        description: error.message || "Unable to delete test data",
        variant: "destructive",
      });
    },
  });

  return {
    bulkDeleteRecipientsMutation,
    checkReplyMutation,
    nukeTestDataMutation,
    scanRepliesMutation,
    sendFollowUpMutation,
    sendTestEmailMutation,
    syntheticTestMutation,
  };
}
