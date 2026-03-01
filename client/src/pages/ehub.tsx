import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { queryClient } from "@/lib/queryClient";
import { useOptionalProject } from "@/contexts/project-context";
import { useModuleAccess } from "@/hooks/useModuleAccess";
import { useLocation } from "wouter";
import { EhubDialogsSectionWrapper } from "@/components/ehub/ehub-dialogs-section-wrapper";
import { EhubMainTabsSection } from "@/components/ehub/ehub-main-tabs-section";
import { EhubModuleDisabled } from "@/components/ehub/ehub-module-disabled";
import { EhubPageHeader } from "@/components/ehub/ehub-page-header";
import { useEhubActions } from "@/components/ehub/use-ehub-actions";
import { useEhubConfigMutations } from "@/components/ehub/use-ehub-config-mutations";
import { useEhubEffects } from "@/components/ehub/use-ehub-effects";
import { useEhubOperationsMutations } from "@/components/ehub/use-ehub-operations-mutations";
import { useEhubQueries } from "@/components/ehub/use-ehub-queries";
import { useEhubSequenceMutations } from "@/components/ehub/use-ehub-sequence-mutations";
import { useEhubState } from "@/components/ehub/use-ehub-state";
import { useEhubStrategyMutations } from "@/components/ehub/use-ehub-strategy-mutations";

