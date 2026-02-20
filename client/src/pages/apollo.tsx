import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useOptionalProject } from "@/contexts/project-context";
import { useApolloEnrichedCompanies } from "@/hooks/use-apollo-enriched-companies";
import { ApolloMainTabs } from "./apollo/components/apollo-main-tabs";
import { ApolloPageHeader } from "./apollo/components/apollo-page-header";
import { ApolloWorkflowDialogs } from "./apollo/components/apollo-workflow-dialogs";
import { ManualAddDialog } from "./apollo/components/manual-add-dialog";
import { useApolloBulkReview } from "./apollo/hooks/use-apollo-bulk-review";
import { useApolloLeadsWorkflow } from "./apollo/hooks/use-apollo-leads-workflow";
import { useApolloManualAdd } from "./apollo/hooks/use-apollo-manual-add";
import { useApolloPreviewWorkflow } from "./apollo/hooks/use-apollo-preview-workflow";
import type { ApolloCompany, ApolloSettings, StoreContact } from "./apollo/types";

export default function Apollo() {
  const { toast } = useToast();
  const projectContext = useOptionalProject();
  const currentProject = projectContext?.currentProject;
  const [activeTab, setActiveTab] = useState("enrich");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const { data: settings } = useQuery<ApolloSettings>({
    queryKey: ["/api/apollo/settings"],
  });

  const { data: enrichedCompanies, isLoading: companiesLoading } = useApolloEnrichedCompanies(currentProject?.id);

  const { data: storeContacts, isLoading: storeLoading } = useQuery<{ contacts: StoreContact[] }>({
    queryKey: ["/api/apollo/leads-without-emails", currentProject?.id],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (currentProject?.id) {
        params.set("projectId", currentProject.id);
      }
      const response = await fetch(`/api/apollo/leads-without-emails?${params.toString()}`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch leads");
      return response.json();
    },
    enabled: !!currentProject,
  });

  const updateSettingsMutation = useMutation({
    mutationFn: async (updates: Partial<ApolloSettings>) => {
      return apiRequest("PATCH", "/api/apollo/settings", updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/apollo/settings"] });
      toast({ title: "Settings updated" });
      setSettingsOpen(false);
    },
    onError: (error: any) => {
      toast({ title: "Failed to update settings", description: error.message, variant: "destructive" });
    },
  });

  const { data: enrichmentStatus } = useQuery<Record<string, string | null>>({
    queryKey: ["/api/apollo/check-enrichment", storeContacts?.contacts?.map(c => c.link)],
    queryFn: async () => {
      const links = storeContacts?.contacts?.map(c => c.link).filter(Boolean) || [];
      if (links.length === 0) return {};
      const response = await apiRequest("POST", "/api/apollo/check-enrichment", { links });
      return response as Record<string, string | null>;
    },
    enabled: !!storeContacts?.contacts?.length,
  });

  const { data: notFoundCompanies, isLoading: notFoundLoading } = useQuery<ApolloCompany[]>({
    queryKey: ["/api/apollo/companies/not-found", currentProject?.id],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (currentProject?.id) params.set("projectId", currentProject.id);
      const response = await fetch(`/api/apollo/companies/not-found?${params.toString()}`, { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch not found companies");
      return response.json();
    },
  });

  const {
    previewOpen,
    setPreviewOpen,
    selectedContact,
    previewResult,
    previewMutation,
    enrichMutation,
    handlePreview,
    handleEnrich,
  } = useApolloPreviewWorkflow({
    currentProjectId: currentProject?.id,
    toast,
  });

  const invalidateApolloQueries = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/apollo/companies"] });
    queryClient.invalidateQueries({ queryKey: ["/api/apollo/check-enrichment"] });
    queryClient.invalidateQueries({ queryKey: ["/api/apollo/settings"] });
  };

  const {
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
  } = useApolloBulkReview({
    contacts: storeContacts?.contacts || [],
    currentProjectId: currentProject?.id,
    toast,
    invalidateApolloQueries,
  });

  const {
    isPrescreening,
    failedEnrichmentLinks,
    notEnrichedContacts,
    contactsNeedingPrescreen,
    handlePrescreenAll,
    toggleSelectAll,
    toggleSelect,
  } = useApolloLeadsWorkflow({
    storeContacts: storeContacts?.contacts || [],
    searchQuery,
    enrichedCompanies: enrichedCompanies || [],
    enrichmentStatus,
    selectedLinks,
    setSelectedLinks,
    currentProjectId: currentProject?.id,
    toast,
  });

  const {
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
  } = useApolloManualAdd({
    currentProjectId: currentProject?.id,
    toast,
    invalidateApolloQueries,
  });

  return (
    <div className="container mx-auto py-6 px-4 space-y-6">
      <ApolloPageHeader
        settings={settings}
        currentProjectName={currentProject?.name}
        settingsOpen={settingsOpen}
        onSettingsOpenChange={setSettingsOpen}
        onSaveSettings={(updates) => updateSettingsMutation.mutate(updates)}
        isSavingSettings={updateSettingsMutation.isPending}
      />

      <ApolloMainTabs
        activeTab={activeTab}
        onActiveTabChange={setActiveTab}
        enrichedCount={(enrichedCompanies || []).filter((c) => (c.contactCount || 0) > 0).length}
        notFoundCount={notFoundCompanies?.length || 0}
        notFoundCompanies={notFoundCompanies}
        notFoundLoading={notFoundLoading}
        companies={(enrichedCompanies || []).filter((c) => (c.contactCount || 0) > 0)}
        companiesLoading={companiesLoading}
        projectId={currentProject?.id}
        projectName={currentProject?.name}
        storeLoading={storeLoading}
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
        onOpenManualAdd={() => setManualAddOpen(true)}
        onPrescreenAll={handlePrescreenAll}
        isPrescreening={isPrescreening}
        contactsNeedingPrescreenCount={contactsNeedingPrescreen.length}
        selectedLinksSize={selectedLinks.size}
        onStartReviewQueue={handleStartReviewQueue}
        reviewQueueLoading={reviewQueueLoading}
        isEnriching={isEnriching}
        onBulkEnrich={handleBulkEnrich}
        notEnrichedContacts={notEnrichedContacts}
        selectedLinks={selectedLinks}
        onToggleSelectAll={toggleSelectAll}
        onToggleSelect={toggleSelect}
        onPreview={handlePreview}
        enrichmentStatus={enrichmentStatus}
        failedEnrichmentLinks={failedEnrichmentLinks}
      />

      <ApolloWorkflowDialogs
        previewOpen={previewOpen}
        onPreviewOpenChange={setPreviewOpen}
        selectedContact={selectedContact}
        previewResult={previewResult}
        previewLoading={previewMutation.isPending}
        onEnrichPreview={handleEnrich}
        previewEnriching={enrichMutation.isPending}
        bulkPreviewOpen={bulkPreviewOpen}
        onBulkPreviewOpenChange={(open) => {
          if (!open && !isEnriching) {
            setBulkPreviewOpen(false);
            setSelectedPeople(new Set());
          }
        }}
        bulkPreviewData={bulkPreviewData}
        bulkPreviewLoading={bulkPreviewLoading}
        selectedLinksSize={selectedLinks.size}
        selectedPeople={selectedPeople}
        onToggleBulkPerson={(key) => {
          const next = new Set(selectedPeople);
          if (next.has(key)) next.delete(key);
          else next.add(key);
          setSelectedPeople(next);
        }}
        onSelectAllBulkPeople={() => {
          const allPeopleIds = bulkPreviewData
            .filter((r) => r.preview?.contacts)
            .flatMap((r) => (r.preview?.contacts || []).map((c) => `${r.contact.link}::${c.id}`));
          setSelectedPeople(new Set(allPeopleIds));
        }}
        onDeselectAllBulkPeople={() => setSelectedPeople(new Set())}
        onBulkEnrichSelected={handleBulkEnrichSelected}
        isEnriching={isEnriching}
        reviewQueueOpen={reviewQueueOpen}
        onReviewQueueOpenChange={(open) => {
          if (!open && !isEnriching) {
            setReviewQueueOpen(false);
            setReviewSelectedPeople(new Set());
          }
        }}
        reviewQueueData={reviewQueueData}
        reviewQueueIndex={reviewQueueIndex}
        onReviewQueueIndexChange={setReviewQueueIndex}
        reviewQueueLoading={reviewQueueLoading}
        reviewSelectedPeople={reviewSelectedPeople}
        onReviewTogglePerson={handleReviewTogglePerson}
        onReviewSelectAll={handleReviewSelectAll}
        onReviewDeselectAll={handleReviewDeselectAll}
        onReviewEnrich={handleReviewEnrich}
        onReviewSkip={handleReviewSkip}
        onReviewReject={handleReviewReject}
        keywordsExpanded={keywordsExpanded}
        onToggleKeywords={() => setKeywordsExpanded(!keywordsExpanded)}
      />

      <ManualAddDialog
        open={manualAddOpen}
        onOpenChange={handleManualDialogClose}
        companyName={manualCompanyName}
        onCompanyNameChange={setManualCompanyName}
        companyWebsite={manualCompanyWebsite}
        onCompanyWebsiteChange={setManualCompanyWebsite}
        previewResult={manualPreviewResult}
        previewLoading={manualPreviewLoading}
        enriching={manualEnriching}
        onPreview={handleManualAddPreview}
        onEnrich={handleManualEnrich}
        onCancel={resetManualDialog}
      />
    </div>
  );
}
