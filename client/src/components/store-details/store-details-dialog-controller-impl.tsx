import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useTwilioVoip } from "@/hooks/useTwilioVoip";
import { StoreDetailsDialogRender } from "@/components/store-details/store-details-dialog-render";
import { getLinkValue } from "@/components/store-details/store-details-utils";
import { STORE_DETAILS_INITIAL_FORM_DATA } from "@/components/store-details/store-details-dialog-constants";
import { getRowValueFromRecord, getStoreNameFromRecord } from "@/components/store-details/store-details-dialog-utils";
import { useStoreDetailsSectionOrder } from "@/components/store-details/use-store-details-section-order";
import { useStoreDetailsNavigation } from "@/components/store-details/use-store-details-navigation";
import { useStoreDetailsUnsavedChanges } from "@/components/store-details/use-store-details-unsaved-changes";
import { useStoreDetailsAssistantPreferences } from "@/components/store-details/use-store-details-assistant-preferences";
import { useStoreDetailsNotesAutodetect } from "@/components/store-details/use-store-details-notes-autodetect";
import { useStoreDetailsRowInitialization } from "@/components/store-details/use-store-details-row-initialization";
import { useStoreDetailsUpsertTrackerFieldsMutation } from "@/components/store-details/use-store-details-upsert-tracker-mutation";
import { useStoreDetailsSaveMutation } from "@/components/store-details/use-store-details-save-mutation";
import { useStoreDetailsActions } from "@/components/store-details/use-store-details-actions";
import { useStoreDetailsCloseGuard } from "@/components/store-details/use-store-details-close-guard";
import type { StoreDetailsDialogProps } from "@/components/store-details/store-details.types";