export default function EHub() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { isModuleEnabled, isLoading: moduleAccessLoading } = useModuleAccess();
  const projectContext = useOptionalProject();
  const currentProject = projectContext?.currentProject;

  const moduleEnabled = isModuleEnabled("ehub");

  if (!moduleAccessLoading && !moduleEnabled) {
    return <EhubModuleDisabled onReturnHome={() => setLocation("/")} />;
  }

  const state = useEhubState();

  const queries = useEhubQueries({
    activeTab: state.activeTab,
    contactStatusFilter: state.contactStatusFilter,
    contactedFilter: state.contactedFilter,
    currentProjectId: currentProject?.id,
    debouncedSearch: state.debouncedSearch,
    page: state.page,
    selectedSequenceId: state.selectedSequenceId,
    user,
  });

  const configMutations = useEhubConfigMutations({
    toast,
    userPreferences: queries.userPreferences,
  });

  const handleConnectEmail = async () => {
    try {
      const res = await fetch("/api/email-accounts/oauth-url", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to get OAuth URL");
      const { url } = await res.json();
      const popup = window.open(url, "Connect Gmail", "width=600,height=700");
      const checkPopup = setInterval(() => {
        if (popup?.closed) {
          clearInterval(checkPopup);
          queryClient.invalidateQueries({ queryKey: ["/api/email-accounts"] });
        }
      }, 1000);
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to connect email", variant: "destructive" });
    }
  };

  const strategyMutations = useEhubStrategyMutations({
    refetchSteps: queries.refetchSteps,
    selectedSequenceId: state.selectedSequenceId,
    setEditStepDialogOpen: state.setEditStepDialogOpen,
    setFinalizedStrategyEdit: state.setFinalizedStrategyEdit,
    setStrategyMessage: state.setStrategyMessage,
    toast,
  });

  const sequenceMutations = useEhubSequenceMutations({
    currentProjectId: currentProject?.id,
    deleteSequenceId: state.deleteSequenceId,
    selectedSequenceId: state.selectedSequenceId,
    setDeleteSequenceId: state.setDeleteSequenceId,
    setIsAddToSequenceDialogOpen: state.setIsAddToSequenceDialogOpen,
    setIsCreateDialogOpen: state.setIsCreateDialogOpen,
    setIsImportDialogOpen: state.setIsImportDialogOpen,
    setIsTestDialogOpen: state.setIsTestDialogOpen,
    setName: state.setName,
    setSelectedContacts: state.setSelectedContacts,
    setSelectedSequenceId: state.setSelectedSequenceId,
    setSelectAllMode: state.setSelectAllMode,
    setSenderEmailAccountId: state.setSenderEmailAccountId,
    setSheetId: state.setSheetId,
    setTargetSequenceId: state.setTargetSequenceId,
    setTestEmail: state.setTestEmail,
    toast,
  });

  const operationsMutations = useEhubOperationsMutations({
    nukeEmailPattern: state.nukeEmailPattern,
    selectedSequenceId: state.selectedSequenceId,
    setBulkDeleteConfirmDialogOpen: state.setBulkDeleteConfirmDialogOpen,
    setFollowUpBody: state.setFollowUpBody,
    setFollowUpDialogOpen: state.setFollowUpDialogOpen,
    setFollowUpSubject: state.setFollowUpSubject,
    setNukeConfirmText: state.setNukeConfirmText,
    setNukeCounts: state.setNukeCounts,
    setNukeDialogOpen: state.setNukeDialogOpen,
    setNukeEmailPattern: state.setNukeEmailPattern,
    setRecipientSelectAll: state.setRecipientSelectAll,
    setReplyScannerDialogOpen: state.setReplyScannerDialogOpen,
    setScanPreviewResults: state.setScanPreviewResults,
    setSelectedRecipientIds: state.setSelectedRecipientIds,
    setSelectedScanEmails: state.setSelectedScanEmails,
    setSelectedTestEmailId: state.setSelectedTestEmailId,
    setSyntheticPreview: state.setSyntheticPreview,
    setSyntheticStoreContext: state.setSyntheticStoreContext,
    setTestBody: state.setTestBody,
    setTestRecipientEmail: state.setTestRecipientEmail,
    setTestSubject: state.setTestSubject,
    toast,
  });

  useEhubEffects({
    contactStatusFilter: state.contactStatusFilter,
    debouncedSearch: state.debouncedSearch,
    nukeDialogOpen: state.nukeDialogOpen,
    nukeEmailPattern: state.nukeEmailPattern,
    scrollRef: state.scrollRef,
    search: state.search,
    selectedSequenceId: state.selectedSequenceId,
    sequences: queries.sequences,
    setCountsError: state.setCountsError,
    setDebouncedSearch: state.setDebouncedSearch,
    setFinalizedStrategyEdit: state.setFinalizedStrategyEdit,
    setNukeCounts: state.setNukeCounts,
    setOriginalSettings: state.setOriginalSettings,
    setPage: state.setPage,
    setRepeatLastStep: state.setRepeatLastStep,
    setSequenceKeywords: state.setSequenceKeywords,
    setSettingsForm: state.setSettingsForm,
    setStepDelays: state.setStepDelays,
    setSyntheticPreview: state.setSyntheticPreview,
    settings: queries.settings,
    strategyTranscript: queries.strategyTranscript,
  });

  const actions = useEhubActions({
    activeTab: state.activeTab,
    addContactsMutation: sequenceMutations.addContactsMutation,
    allContactsData: queries.allContactsData,
    contactStatusFilter: state.contactStatusFilter,
    createMutation: sequenceMutations.createMutation,
    debouncedSearch: state.debouncedSearch,
    importMutation: sequenceMutations.importMutation,
    isSettingsDirty: state.isSettingsDirty,
    name: state.name,
    originalSettings: state.originalSettings,
    pendingTab: state.pendingTab,
    selectAllMode: state.selectAllMode,
    selectedContacts: state.selectedContacts,
    selectedSequenceId: state.selectedSequenceId,
    senderEmailAccountId: state.senderEmailAccountId,
    setActiveTab: state.setActiveTab,
    setIsAddToSequenceDialogOpen: state.setIsAddToSequenceDialogOpen,
    setName: state.setName,
    setPendingTab: state.setPendingTab,
    setSelectedContacts: state.setSelectedContacts,
    setSelectAllMode: state.setSelectAllMode,
    setSenderEmailAccountId: state.setSenderEmailAccountId,
    setSettingsForm: state.setSettingsForm,
    setSheetId: state.setSheetId,
    setShowNavigationWarning: state.setShowNavigationWarning,
    setTargetSequenceId: state.setTargetSequenceId,
    setTestEmail: state.setTestEmail,
    settingsForm: state.settingsForm,
    sheetId: state.sheetId,
    targetSequenceId: state.targetSequenceId,
    testEmail: state.testEmail,
    testSendMutation: sequenceMutations.testSendMutation,
    toast,
    updateSettingsMutation: configMutations.updateSettingsMutation,
  });

  if (queries.isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <EhubPageHeader gmailConnected={queries.gmailConnected} />

      <EhubMainTabsSection
        actions={actions}
        configMutations={configMutations}
        handleConnectEmail={handleConnectEmail}
        operationsMutations={operationsMutations}
        queries={queries}
        sequenceMutations={sequenceMutations}
        state={state}
        strategyMutations={strategyMutations}
        toast={toast}
        user={user}
      />

      <EhubDialogsSectionWrapper
        actions={actions}
        configMutations={configMutations}
        operationsMutations={operationsMutations}
        queries={queries}
        sequenceMutations={sequenceMutations}
        state={state}
        strategyMutations={strategyMutations}
      />
    </div>
  );
}
