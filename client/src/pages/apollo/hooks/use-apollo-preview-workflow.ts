import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { extractDomain } from "../constants";
import type { PreviewResult, StoreContact } from "../types";

type ToastFn = (args: { title: string; description?: string; variant?: "default" | "destructive" }) => void;

type UseApolloPreviewWorkflowParams = {
  currentProjectId?: string;
  toast: ToastFn;
};

export function useApolloPreviewWorkflow({ currentProjectId, toast }: UseApolloPreviewWorkflowParams) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const [selectedContact, setSelectedContact] = useState<StoreContact | null>(null);
  const [previewResult, setPreviewResult] = useState<PreviewResult | null>(null);

  const previewMutation = useMutation({
    mutationFn: async ({ domain, companyName }: { domain?: string; companyName?: string }) => (
      apiRequest("POST", "/api/apollo/preview", { domain, companyName })
    ),
    onSuccess: (data) => {
      setPreviewResult(data as PreviewResult);
    },
    onError: (error: any) => {
      toast({ title: "Preview failed", description: error.message, variant: "destructive" });
    },
  });

  const enrichMutation = useMutation({
    mutationFn: async ({
      googleSheetLink,
      domain,
      companyName,
      selectedPersonIds,
    }: {
      googleSheetLink: string;
      domain?: string;
      companyName?: string;
      selectedPersonIds?: string[];
    }) => (
      apiRequest("POST", "/api/apollo/enrich", {
        googleSheetLink,
        domain,
        companyName,
        selectedPersonIds,
        projectId: currentProjectId,
      })
    ),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/apollo/companies"] });
      queryClient.invalidateQueries({ queryKey: ["/api/apollo/settings"] });
      toast({
        title: "Enrichment complete",
        description: `Found ${data.contacts?.length || 0} contacts. Used ${data.creditsUsed || 0} credits.`,
      });
      setPreviewOpen(false);
      setPreviewResult(null);
    },
    onError: (error: any) => {
      toast({ title: "Enrichment failed", description: error.message, variant: "destructive" });
    },
  });

  const handlePreview = (contact: StoreContact) => {
    setSelectedContact(contact);
    setPreviewResult(null);
    setPreviewOpen(true);

    const domain = extractDomain(contact.website);
    previewMutation.mutate({
      domain: domain || undefined,
      companyName: !domain ? contact.name : undefined,
    });
  };

  const handleEnrich = (selectedPersonIds: string[]) => {
    if (!selectedContact) return;

    const domain = extractDomain(selectedContact.website);
    enrichMutation.mutate({
      googleSheetLink: selectedContact.link,
      domain: domain || undefined,
      companyName: !domain ? selectedContact.name : undefined,
      selectedPersonIds,
    });
  };

  return {
    previewOpen,
    setPreviewOpen,
    selectedContact,
    previewResult,
    previewMutation,
    enrichMutation,
    handlePreview,
    handleEnrich,
  };
}
