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
  const PRESCREEN_BATCH_SIZE = 100;
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

  const allNotEnrichedContacts = useMemo(() => storeContacts.filter((c) => {
    const status = enrichmentStatus?.[c.link];
    if (failedEnrichmentLinks.has(c.link)) return true;
    if (!status) return true;
    const normalizedStatus = status.toLowerCase();
    const blockedStatuses = new Set(["enriched", "not_found", "archived", "retired"]);
    return !blockedStatuses.has(normalizedStatus);
  }), [storeContacts, enrichmentStatus, failedEnrichmentLinks]);

  const candidateQueueContacts = useMemo(() => allNotEnrichedContacts.filter((c) => {
    const candidateStatus = c.candidateStatus?.toLowerCase().trim();
    if (!candidateStatus) return true;
    return candidateStatus !== "rejected";
  }), [allNotEnrichedContacts]);

  const enrichQueueContacts = useMemo(() => candidateQueueContacts.filter((c) => {
    const candidateStatus = c.candidateStatus?.toLowerCase().trim();
    // Candidate queue rows must be explicitly approved before they appear in Enrich Leads.
    if (candidateStatus) {
      return candidateStatus === "approved";
    }
    // Legacy/non-candidate rows remain eligible without a decision.
    return true;
  }), [candidateQueueContacts]);

  const notEnrichedContacts = useMemo(() => {
    const filteredSet = new Set(filteredContacts.map((c) => c.link));
    return enrichQueueContacts.filter((c) => filteredSet.has(c.link));
  }, [enrichQueueContacts, filteredContacts]);

  const contactsNeedingPrescreen = useMemo(() => candidateQueueContacts.filter((c) => {
    const status = enrichmentStatus?.[c.link];
    return !status || status !== "prescreened";
  }), [candidateQueueContacts, enrichmentStatus]);

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
      const aggregate = { checked: 0, found: 0, notFound: 0, skipped: 0 };
      for (let i = 0; i < contactsToPrescreen.length; i += PRESCREEN_BATCH_SIZE) {
        const batch = contactsToPrescreen.slice(i, i + PRESCREEN_BATCH_SIZE);
        const response = await apiRequest("POST", "/api/apollo/bulk-prescreen", {
          contacts: batch.map((c) => ({
            link: c.link,
            website: c.website,
            name: c.name,
          })),
          projectId: currentProjectId,
        }) as { checked: number; found: number; notFound: number; skipped: number };

        aggregate.checked += response.checked || 0;
        aggregate.found += response.found || 0;
        aggregate.notFound += response.notFound || 0;
        aggregate.skipped += response.skipped || 0;
        setPrescreenProgress({ current: Math.min(i + batch.length, contactsToPrescreen.length), total: contactsToPrescreen.length });
        queryClient.invalidateQueries({ queryKey: ["/api/apollo/prescreen-results", currentProjectId] });
      }

      setPrescreenStats(aggregate);
      queryClient.invalidateQueries({ queryKey: ["/api/apollo/check-enrichment"] });
      queryClient.invalidateQueries({ queryKey: ["/api/apollo/companies/not-found", currentProjectId] });
      queryClient.invalidateQueries({ queryKey: ["/api/apollo/leads-without-emails", currentProjectId] });
      queryClient.invalidateQueries({ queryKey: ["/api/apollo/prescreen-results", currentProjectId] });

      const skippedText = aggregate.skipped > 0 ? `, ${aggregate.skipped} already processed` : "";
      toast({
        title: "Pre-screening complete",
        description: `Found ${aggregate.found} in Apollo, ${aggregate.notFound} not found${skippedText}`,
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
