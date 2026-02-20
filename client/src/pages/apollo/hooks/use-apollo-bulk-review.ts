import { useState } from "react";
import { apiRequest } from "@/lib/queryClient";
import { extractDomain } from "../constants";
import type { BulkPreviewItem, PreviewResult, StoreContact } from "../types";

type ToastFn = (args: { title: string; description?: string; variant?: "default" | "destructive" }) => void;

type UseApolloBulkReviewParams = {
  contacts: StoreContact[];
  currentProjectId?: string;
  toast: ToastFn;
  invalidateApolloQueries: () => void;
};

export function useApolloBulkReview({
  contacts,
  currentProjectId,
  toast,
  invalidateApolloQueries,
}: UseApolloBulkReviewParams) {
  const [selectedLinks, setSelectedLinks] = useState<Set<string>>(new Set());
  const [isEnriching, setIsEnriching] = useState(false);
  const [bulkPreviewOpen, setBulkPreviewOpen] = useState(false);
  const [bulkPreviewData, setBulkPreviewData] = useState<BulkPreviewItem[]>([]);
  const [bulkPreviewLoading, setBulkPreviewLoading] = useState(false);
  const [selectedPeople, setSelectedPeople] = useState<Set<string>>(new Set());
  const [reviewQueueOpen, setReviewQueueOpen] = useState(false);
  const [reviewQueueIndex, setReviewQueueIndex] = useState(0);
  const [reviewQueueData, setReviewQueueData] = useState<BulkPreviewItem[]>([]);
  const [reviewQueueLoading, setReviewQueueLoading] = useState(false);
  const [reviewSelectedPeople, setReviewSelectedPeople] = useState<Set<string>>(new Set());
  const [keywordsExpanded, setKeywordsExpanded] = useState(false);

  const handleBulkEnrich = async () => {
    if (selectedLinks.size === 0) return;

    const selectedContacts = contacts.filter((c) => selectedLinks.has(c.link));
    setBulkPreviewOpen(true);
    setBulkPreviewLoading(true);
    setBulkPreviewData([]);
    setSelectedPeople(new Set());

    const results: BulkPreviewItem[] = [];
    for (const contact of selectedContacts) {
      try {
        const domain = extractDomain(contact.website);
        const response = await apiRequest("POST", "/api/apollo/preview", {
          domain: domain || undefined,
          companyName: !domain ? contact.name : undefined,
        }) as PreviewResult;
        results.push({ contact, preview: response });
      } catch (error: any) {
        results.push({ contact, preview: null, error: error.message || "Failed to preview" });
      }
      setBulkPreviewData([...results]);
    }

    setBulkPreviewLoading(false);

    const allPeopleIds = results
      .filter((r) => r.preview?.contacts)
      .flatMap((r) => (r.preview?.contacts || []).map((c) => `${r.contact.link}::${c.id}`));
    setSelectedPeople(new Set(allPeopleIds));
  };

  const handleBulkEnrichSelected = async () => {
    if (selectedPeople.size === 0) {
      toast({ title: "No people selected", variant: "destructive" });
      return;
    }

    setIsEnriching(true);

    const companyLinks = new Set<string>();
    selectedPeople.forEach((key) => {
      const [link] = key.split("::");
      companyLinks.add(link);
    });

    let successCount = 0;
    let errorCount = 0;

    for (const link of Array.from(companyLinks)) {
      const contactData = contacts.find((c) => c.link === link);
      if (!contactData) continue;

      try {
        const domain = extractDomain(contactData.website);
        await apiRequest("POST", "/api/apollo/enrich", {
          googleSheetLink: contactData.link,
          domain: domain || undefined,
          companyName: !domain ? contactData.name : undefined,
          projectId: currentProjectId,
        });
        successCount++;
      } catch {
        errorCount++;
      }
    }

    setIsEnriching(false);
    setBulkPreviewOpen(false);
    setSelectedLinks(new Set());
    setSelectedPeople(new Set());
    setBulkPreviewData([]);
    invalidateApolloQueries();

    toast({
      title: "Bulk enrichment complete",
      description: `Enriched ${successCount} companies. ${errorCount > 0 ? `${errorCount} failed.` : ""}`,
    });
  };

  const handleStartReviewQueue = async () => {
    if (selectedLinks.size === 0) return;

    const selectedContacts = contacts.filter((c) => selectedLinks.has(c.link));

    setReviewQueueOpen(true);
    setReviewQueueLoading(true);
    setReviewQueueData([]);
    setReviewQueueIndex(0);
    setReviewSelectedPeople(new Set());
    setKeywordsExpanded(false);

    const results: BulkPreviewItem[] = [];
    for (const contact of selectedContacts) {
      try {
        const domain = extractDomain(contact.website);
        const response = await apiRequest("POST", "/api/apollo/preview", {
          domain: domain || undefined,
          companyName: !domain ? contact.name : undefined,
        }) as PreviewResult;
        results.push({ contact, preview: response });
      } catch (error: any) {
        results.push({ contact, preview: null, error: error.message || "Failed to preview" });
      }
      setReviewQueueData([...results]);
    }

    setReviewQueueLoading(false);
  };

  const handleReviewTogglePerson = (key: string) => {
    const newSet = new Set(reviewSelectedPeople);
    if (newSet.has(key)) newSet.delete(key);
    else newSet.add(key);
    setReviewSelectedPeople(newSet);
  };

  const handleReviewSelectAll = () => {
    const currentItem = reviewQueueData[reviewQueueIndex];
    if (!currentItem?.preview?.contacts) return;

    const newSet = new Set(reviewSelectedPeople);
    currentItem.preview.contacts
      .filter((p) => p.has_email)
      .forEach((person) => newSet.add(`${currentItem.contact.link}::${person.id}`));
    setReviewSelectedPeople(newSet);
  };

  const handleReviewDeselectAll = () => {
    const currentItem = reviewQueueData[reviewQueueIndex];
    if (!currentItem?.preview?.contacts) return;

    const newSet = new Set(reviewSelectedPeople);
    currentItem.preview.contacts
      .filter((p) => p.has_email)
      .forEach((person) => newSet.delete(`${currentItem.contact.link}::${person.id}`));
    setReviewSelectedPeople(newSet);
  };

  const handleReviewSkip = () => {
    if (reviewQueueIndex < reviewQueueData.length - 1) {
      setReviewQueueIndex(reviewQueueIndex + 1);
      setKeywordsExpanded(false);
    }
  };

  const handleReviewReject = () => {
    const currentItem = reviewQueueData[reviewQueueIndex];
    if (!currentItem) return;

    toast({
      title: "Company rejected",
      description: `"${currentItem.contact.name}" has been marked as ignored.`,
    });

    if (reviewQueueIndex < reviewQueueData.length - 1) {
      setReviewQueueIndex(reviewQueueIndex + 1);
      setKeywordsExpanded(false);
    } else {
      setReviewQueueOpen(false);
    }
  };

  const handleReviewEnrich = async () => {
    const currentItem = reviewQueueData[reviewQueueIndex];
    if (!currentItem) return;

    const currentPeopleKeys = (currentItem.preview?.contacts || [])
      .filter((p) => p.has_email)
      .map((person) => `${currentItem.contact.link}::${person.id}`)
      .filter((key) => reviewSelectedPeople.has(key));

    if (currentPeopleKeys.length === 0) {
      toast({ title: "No people selected", variant: "destructive" });
      return;
    }

    setIsEnriching(true);

    try {
      const domain = extractDomain(currentItem.contact.website);
      const selectedPersonIds = currentPeopleKeys.map((key) => key.split("::")[1]);

      await apiRequest("POST", "/api/apollo/enrich", {
        googleSheetLink: currentItem.contact.link,
        domain: domain || undefined,
        companyName: !domain ? currentItem.contact.name : undefined,
        selectedPersonIds,
        projectId: currentProjectId,
      });

      toast({
        title: "Enrichment complete",
        description: `Successfully enriched contacts for "${currentItem.contact.name}"`,
      });

      invalidateApolloQueries();

      if (reviewQueueIndex < reviewQueueData.length - 1) {
        setReviewQueueIndex(reviewQueueIndex + 1);
        setKeywordsExpanded(false);
      } else {
        setReviewQueueOpen(false);
      }
    } catch (error: any) {
      toast({
        title: "Enrichment failed",
        description: error.message || "Failed to enrich contacts",
        variant: "destructive",
      });
    }

    setIsEnriching(false);
  };

  return {
    selectedLinks,
    setSelectedLinks,
    isEnriching,
    bulkPreviewOpen,
    setBulkPreviewOpen,
    bulkPreviewData,
    bulkPreviewLoading,
    selectedPeople,
    setSelectedPeople,
    reviewQueueOpen,
    setReviewQueueOpen,
    reviewQueueIndex,
    setReviewQueueIndex,
    reviewQueueData,
    reviewQueueLoading,
    reviewSelectedPeople,
    setReviewSelectedPeople,
    keywordsExpanded,
    setKeywordsExpanded,
    handleBulkEnrich,
    handleBulkEnrichSelected,
    handleStartReviewQueue,
    handleReviewTogglePerson,
    handleReviewSelectAll,
    handleReviewDeselectAll,
    handleReviewSkip,
    handleReviewReject,
    handleReviewEnrich,
  };
}