// Store Details Dialog Component
export function StoreDetailsDialogController({ open, onOpenChange, row, trackerSheetId, storeSheetId, refetch, franchiseContext, currentColors, statusOptions, statusColors, contextUpdateTrigger, setContextUpdateTrigger, loadDefaultScriptTrigger, allVisibleStores, onNavigateToStore }: StoreDetailsDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: currentUser } = useQuery<{ id: string; email?: string; role?: string; agentName?: string }>({ queryKey: ['/api/auth/user'] });
  const voip = useTwilioVoip();

  // Fetch user preferences for timezone and time format
  const { data: userPreferences } = useQuery<{ timezone?: string; defaultTimezoneMode?: string; timeFormat?: string; autoLoadScript?: boolean }>({
    queryKey: ['/api/user/preferences'],
  });

  const [formData, setFormData] = useState(STORE_DETAILS_INITIAL_FORM_DATA);

  // Track initial data to determine what changed
  const [initialData, setInitialData] = useState(formData);

  // Multiple Locations feature state
  const [multiLocationMode, setMultiLocationMode] = useState(false);
  const [dbaName, setDbaName] = useState("");
  const [currentDbaStores, setCurrentDbaStores] = useState<Array<{ link: string; name: string }>>([]);
  const [selectedStores, setSelectedStores] = useState<Array<{ link: string; name: string }>>([]);
  const [storeSearchDialog, setStoreSearchDialog] = useState(false);
  const [storeSearch, setStoreSearch] = useState("");
  const [parseLocationsDialog, setParseLocationsDialog] = useState(false);
  
  // Parent DBA management state
  const [parentCreationType, setParentCreationType] = useState<'new' | 'existing'>('new');
  const [selectedParentLink, setSelectedParentLink] = useState<string>('');
  const [headOfficeLink, setHeadOfficeLink] = useState<string>('none');

  const getRowValue = (fieldNames: string[]): string => getRowValueFromRecord(row, fieldNames);
  const [parentPocName, setParentPocName] = useState('');
  const [parentPocEmail, setParentPocEmail] = useState('');
  const [parentPocPhone, setParentPocPhone] = useState('');
  
  // Corporate office location data
  const [corporateAddress, setCorporateAddress] = useState('');
  const [corporateCity, setCorporateCity] = useState('');
  const [corporateState, setCorporateState] = useState('');
  const [corporatePhone, setCorporatePhone] = useState('');
  const [corporateEmail, setCorporateEmail] = useState('');

  // Child locations management
  const currentStoreLink = getLinkValue(row);
  const { data: childLocations, refetch: refetchChildren } = useQuery<any>({
    queryKey: ['/api/dba/children', currentStoreLink],
    enabled: !!currentStoreLink && open,
  });
  const [activeRowLink, setActiveRowLink] = useState<string | null>(null);

  // State for collapsible reminder section
  const [reminderSectionOpen, setReminderSectionOpen] = useState(false);
  const [isSavingReminder, setIsSavingReminder] = useState(false);
  
  // State for Claim DBA loading
  const [isClaiming, setIsClaiming] = useState(false);

  const { sectionOrder, sensors, handleDragEnd } = useStoreDetailsSectionOrder();
  const getStoreName = getStoreNameFromRecord;
  const { prevStore, nextStore } = useStoreDetailsNavigation(allVisibleStores, row);

  useEffect(() => {
    if (!open || !onNavigateToStore) return;
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (e.target as HTMLElement)?.isContentEditable) return;
      if (e.key === 'ArrowLeft' && prevStore) {
        e.preventDefault();
        const hasChanges = Object.keys(formData).some(k => formData[k as keyof typeof formData] !== initialData[k as keyof typeof initialData]);
        if (hasChanges) saveMutation.mutate({ closeDialog: false });
        onNavigateToStore(prevStore);
      } else if (e.key === 'ArrowRight' && nextStore) {
        e.preventDefault();
        const hasChanges = Object.keys(formData).some(k => formData[k as keyof typeof formData] !== initialData[k as keyof typeof initialData]);
        if (hasChanges) saveMutation.mutate({ closeDialog: false });
        onNavigateToStore(nextStore);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, prevStore, nextStore, onNavigateToStore, formData, initialData]);

  // Query all stores for multi-location picker - LAZY LOAD (only when search has 2+ chars)
  const { data: allStores, isLoading: isLoadingStores } = useQuery<any[]>({
    queryKey: [`/api/stores/all/${storeSheetId}`],
    enabled: !!storeSheetId && multiLocationMode && storeSearch.length >= 2,
  });

  // Query stores by DBA - auto-load DBA group when opening a store with existing DBA
  const { data: dbaStores } = useQuery<any[]>({
    queryKey: [`/api/stores/by-dba`, storeSheetId, dbaName],
    queryFn: async () => {
      if (!storeSheetId || !dbaName) return [];
      return await apiRequest('GET', `/api/stores/by-dba/${storeSheetId}/${encodeURIComponent(dbaName)}`);
    },
    enabled: !!storeSheetId && !!dbaName && open && activeRowLink !== null,
  });

  // Filtered stores for search - exclude current DBA stores AND already selected stores
  const filteredStores = useMemo(() => {
    if (!allStores || !Array.isArray(allStores)) return [];
    const searchLower = storeSearch.toLowerCase();

    // Create set of links to exclude (current DBA stores + selected stores)
    const excludedLinks = new Set([
      ...currentDbaStores.map(s => s.link),
      ...selectedStores.map(s => s.link)
    ]);

    return allStores.filter((store: any) =>
      !excludedLinks.has(store.link) &&
      (store.name?.toLowerCase().includes(searchLower) ||
      store.city?.toLowerCase().includes(searchLower) ||
      store.state?.toLowerCase().includes(searchLower) ||
      store.address?.toLowerCase().includes(searchLower))
    );
  }, [allStores, storeSearch, currentDbaStores, selectedStores]);

  const hasUnsavedChanges = useStoreDetailsUnsavedChanges(formData, initialData);

  useStoreDetailsRowInitialization({
    row,
    open,
    storeSheetId,
    franchiseContext,
    dbaStores,
    multiLocationMode,
    dbaName,
    setFormData,
    setInitialData,
    setMultiLocationMode,
    setDbaName,
    setCurrentDbaStores,
    setSelectedStores,
    activeRowLink,
    setActiveRowLink,
  });

  const { markPocFieldManuallyEdited } = useStoreDetailsNotesAutodetect(
    formData,
    setFormData,
    setInitialData,
  );
  const { showAssistant, autoLoadScript, handleShowAssistantChange, handleAutoLoadScriptChange } =
    useStoreDetailsAssistantPreferences(open, userPreferences);

  const upsertTrackerFieldsMutation = useStoreDetailsUpsertTrackerFieldsMutation(queryClient);
  const saveMutation = useStoreDetailsSaveMutation({
    formData,
    initialData,
    storeSheetId,
    row,
    multiLocationMode,
    dbaName,
    currentUser,
    toast,
    queryClient,
    trackerSheetId,
    showAssistant,
    setContextUpdateTrigger,
    onOpenChange,
    setInitialData,
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    markPocFieldManuallyEdited(field);
  };
  const { handleUnclaim, handleSave, handleSaveAndExit, handleCallFromDetails } = useStoreDetailsActions({
    formData,
    initialData,
    row,
    toast,
    queryClient,
    refetch,
    onOpenChange,
    saveMutation,
    voip,
  });

  const { showUnsavedWarning, setShowUnsavedWarning, handleClose, handleConfirmClose } =
    useStoreDetailsCloseGuard(hasUnsavedChanges, onOpenChange);

  return (
    <StoreDetailsDialogRender
      open={open}
      showUnsavedWarning={showUnsavedWarning}
      setShowUnsavedWarning={setShowUnsavedWarning}
      handleConfirmClose={handleConfirmClose}
      handleClose={handleClose}
      showAssistant={showAssistant}
      autoLoadScript={autoLoadScript}
      formData={formData}
      getStoreName={getStoreName}
      handleAutoLoadScriptChange={handleAutoLoadScriptChange}
      handleInputChange={handleInputChange}
      handleShowAssistantChange={handleShowAssistantChange}
      handleUnclaim={handleUnclaim}
      initialData={initialData}
      nextStore={nextStore}
      onNavigateToStore={onNavigateToStore}
      prevStore={prevStore}
      row={row}
      saveMutation={saveMutation}
      dbaName={dbaName}
      contextUpdateTrigger={contextUpdateTrigger}
      loadDefaultScriptTrigger={loadDefaultScriptTrigger}
      trackerSheetId={trackerSheetId}
      setInitialData={setInitialData}
      sensors={sensors}
      handleDragEnd={handleDragEnd}
      sectionOrder={sectionOrder}
      corporateAddress={corporateAddress}
      corporateCity={corporateCity}
      corporateEmail={corporateEmail}
      corporatePhone={corporatePhone}
      corporateState={corporateState}
      currentDbaStores={currentDbaStores}
      currentUser={currentUser}
      headOfficeLink={headOfficeLink}
      isClaiming={isClaiming}
      isSavingReminder={isSavingReminder}
      multiLocationMode={multiLocationMode}
      onOpenChange={onOpenChange}
      parentCreationType={parentCreationType}
      parentPocEmail={parentPocEmail}
      parentPocName={parentPocName}
      parentPocPhone={parentPocPhone}
      queryClient={queryClient}
      refetch={refetch}
      reminderSectionOpen={reminderSectionOpen}
      selectedParentLink={selectedParentLink}
      selectedStores={selectedStores}
      setCorporateAddress={setCorporateAddress}
      setCorporateCity={setCorporateCity}
      setCorporateEmail={setCorporateEmail}
      setCorporatePhone={setCorporatePhone}
      setCorporateState={setCorporateState}
      setCurrentDbaStores={setCurrentDbaStores}
      setDbaName={setDbaName}
      setHeadOfficeLink={setHeadOfficeLink}
      setIsClaiming={setIsClaiming}
      setIsSavingReminder={setIsSavingReminder}
      setMultiLocationMode={setMultiLocationMode}
      setParentCreationType={setParentCreationType}
      setParentPocEmail={setParentPocEmail}
      setParentPocName={setParentPocName}
      setParentPocPhone={setParentPocPhone}
      setParseLocationsDialog={setParseLocationsDialog}
      setReminderSectionOpen={setReminderSectionOpen}
      setSelectedParentLink={setSelectedParentLink}
      setSelectedStores={setSelectedStores}
      setStoreSearch={setStoreSearch}
      setStoreSearchDialog={setStoreSearchDialog}
      statusColors={statusColors}
      statusOptions={statusOptions}
      storeSheetId={storeSheetId}
      toast={toast}
      upsertTrackerFieldsMutation={upsertTrackerFieldsMutation}
      userPreferences={userPreferences}
      childLocations={childLocations}
      currentStoreLink={currentStoreLink}
      refetchChildren={refetchChildren}
      currentColors={currentColors}
      handleCallFromDetails={handleCallFromDetails}
      handleSave={handleSave}
      handleSaveAndExit={handleSaveAndExit}
      voip={voip}
      storeSearchDialog={storeSearchDialog}
      filteredStores={filteredStores}
      isLoadingStores={isLoadingStores}
      parseLocationsDialog={parseLocationsDialog}
      getRowValue={getRowValue}
      storeSearch={storeSearch}
    />
  );
}
