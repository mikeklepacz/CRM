import type { EhubContact } from "@shared/schema";
import type { EhubSettings } from "@/components/ehub/ehub.types";

interface UseEhubActionsProps {
  activeTab: string;
  addContactsMutation: { mutate: (payload: any) => void };
  allContactsData?: { contacts?: EhubContact[] };
  contactStatusFilter: string;
  debouncedSearch: string;
  isSettingsDirty: boolean | null;
  name: string;
  originalSettings: EhubSettings | null;
  pendingTab: string | null;
  selectAllMode: "all" | "none" | "page";
  selectedContacts: EhubContact[];
  selectedSequenceId: string | null;
  senderEmailAccountId: string | null;
  settingsForm: EhubSettings;
  sheetId: string;
  targetSequenceId: string;
  testEmail: string;
  createMutation: { mutate: (payload: { name: string; senderEmailAccountId: string | null }) => void };
  importMutation: { mutate: (payload: { sequenceId: string; sheetId: string }) => void };
  setActiveTab: (tab: string) => void;
  setIsAddToSequenceDialogOpen: (open: boolean) => void;
  setPendingTab: (tab: string | null) => void;
  setName: (value: string) => void;
  setSelectedContacts: (value: EhubContact[] | ((prev: EhubContact[]) => EhubContact[])) => void;
  setSelectAllMode: (mode: "all" | "none" | "page") => void;
  setSenderEmailAccountId: (value: string | null) => void;
  setSettingsForm: (value: EhubSettings) => void;
  setShowNavigationWarning: (value: boolean) => void;
  setSheetId: (value: string) => void;
  setTargetSequenceId: (value: string) => void;
  setTestEmail: (value: string) => void;
  testSendMutation: { mutate: (payload: { sequenceId: string; testEmail: string }) => void };
  toast: (props: { title: string; description: string; variant?: "default" | "destructive" }) => void;
  updateSettingsMutation: { mutate: (payload: EhubSettings) => void };
}

export function useEhubActions(props: UseEhubActionsProps) {
  const resetSequenceForm = () => {
    props.setName("");
    props.setSenderEmailAccountId(null);
  };

  const handleToggleContact = (contact: EhubContact) => {
    props.setSelectAllMode("none");
    props.setSelectedContacts((prev) => {
      const isSelected = prev.some((c) => c.email === contact.email);
      if (isSelected) {
        return prev.filter((c) => c.email !== contact.email);
      }
      return [...prev, contact];
    });
  };

  const handleSelectAllOnPage = () => {
    if (props.selectAllMode === "page") {
      props.setSelectedContacts([]);
      props.setSelectAllMode("none");
    } else {
      props.setSelectedContacts(props.allContactsData?.contacts || []);
      props.setSelectAllMode("page");
    }
  };

  const handleSelectAllMatching = () => {
    props.setSelectAllMode("all");
    props.setSelectedContacts([]);
  };

  const handleClearSelection = () => {
    props.setSelectedContacts([]);
    props.setSelectAllMode("none");
  };

  const handleAddToSequence = () => {
    if (!props.targetSequenceId) return;

    if (props.selectAllMode === "all") {
      props.addContactsMutation.mutate({
        sequenceId: props.targetSequenceId,
        selectAll: true,
        search: props.debouncedSearch,
        statusFilter: props.contactStatusFilter,
      });
    } else {
      props.addContactsMutation.mutate({
        sequenceId: props.targetSequenceId,
        contacts: props.selectedContacts,
      });
    }
  };

  const handleCreateSequence = () => {
    props.createMutation.mutate({
      name: props.name,
      senderEmailAccountId: props.senderEmailAccountId,
    });
  };

  const handleSaveSettings = () => {
    props.updateSettingsMutation.mutate(props.settingsForm);
  };

  const handleDiscardSettings = () => {
    if (props.originalSettings) {
      props.setSettingsForm(props.originalSettings);
      props.toast({
        title: "Changes Discarded",
        description: "Settings have been reset to the last saved values.",
      });
    }
  };

  const handleTabChange = (newTab: string) => {
    if (props.activeTab === "settings" && props.isSettingsDirty) {
      props.setPendingTab(newTab);
      props.setShowNavigationWarning(true);
    } else {
      props.setActiveTab(newTab);
    }
  };

  const handleConfirmNavigation = () => {
    if (props.pendingTab) {
      props.setActiveTab(props.pendingTab);
      props.setPendingTab(null);
    }
    props.setShowNavigationWarning(false);
  };

  const handleCancelNavigation = () => {
    props.setPendingTab(null);
    props.setShowNavigationWarning(false);
  };

  const handleImport = () => {
    if (!props.selectedSequenceId) return;
    props.importMutation.mutate({ sequenceId: props.selectedSequenceId, sheetId: props.sheetId });
  };

  const handleTestSend = () => {
    if (!props.selectedSequenceId) return;
    props.testSendMutation.mutate({ sequenceId: props.selectedSequenceId, testEmail: props.testEmail });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "default";
      case "paused":
        return "secondary";
      case "completed":
        return "outline";
      default:
        return "secondary";
    }
  };

  const clearImportForm = () => {
    props.setSheetId("");
  };

  const closeAddToSequenceDialog = () => {
    props.setSelectedContacts([]);
    props.setSelectAllMode("none");
    props.setIsAddToSequenceDialogOpen(false);
    props.setTargetSequenceId("");
  };

  const clearTestEmail = () => {
    props.setTestEmail("");
  };

  return {
    clearImportForm,
    clearTestEmail,
    closeAddToSequenceDialog,
    getStatusColor,
    handleAddToSequence,
    handleCancelNavigation,
    handleClearSelection,
    handleConfirmNavigation,
    handleCreateSequence,
    handleDiscardSettings,
    handleImport,
    handleSaveSettings,
    handleSelectAllMatching,
    handleSelectAllOnPage,
    handleTabChange,
    handleTestSend,
    handleToggleContact,
    resetSequenceForm,
  };
}
