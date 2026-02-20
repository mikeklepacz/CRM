import { useMemo, useState } from "react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { StoreContact } from "../types";

type ToastFn = (args: { title: string; description?: string; variant?: "default" | "destructive" }) => void;

type UseApolloLeadsWorkflowParams = {
  storeContacts: StoreContact[];
  searchQuery: string;
  enrichedCompanies: Array<{
    enrichmentStatus?: string | null;
    contactCount?: number | null;
    googleSheetLink: string;
  }>;
  enrichmentStatus?: Record<string, string | null>;
  selectedLinks: Set<string>;
  setSelectedLinks: (links: Set<string>) => void;
  currentProjectId?: string;
  toast: ToastFn;
};

export function useApolloLeadsWorkflow({
  storeContacts,
  searchQuery,
  enrichedCompanies,
  enrichmentStatus,
  selectedLinks,
  setSelectedLinks,
  currentProjectId,
  toast,
}: UseApolloLeadsWorkflowParams) {
  const [isPrescreening, setIsPrescreening] = useState(false);
  const [prescreenProgress, setPrescreenProgress] = useState({ current: 0, total: 0 });
  const [prescreenStats, setPrescreenStats] = useState<{ checked: number; found: number; notFound: number } | null>(null);

  const filteredContacts = useMemo(() => {
    if (!searchQuery) return storeContacts;
    const query = searchQuery.toLowerCase();
    return storeContacts.filter((contact) => (
      contact.name?.toLowerCase().includes(query)
      || contact.email?.toLowerCase().includes(query)
      || contact.state?.toLowerCase().includes(query)
    ));
  }, [storeContacts, searchQuery]);

  const failedEnrichmentLinks = useMemo(() => new Set(
    enrichedCompanies
      .filter((c) => c.enrichmentStatus === "enriched" && (c.contactCount || 0) === 0)
      .map((c) => c.googleSheetLink),
  ), [enrichedCompanies]);

  const notEnrichedContacts = useMemo(() => filteredContacts.filter((c) => {
    const status = enrichmentStatus?.[c.link];
    if (failedEnrichmentLinks.has(c.link)) return true;
    if (!status) return true;
    const normalizedStatus = status.toLowerCase();
    const blockedStatuses = new Set(["enriched", "not_found", "archived", "retired"]);
    return !blockedStatuses.has(normalizedStatus);
  }), [filteredContacts, enrichmentStatus, failedEnrichmentLinks]);

  const contactsNeedingPrescreen = useMemo(() => notEnrichedContacts.filter((c) => {
    const status = enrichmentStatus?.[c.link];
    return !status || status !== "prescreened";
  }), [notEnrichedContacts, enrichmentStatus]);

  const handlePrescreenAll = async () => {
    const contactsToPrescreen = contactsNeedingPrescreen;
    if (contactsToPrescreen.length === 0) {
      toast({ title: "No contacts to pre-screen", variant: "destructive" });
      return;
    }

    setIsPrescreening(true);
    setPrescreenProgress({ current: 0, total: contactsToPrescreen.length });
    setPrescreenStats(null);

    try {
      const response = await apiRequest("POST", "/api/apollo/bulk-prescreen", {
        contacts: contactsToPrescreen.map((c) => ({
          link: c.link,
          website: c.website,
          name: c.name,
        })),
        projectId: currentProjectId,
      }) as { checked: number; found: number; notFound: number; skipped: number };

      setPrescreenStats(response);
      queryClient.invalidateQueries({ queryKey: ["/api/apollo/check-enrichment"] });
      queryClient.invalidateQueries({ queryKey: ["/api/apollo/companies/not-found", currentProjectId] });
      queryClient.invalidateQueries({ queryKey: ["/api/apollo/leads-without-emails", currentProjectId] });

      const skippedText = response.skipped > 0 ? `, ${response.skipped} already processed` : "";
      toast({
        title: "Pre-screening complete",
        description: `Found ${response.found} in Apollo, ${response.notFound} not found${skippedText}`,
      });
    } catch (error: any) {
      toast({ title: "Pre-screening failed", description: error.message, variant: "destructive" });
    }

    setIsPrescreening(false);
  };

  const toggleSelectAll = () => {
    if (selectedLinks.size === notEnrichedContacts.length) {
      setSelectedLinks(new Set());
      return;
    }
    setSelectedLinks(new Set(notEnrichedContacts.map((c) => c.link)));
  };

  const toggleSelect = (link: string) => {
    const next = new Set(selectedLinks);
    if (next.has(link)) next.delete(link);
    else next.add(link);
    setSelectedLinks(next);
  };

  return {
    isPrescreening,
    prescreenProgress,
    prescreenStats,
    failedEnrichmentLinks,
    notEnrichedContacts,
    contactsNeedingPrescreen,
    handlePrescreenAll,
    toggleSelectAll,
    toggleSelect,
  };
}
