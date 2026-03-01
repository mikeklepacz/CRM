import { useRef, useState } from "react";
import type { EhubContact } from "@shared/schema";
import type { EhubSettings } from "@/components/ehub/ehub.types";

export function useEhubState() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedSequenceId, setSelectedSequenceId] = useState<string | null>(null);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [isTestDialogOpen, setIsTestDialogOpen] = useState(false);
  const [testEmail, setTestEmail] = useState("");
  const [sheetId, setSheetId] = useState("");
  const [contactedFilter, setContactedFilter] = useState<string>("all");
  const [activeTab, setActiveTab] = useState("all-contacts");

  const [pendingTab, setPendingTab] = useState<string | null>(null);
  const [showNavigationWarning, setShowNavigationWarning] = useState(false);

  const [strategyMessage, setStrategyMessage] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const [stepDelays, setStepDelays] = useState<number[]>([]);
  const [repeatLastStep, setRepeatLastStep] = useState<boolean>(false);
  const [sequenceKeywords, setSequenceKeywords] = useState<string>("");

  const [editStepDialogOpen, setEditStepDialogOpen] = useState(false);
  const [editingStepId, setEditingStepId] = useState<string | null>(null);
  const [editStepSubject, setEditStepSubject] = useState("");
  const [editStepBody, setEditStepBody] = useState("");
  const [editStepGuidance, setEditStepGuidance] = useState("");

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [contactStatusFilter, setContactStatusFilter] = useState<string>("all");
  const [selectedContacts, setSelectedContacts] = useState<EhubContact[]>([]);
  const [selectAllMode, setSelectAllMode] = useState<"none" | "page" | "all">("none");
  const [isAddToSequenceDialogOpen, setIsAddToSequenceDialogOpen] = useState(false);
  const [targetSequenceId, setTargetSequenceId] = useState<string>("");
  const [deleteSequenceId, setDeleteSequenceId] = useState<string | null>(null);

  const [selectedRecipientIds, setSelectedRecipientIds] = useState<Set<string>>(new Set());
  const [recipientSelectAll, setRecipientSelectAll] = useState(false);
  const [bulkDeleteConfirmDialogOpen, setBulkDeleteConfirmDialogOpen] = useState(false);

  const [name, setName] = useState("");
  const [senderEmailAccountId, setSenderEmailAccountId] = useState<string | null>(null);

  const [testRecipientEmail, setTestRecipientEmail] = useState("");
  const [testSubject, setTestSubject] = useState("");
  const [testBody, setTestBody] = useState("");
  const [followUpDialogOpen, setFollowUpDialogOpen] = useState(false);
  const [selectedTestEmailId, setSelectedTestEmailId] = useState<string | null>(null);
  const [followUpSubject, setFollowUpSubject] = useState("");
  const [followUpBody, setFollowUpBody] = useState("");

  const [nukeDialogOpen, setNukeDialogOpen] = useState(false);
  const [nukeCounts, setNukeCounts] = useState<{
    recipientsCount: number;
    messagesCount: number;
    testEmailsCount: number;
    slotsCount: number;
  } | null>(null);
  const [nukeEmailPattern, setNukeEmailPattern] = useState("");
  const [nukeConfirmText, setNukeConfirmText] = useState("");
  const [countsError, setCountsError] = useState<string | null>(null);

  const [replyScannnerDialogOpen, setReplyScannerDialogOpen] = useState(false);
  const [scanPreviewResults, setScanPreviewResults] = useState<{
    scanned: number;
    promoted: number;
    errors: number;
    dryRun?: boolean;
    details: Array<{
      recipientId: string;
      email: string;
      status: "promoted" | "has_reply" | "too_recent" | "error" | "newly_enrolled" | "blacklisted";
      message?: string;
      isNew?: boolean;
    }>;
  } | null>(null);
  const [selectedScanEmails, setSelectedScanEmails] = useState<Set<string>>(new Set());

  const [settingsForm, setSettingsForm] = useState<EhubSettings>({
    minDelayMinutes: 1,
    maxDelayMinutes: 3,
    jitterPercentage: 50,
    dailyEmailLimit: 200,
    sendingHoursStart: 9,
    sendingHoursEnd: 14,
    clientWindowStartOffset: 1.0,
    clientWindowEndHour: 14,
    promptInjection: "",
    keywordBin: "",
    excludedDays: [],
  });

  const [originalSettings, setOriginalSettings] = useState<EhubSettings | null>(null);
  const isSettingsDirty = originalSettings && JSON.stringify(settingsForm) !== JSON.stringify(originalSettings);

  const [finalizedStrategyEdit, setFinalizedStrategyEdit] = useState("");

  const [syntheticPreview, setSyntheticPreview] = useState<Array<{ stepNumber: number; subject: string; body: string }> | null>(
    null,
  );
  const [syntheticStoreContext, setSyntheticStoreContext] = useState<{
    name: string;
    link: string | null;
    salesSummary: string | null;
    state: string | null;
    timezone: string;
  } | null>(null);

  return {
    activeTab,
    bulkDeleteConfirmDialogOpen,
    contactedFilter,
    contactStatusFilter,
    countsError,
    debouncedSearch,
    deleteSequenceId,
    editStepBody,
    editStepDialogOpen,
    editStepGuidance,
    editStepSubject,
    editingStepId,
    finalizedStrategyEdit,
    followUpBody,
    followUpDialogOpen,
    followUpSubject,
    isAddToSequenceDialogOpen,
    isCreateDialogOpen,
    isImportDialogOpen,
    isSettingsDirty,
    isTestDialogOpen,
    name,
    nukeConfirmText,
    nukeCounts,
    nukeDialogOpen,
    nukeEmailPattern,
    originalSettings,
    page,
    pendingTab,
    recipientSelectAll,
    repeatLastStep,
    replyScannnerDialogOpen,
    scanPreviewResults,
    scrollRef,
    search,
    selectedContacts,
    selectedRecipientIds,
    selectedScanEmails,
    selectedSequenceId,
    selectedTestEmailId,
    selectAllMode,
    senderEmailAccountId,
    sequenceKeywords,
    settingsForm,
    sheetId,
    showNavigationWarning,
    stepDelays,
    strategyMessage,
    syntheticPreview,
    syntheticStoreContext,
    targetSequenceId,
    testBody,
    testEmail,
    testRecipientEmail,
    testSubject,
    setActiveTab,
    setBulkDeleteConfirmDialogOpen,
    setContactedFilter,
    setContactStatusFilter,
    setCountsError,
    setDebouncedSearch,
    setDeleteSequenceId,
    setEditStepBody,
    setEditStepDialogOpen,
    setEditStepGuidance,
    setEditStepSubject,
    setEditingStepId,
    setFinalizedStrategyEdit,
    setFollowUpBody,
    setFollowUpDialogOpen,
    setFollowUpSubject,
    setIsAddToSequenceDialogOpen,
    setIsCreateDialogOpen,
    setIsImportDialogOpen,
    setIsTestDialogOpen,
    setName,
    setNukeConfirmText,
    setNukeCounts,
    setNukeDialogOpen,
    setNukeEmailPattern,
    setOriginalSettings,
    setPage,
    setPendingTab,
    setRecipientSelectAll,
    setRepeatLastStep,
    setReplyScannerDialogOpen,
    setScanPreviewResults,
    setSearch,
    setSelectedContacts,
    setSelectedRecipientIds,
    setSelectedScanEmails,
    setSelectedSequenceId,
    setSelectedTestEmailId,
    setSelectAllMode,
    setSenderEmailAccountId,
    setSequenceKeywords,
    setSettingsForm,
    setSheetId,
    setShowNavigationWarning,
    setStepDelays,
    setStrategyMessage,
    setSyntheticPreview,
    setSyntheticStoreContext,
    setTargetSequenceId,
    setTestBody,
    setTestEmail,
    setTestRecipientEmail,
    setTestSubject,
  };
}
