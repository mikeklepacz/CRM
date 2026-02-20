import { useState } from "react";
import { apiRequest } from "@/lib/queryClient";
import type { PreviewResult } from "../types";
import { extractDomain } from "../constants";

type ToastFn = (args: { title: string; description?: string; variant?: "default" | "destructive" }) => void;

type UseApolloManualAddParams = {
  currentProjectId?: string;
  toast: ToastFn;
  invalidateApolloQueries: () => void;
};

export function useApolloManualAdd({ currentProjectId, toast, invalidateApolloQueries }: UseApolloManualAddParams) {
  const [manualAddOpen, setManualAddOpen] = useState(false);
  const [manualCompanyName, setManualCompanyName] = useState("");
  const [manualCompanyWebsite, setManualCompanyWebsite] = useState("");
  const [manualPreviewResult, setManualPreviewResult] = useState<PreviewResult | null>(null);
  const [manualPreviewLoading, setManualPreviewLoading] = useState(false);
  const [manualEnriching, setManualEnriching] = useState(false);

  const handleManualAddPreview = async () => {
    if (!manualCompanyName.trim()) {
      toast({ title: "Please enter a company name", variant: "destructive" });
      return;
    }

    setManualPreviewLoading(true);
    setManualPreviewResult(null);

    try {
      const domain = extractDomain(manualCompanyWebsite);
      const response = await apiRequest("POST", "/api/apollo/preview", {
        domain: domain || undefined,
        companyName: !domain ? manualCompanyName : undefined,
      }) as PreviewResult;
      setManualPreviewResult(response);
    } catch (error: any) {
      toast({
        title: "Preview failed",
        description: error.message || "Failed to preview company",
        variant: "destructive",
      });
    }

    setManualPreviewLoading(false);
  };

  const handleManualEnrich = async () => {
    if (!manualPreviewResult?.company) return;

    setManualEnriching(true);

    try {
      const manualLink = `manual:${crypto.randomUUID()}`;
      const domain = extractDomain(manualCompanyWebsite);

      await apiRequest("POST", "/api/apollo/enrich", {
        googleSheetLink: manualLink,
        domain: domain || undefined,
        companyName: !domain ? manualCompanyName : undefined,
        projectId: currentProjectId,
      });

      toast({
        title: "Enrichment complete",
        description: `Successfully enriched contacts for "${manualCompanyName}"`,
      });

      invalidateApolloQueries();
      resetManualDialog();
    } catch (error: any) {
      toast({
        title: "Enrichment failed",
        description: error.message || "Failed to enrich contacts",
        variant: "destructive",
      });
    }

    setManualEnriching(false);
  };

  const resetManualDialog = () => {
    setManualAddOpen(false);
    setManualCompanyName("");
    setManualCompanyWebsite("");
    setManualPreviewResult(null);
  };

  const handleManualDialogClose = (open: boolean) => {
    if (!open && !manualEnriching) {
      resetManualDialog();
    }
  };

  return {
    manualAddOpen,
    setManualAddOpen,
    manualCompanyName,
    setManualCompanyName,
    manualCompanyWebsite,
    setManualCompanyWebsite,
    manualPreviewResult,
    manualPreviewLoading,
    manualEnriching,
    handleManualAddPreview,
    handleManualEnrich,
    handleManualDialogClose,
    resetManualDialog,
  };
}
