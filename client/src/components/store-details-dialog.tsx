import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { Loader2, Save, Phone, ExternalLink, Sparkles, Search, ChevronDown, Plus, Check, ChevronsUpDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { debug } from "@/lib/debug";
import { format } from "date-fns";
import { QuickReminder } from "@/components/quick-reminder";
import { normalizeLink } from "@shared/linkUtils";
import { InlineAIChatEnhanced } from "@/components/inline-ai-chat-enhanced";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";

// US States and Canadian Provinces
const US_STATES_AND_PROVINCES = [
  'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut', 'Delaware', 'Florida', 'Georgia',
  'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky', 'Louisiana', 'Maine', 'Maryland',
  'Massachusetts', 'Michigan', 'Minnesota', 'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire', 'New Jersey',
  'New Mexico', 'New York', 'North Carolina', 'North Dakota', 'Ohio', 'Oklahoma', 'Oregon', 'Pennsylvania', 'Rhode Island', 'South Carolina',
  'South Dakota', 'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington', 'West Virginia', 'Wisconsin', 'Wyoming',
  'Alberta', 'British Columbia', 'Manitoba', 'New Brunswick', 'Newfoundland and Labrador', 'Northwest Territories',
  'Nova Scotia', 'Nunavut', 'Ontario', 'Prince Edward Island', 'Quebec', 'Saskatchewan', 'Yukon'
];

// Helper function: Case-insensitive lookup for link value
const getLinkValue = (row: any): string | undefined => {
  if (!row) return undefined;

  // Iterate over all row keys and find the one that matches "link" (case-insensitive)
  for (const key in row) {
    if (key.toLowerCase().trim() === "link") {
      const value = row[key];
      // Return the value if it's a non-empty string
      if (typeof value === "string" && value.trim()) {
        return value.trim();
      }
    }
  }

  return undefined;
};

// Store Details Dialog Component
export function StoreDetailsDialog({ open, onOpenChange, row, trackerSheetId, storeSheetId, refetch, franchiseContext, currentColors, statusOptions, statusColors, contextUpdateTrigger, setContextUpdateTrigger, loadDefaultScriptTrigger }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  row: any;
  trackerSheetId: string | undefined;
  storeSheetId: string | undefined;
  currentColors: any;
  refetch: () => Promise<any>;
  franchiseContext?: {
    brandName: string;
    allLocations: any[];
  };
  statusOptions: string[];
  statusColors: { [status: string]: { background: string; text: string } };
  contextUpdateTrigger: number;
  setContextUpdateTrigger: (value: number | ((prev: number) => number)) => void;
  loadDefaultScriptTrigger: number;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: currentUser } = useQuery<{ id: string; email?: string; role?: string; agentName?: string }>({ queryKey: ['/api/auth/user'] });

  // Fetch user preferences for timezone and time format
  const { data: userPreferences } = useQuery<{ timezone?: string; defaultTimezoneMode?: string; timeFormat?: string; autoLoadScript?: boolean }>({
    queryKey: ['/api/user/preferences'],
  });

  const [formData, setFormData] = useState({
    name: "",
    type: "",
    link: "",
    address: "",
    city: "",
    state: "",
    phone: "",
    website: "",
    email: "",
    sales_ready_summary: "",
    notes: "",
    point_of_contact: "",
    poc_email: "",
    poc_phone: "",
    status: "",
    follow_up_date: "",
    next_action: "",
    open: "TRUE",
    dba: "",
    parent_link: "",
    is_parent: "",
    head_office_link: "",
  });

  // Track initial data to determine what changed
  const [initialData, setInitialData] = useState(formData);

  // Multiple Locations feature state
  const [multiLocationMode, setMultiLocationMode] = useState(false);
  const [dbaName, setDbaName] = useState("");
  const [dbaCity, setDbaCity] = useState("");
  const [dbaState, setDbaState] = useState("");
  const [dbaType, setDbaType] = useState("");
  const [stateComboboxOpen, setStateComboboxOpen] = useState(false);
  const [currentDbaStores, setCurrentDbaStores] = useState<Array<{ link: string; name: string }>>([]);
  const [selectedStores, setSelectedStores] = useState<Array<{ link: string; name: string }>>([]);
  const [storeSearchDialog, setStoreSearchDialog] = useState(false);
  const [storeSearch, setStoreSearch] = useState("");

  // Parent DBA management state
  const [parentCreationType, setParentCreationType] = useState<'new' | 'existing'>('new');
  const [selectedParentLink, setSelectedParentLink] = useState<string>('');
  const [headOfficeLink, setHeadOfficeLink] = useState<string>('none');
  const [parentPocName, setParentPocName] = useState('');
  const [parentPocEmail, setParentPocEmail] = useState('');
  const [parentPocPhone, setParentPocPhone] = useState('');
  const [parentAddress, setParentAddress] = useState('');
  const [parentCity, setParentCity] = useState('');
  const [parentState, setParentState] = useState('');
  const [parentPhone, setParentPhone] = useState('');
  const [parentEmail, setParentEmail] = useState('');

  // Child locations management
  const currentStoreLink = getLinkValue(row);
  const { data: childLocations, refetch: refetchChildren } = useQuery({
    queryKey: ['/api/dba/children', currentStoreLink],
    enabled: !!currentStoreLink && open,
  });

  // Track the current row's link to prevent race conditions
  const [activeRowLink, setActiveRowLink] = useState<string | null>(null);

  // Preserve franchise context for the entire dialog lifecycle
  const [preservedFranchiseContext, setPreservedFranchiseContext] = useState<{
    brandName: string;
    allLocations: any[];
  } | null>(null);

  // State for collapsible reminder section
  const [reminderSectionOpen, setReminderSectionOpen] = useState(false);

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

  // Check if there are unsaved changes
  const hasUnsavedChanges = useMemo(() => {
    return Object.keys(formData).some((key) => {
      const typedKey = key as keyof typeof formData;
      return formData[typedKey] !== initialData[typedKey];
    });
  }, [formData, initialData]);

  // Populate form directly from row data when dialog opens
  useEffect(() => {
    if (row && open) {
      // Preserve franchise context when dialog first opens
      if (franchiseContext) {
        setPreservedFranchiseContext(franchiseContext);
      }

      // Helper function to get value from various possible field names (case-insensitive)
      // Checks both top-level row properties and nested row.data (for Agent Dashboard compatibility)
      // Handles Google Sheets headers with trailing spaces and inconsistent casing
      const getValue = (fieldNames: string[]) => {
        for (const fieldName of fieldNames) {
          const normalizedFieldName = fieldName.trim().toLowerCase();

          // Try exact match on top-level row first
          if (row[fieldName] !== undefined && row[fieldName] !== null) return row[fieldName];

          // Try case-insensitive + trimmed match on top-level row
          const key = Object.keys(row).find(k => k.trim().toLowerCase() === normalizedFieldName);
          if (key && row[key] !== undefined && row[key] !== null) return row[key];

          // Try exact match in row.data (for Agent Dashboard which may pass nested data)
          if (row.data && row.data[fieldName] !== undefined && row.data[fieldName] !== null) {
            return row.data[fieldName];
          }

          // Try case-insensitive + trimmed match in row.data
          if (row.data) {
            const dataKey = Object.keys(row.data).find(k => k.trim().toLowerCase() === normalizedFieldName);
            if (dataKey && row.data[dataKey] !== undefined && row.data[dataKey] !== null) {
              return row.data[dataKey];
            }
          }
        }
        return "";
      };

      const populatedData = {
        name: getValue(['Name', 'name']),
        type: getValue(['Type', 'type']),
        link: getValue(['Link', 'link']),
        address: getValue(['Address', 'address']),
        city: getValue(['City', 'city']),
        state: getValue(['State', 'state']),
        phone: getValue(['Phone', 'phone']),
        website: getValue(['Website', 'website']),
        email: getValue(['Email', 'email']),
        sales_ready_summary: getValue(['Sales-ready Summary', 'sales_ready_summary', 'Vibe Score']),
        notes: getValue(['Notes', 'notes']),
        point_of_contact: getValue(['Point of Contact', 'point_of_contact', 'POC']),
        poc_email: getValue(['POC Email', 'poc_email']),
        poc_phone: getValue(['POC Phone', 'poc_phone']),
        status: getValue(['Status', 'status']),
        follow_up_date: getValue(['Follow-Up Date', 'follow_up_date']),
        next_action: getValue(['Next Action', 'next_action']),
        open: getValue(['Open', 'open']) || "TRUE",
        dba: getValue(['DBA', 'dba']),
        parent_link: getValue(['Parent Link', 'parent_link']),
        is_parent: getValue(['Is Parent', 'is_parent']),
        head_office_link: getValue(['Head Office Link', 'head_office_link']),
      };
      setFormData(populatedData);
      setInitialData(populatedData);

      // Set dbaState from populated data
      setDbaState(populatedData.state);

      // Track the active row to prevent race conditions
      const currentLink = getValue(['Link', 'link']);
      setActiveRowLink(currentLink);

      // Check if this store has a DBA - if yes, auto-enable Multiple Locations mode
      const existingDba = getValue(['DBA', 'dba']);

      // Use preserved franchise context for consistent behavior during dialog lifecycle
      const activeFranchiseContext = preservedFranchiseContext || franchiseContext;

      // Priority 1: Franchise context (from Franchise Finder)
      if (activeFranchiseContext && activeFranchiseContext.allLocations && activeFranchiseContext.allLocations.length > 0) {
        setMultiLocationMode(true);
        setDbaName(activeFranchiseContext.brandName);
        // Pre-select all franchise locations (with guards for missing data)
        const validLocations = activeFranchiseContext.allLocations
          .map((loc: any) => {
            const link = loc.link || loc.Link;
            const name = loc.name || loc.Name;
            // Only include if both link and name are present
            return link && name ? { link, name } : null;
          })
          .filter((loc): loc is { link: string; name: string } => loc !== null);

        if (validLocations.length > 0) {
          setSelectedStores(validLocations);
        } else {
          setSelectedStores([]);
        }
        setCurrentDbaStores([]);
      }
      // Priority 2: Existing DBA
      else if (existingDba && existingDba.trim()) {
        setMultiLocationMode(true);
        setDbaName(existingDba.trim());
        // Clear both current and selected stores
        setCurrentDbaStores([]);
        setSelectedStores([]);
        // Let the dbaStores query populate currentDbaStores when it completes
      }
      // Priority 3: No DBA or franchise
      else {
        setMultiLocationMode(false);
        setDbaName("");
        setCurrentDbaStores([]);
        setSelectedStores([]);
      }
    } else if (!open) {
      // Reset state when dialog closes
      setActiveRowLink(null);
      setPreservedFranchiseContext(null);
    }
  }, [row, open, storeSheetId, franchiseContext]);

  // Auto-populate currentDbaStores when dbaStores query completes
  useEffect(() => {
    if (dbaStores && Array.isArray(dbaStores) && multiLocationMode && activeRowLink && dbaName) {
      setCurrentDbaStores(dbaStores.map((s: any) => ({ link: s.link, name: s.name })));
      // Clear selectedStores since we're showing existing DBA stores
      setSelectedStores([]);
    }
  }, [dbaStores, multiLocationMode, activeRowLink, dbaName]);

  // Auto-detect emails and phone numbers from Notes field
  // Only auto-populate if the POC field hasn't been manually edited
  const [pocFieldsManuallyEdited, setPocFieldsManuallyEdited] = useState({
    email: false,
    phone: false
  });

  useEffect(() => {
    if (formData.notes && formData.notes.trim()) {
      // Email regex - matches most common email formats (fixed character class)
      const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;
      // Phone regex - matches various formats: (555) 123-4567, 555-123-4567, 555.123.4567, 5551234567
      const phoneRegex = /\b(\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g;

      const emails = formData.notes.match(emailRegex);
      const phones = formData.notes.match(phoneRegex);

      let updated = false;
      let emailToSet = '';
      let phoneToSet = '';

      // Auto-populate POC Email if found and hasn't been manually edited
      if (emails && emails.length > 0 && !pocFieldsManuallyEdited.email) {
        emailToSet = emails[0];
        if (emailToSet !== formData.poc_email) {
          setFormData(prev => ({ ...prev, poc_email: emailToSet }));
          updated = true;
        }
      }

      // Auto-populate POC Phone if found and hasn't been manually edited
      if (phones && phones.length > 0 && !pocFieldsManuallyEdited.phone) {
        // Format phone number to international format: +1 (xxx) xxx-xxxx
        const rawPhone = phones[0].replace(/\D/g, ''); // Remove all non-digits
        let formatted = rawPhone;

        // If it's a 10-digit number, format it
        if (rawPhone.length === 10) {
          formatted = `+1 (${rawPhone.slice(0, 3)}) ${rawPhone.slice(3, 6)}-${rawPhone.slice(6)}`;
        }
        // If it's 11 digits starting with 1, format it
        else if (rawPhone.length === 11 && rawPhone.startsWith('1')) {
          formatted = `+1 (${rawPhone.slice(1, 4)}) ${rawPhone.slice(4, 7)}-${rawPhone.slice(7)}`;
        }

        phoneToSet = formatted;
        if (phoneToSet !== formData.poc_phone) {
          setFormData(prev => ({ ...prev, poc_phone: phoneToSet }));
          updated = true;
        }
      }

      // DO NOT update initialData - we want auto-detected values to be saved when user clicks Save
      // They should be treated as unsaved changes so they get written to Google Sheets
    } else {
      // If notes are cleared, clear POC fields if they haven't been manually edited
      // DO NOT update initialData - let the user save the cleared values
      if (!pocFieldsManuallyEdited.email && formData.poc_email) {
        setFormData(prev => ({ ...prev, poc_email: '' }));
      }
      if (!pocFieldsManuallyEdited.phone && formData.poc_phone) {
        setFormData(prev => ({ ...prev, poc_phone: '' }));
      }
    }
  }, [formData.notes, pocFieldsManuallyEdited]);

  // Field to sheet/column mapping
  const fieldToSheetMapping: Record<string, { sheet: 'store' | 'tracker'; column: string }> = {
    name: { sheet: 'store', column: 'Name' },
    type: { sheet: 'store', column: 'Type' },
    link: { sheet: 'store', column: 'Link' },
    address: { sheet: 'store', column: 'Address' },
    city: { sheet: 'store', column: 'City' },
    state: { sheet: 'store', column: 'State' },
    phone: { sheet: 'store', column: 'Phone' },
    website: { sheet: 'store', column: 'Website' },
    email: { sheet: 'store', column: 'Email' },
    sales_ready_summary: { sheet: 'store', column: 'Sales-ready Summary' },
    open: { sheet: 'store', column: 'Open' },
    notes: { sheet: 'tracker', column: 'Notes' },
    point_of_contact: { sheet: 'tracker', column: 'Point of Contact' },
    poc_email: { sheet: 'tracker', column: 'POC Email' },
    poc_phone: { sheet: 'tracker', column: 'POC Phone' },
    status: { sheet: 'tracker', column: 'Status' },
    follow_up_date: { sheet: 'tracker', column: 'Follow-Up Date' },
    next_action: { sheet: 'tracker', column: 'Next Action' },
  };

  // Mutation to upsert tracker fields (for reminder auto-save)
  const upsertTrackerFieldsMutation = useMutation({
    mutationFn: async ({
      link,
      updates,
    }: {
      link: string;
      updates: Record<string, string>;
    }) => {
      return await apiRequest('POST', '/api/sheets/tracker/upsert', {
        link,
        updates,
      });
    },
    onMutate: async (variables) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["merged-data"] });

      // Snapshot previous data
      const previousData = queryClient.getQueryData(["merged-data"]);

      // Optimistically update cache
      queryClient.setQueryData(["merged-data"], (old: any) => {
        if (!old || !old.rows) return old;

        return {
          ...old,
          rows: old.rows.map((r: any) => {
            const rowLink = getLinkValue(r);
            if (rowLink && normalizeLink(rowLink) === normalizeLink(variables.link)) {
              return { ...r, ...variables.updates };
            }
            return r;
          })
        };
      });

      return { previousData };
    },
    onError: (error: Error, variables, context: any) => {
      // Rollback on error
      if (context?.previousData) {
        queryClient.setQueryData(["merged-data"], context.previousData);
      }
    },
    onSettled: () => {
      // Always refetch to sync with server
      queryClient.invalidateQueries({ queryKey: ["merged-data"] });
    },
  });

  // Save mutation - update cells directly
  const saveMutation = useMutation({
    mutationFn: async ({ closeDialog }: { closeDialog: boolean }) => {
      // Separate Store Database fields from Commission Tracker fields
      const storeChanges: Array<{ sheetId: string; rowIndex: number; column: string; value: string }> = [];
      const trackerChanges: Record<string, string> = {};

      Object.keys(formData).forEach((key) => {
        const typedKey = key as keyof typeof formData;
        if (formData[typedKey] !== initialData[typedKey]) {
          const mapping = fieldToSheetMapping[key];
          if (mapping) {
            if (mapping.sheet === 'store') {
              // Store Database - direct update
              const sheetId = storeSheetId;
              const rowIndex = row._storeRowIndex;

              if (sheetId && rowIndex) {
                storeChanges.push({
                  sheetId,
                  rowIndex,
                  column: mapping.column,
                  value: formData[typedKey]
                });
              }
            } else {
              // Commission Tracker - use upsert (create row if doesn't exist)
              trackerChanges[mapping.column] = formData[typedKey];
            }
          }
        }
      });

      // MULTIPLE LOCATIONS MODE: Write DBA and Agent Name to Store Database
      if (multiLocationMode && dbaName && dbaName.trim()) {
        // Validate Agent Name is set
        if (!currentUser?.agentName) {
          toast({
            title: "Agent Name Required",
            description: "Please set your Agent Name in Settings before claiming stores.",
            variant: "destructive",
          });
          return;
        }

        const sheetId = storeSheetId;
        const rowIndex = row._storeRowIndex;

        if (sheetId && rowIndex) {
          // Add DBA change
          storeChanges.push({
            sheetId,
            rowIndex,
            column: 'DBA',
            value: dbaName.trim()
          });

          // Add Agent Name change
          storeChanges.push({
            sheetId,
            rowIndex,
            column: 'Agent Name',
            value: currentUser.agentName
          });
        }
      }

      if (storeChanges.length === 0 && Object.keys(trackerChanges).length === 0) {
        throw new Error("No changes to save");
      }

      const promises = [];

      // Save store changes
      if (storeChanges.length > 0) {
        promises.push(
          ...storeChanges.map(({ sheetId, rowIndex, column, value }) =>
            apiRequest('PUT', `/api/sheets/${sheetId}/update`, { rowIndex, column, value })
          )
        );
      }

      // Save tracker changes (create row if needed)
      if (Object.keys(trackerChanges).length > 0) {
        const link = formData.link || getLinkValue(row);
        if (!link) {
          throw new Error("Cannot save tracker fields: Store link is missing");
        }

        promises.push(
          apiRequest('POST', '/api/sheets/tracker/upsert', { link, updates: trackerChanges })
        );
      }

      await Promise.all(promises);
      return { closeDialog, storeChanges, trackerChanges };
    },
    onMutate: async (variables) => {
      // Cancel any outgoing refetches to avoid overwriting our optimistic update
      await queryClient.cancelQueries({ queryKey: ["merged-data"] });

      // Snapshot the previous value
      const previousData = queryClient.getQueryData(["merged-data"]);

      // Optimistically update the cache with the new formData values
      queryClient.setQueryData(["merged-data"], (old: any) => {
        if (!old || !old.rows) return old;

        return {
          ...old,
          rows: old.rows.map((r: any) => {
            // Match the row being edited
            const rowLink = getLinkValue(r);
            const currentRowLink = getLinkValue(row);
            if (rowLink && currentRowLink && normalizeLink(rowLink) === normalizeLink(currentRowLink)) {
              // Apply all formData changes to this row
              return { ...r, ...formData };
            }
            return r;
          })
        };
      });

      // Return context with the snapshot so we can rollback on error
      return { previousData };
    },
    onSuccess: async (data) => {
      setInitialData(formData); // Update initial data so changes are no longer "unsaved"

      // Auto-claim unclaimed stores after successfully saving (if not already claimed via tracker upsert)
      const isUnclaimed = !row._trackerRowIndex;
      const linkValue = formData.link || getLinkValue(row);
      const joinColumn = "link";

      if (isUnclaimed && linkValue && trackerSheetId) {
        try {
          await apiRequest("POST", `/api/sheets/${trackerSheetId}/claim-store`, {
            linkValue,
            column: "Agent",  // Claim with Agent column
            value: "",  // Empty value, just claiming
            joinColumn,
          });
        } catch (error) {
          // Soft error - don't block the user
          console.error("Auto-claim failed:", error);
        }
      }

      // If AI Assistant is open, trigger context update with latest field values
      if (showAssistant) {
        setContextUpdateTrigger(prev => prev + 1);
      }

      // Only close if requested
      if (data?.closeDialog) {
        onOpenChange(false);
      }
    },
    onError: (error: Error, variables, context: any) => {
      // Rollback to the previous value on error
      if (context?.previousData) {
        queryClient.setQueryData(["merged-data"], context.previousData);
      }
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
    onSettled: () => {
      // Always refetch after error or success to sync with server
      queryClient.invalidateQueries({ queryKey: ["merged-data"] });
    },
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));

    // Mark POC fields as manually edited when user changes them
    if (field === 'poc_email') {
      setPocFieldsManuallyEdited(prev => ({ ...prev, email: true }));
    } else if (field === 'poc_phone') {
      setPocFieldsManuallyEdited(prev => ({ ...prev, phone: true }));
    }
  };

  // Manual re-detection function
  const handleReDetect = () => {
    if (!formData.notes || !formData.notes.trim()) return;

    // Email regex - matches most common email formats (fixed character class)
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;
    // Phone regex - matches various formats
    const phoneRegex = /\b(\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g;

    const emails = formData.notes.match(emailRegex);
    const phones = formData.notes.match(phoneRegex);

    // Update email if found
    if (emails && emails.length > 0) {
      setFormData(prev => ({ ...prev, poc_email: emails[0] }));
      setInitialData(prev => ({ ...prev, poc_email: emails[0] }));
      setPocFieldsManuallyEdited(prev => ({ ...prev, email: false }));
    }

    // Update phone if found
    if (phones && phones.length > 0) {
      const rawPhone = phones[0].replace(/\D/g, '');
      let formatted = rawPhone;

      if (rawPhone.length === 10) {
        formatted = `+1 (${rawPhone.slice(0, 3)}) ${rawPhone.slice(3, 6)}-${rawPhone.slice(6)}`;
      } else if (rawPhone.length === 11 && rawPhone.startsWith('1')) {
        formatted = `+1 (${rawPhone.slice(1, 4)}) ${rawPhone.slice(4, 7)}-${rawPhone.slice(7)}`;
      }

      setFormData(prev => ({ ...prev, poc_phone: formatted }));
      setInitialData(prev => ({ ...prev, poc_phone: formatted }));
      setPocFieldsManuallyEdited(prev => ({ ...prev, phone: false }));
    }
  };

  const handleSave = () => {
    saveMutation.mutate({ closeDialog: false });
  };

  const handleSaveAndExit = () => {
    saveMutation.mutate({ closeDialog: true });
  };

  // Handle calling the store from the details dialog
  const handleCallFromDetails = async () => {
    // Use POC phone if available, fallback to regular phone
    const phoneNumber = formData.poc_phone || formData.phone;

    if (!phoneNumber) {
      toast({
        title: "No Phone Number",
        description: "This store doesn't have a phone number on file",
        variant: "destructive",
      });
      return;
    }

    const storeLink = formData.link;

    if (!storeLink) {
      toast({
        title: "Error",
        description: "Unable to identify store for call logging",
        variant: "destructive",
      });
      return;
    }

    // Log the call to history
    try {
      await apiRequest('POST', '/api/call-history', {
        storeLink,
        phoneNumber,
        storeName: formData.name || 'Unknown Store',
      });
    } catch (error) {
      console.error('Failed to log call:', error);
      // Don't block the call if logging fails
    }

    // Dial the phone
    window.location.href = `tel:${phoneNumber}`;
  };

  // AI Assistant toggle - global setting (applies to all stores)
  const GLOBAL_AI_ASSISTANT_KEY = 'show-ai-assistant';

  const [showAssistant, setShowAssistant] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(GLOBAL_AI_ASSISTANT_KEY);
      return saved === 'true';
    }
    return false;
  });

  // Re-sync showAssistant from localStorage when dialog opens
  useEffect(() => {
    if (typeof window !== 'undefined' && open) {
      const saved = localStorage.getItem(GLOBAL_AI_ASSISTANT_KEY);
      setShowAssistant(saved === 'true');
    }
  }, [open]);

  // Handler to update showAssistant and persist to localStorage
  const handleShowAssistantChange = (checked: boolean) => {
    setShowAssistant(checked);
    if (typeof window !== 'undefined') {
      localStorage.setItem(GLOBAL_AI_ASSISTANT_KEY, String(checked));
    }
  };

  // Auto Load Script preference (from database)
  const [autoLoadScript, setAutoLoadScript] = useState<boolean>(true);

  // Load autoLoadScript from userPreferences
  useEffect(() => {
    if (userPreferences) {
      setAutoLoadScript(userPreferences.autoLoadScript ?? true);
    }
  }, [userPreferences]);

  // Mutation to update autoLoadScript preference
  const updateAutoLoadScriptMutation = useMutation({
    mutationFn: async (enabled: boolean) => {
      const response = await fetch('/api/user/preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ autoLoadScript: enabled }),
      });
      if (!response.ok) throw new Error('Failed to update preference');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/user/preferences'] });
    },
  });

  // Handler to update autoLoadScript and persist to database
  const handleAutoLoadScriptChange = (checked: boolean) => {
    setAutoLoadScript(checked);
    updateAutoLoadScriptMutation.mutate(checked);
  };

  // Handle close with unsaved changes warning
  const [showUnsavedWarning, setShowUnsavedWarning] = useState(false);

  const handleClose = () => {
    if (hasUnsavedChanges) {
      setShowUnsavedWarning(true);
    } else {
      onOpenChange(false);
    }
  };

  const handleConfirmClose = () => {
    setShowUnsavedWarning(false);
    onOpenChange(false);
  };

  return (
    <>
      <AlertDialog open={showUnsavedWarning} onOpenChange={setShowUnsavedWarning}>
        <AlertDialogContent data-testid="alert-unsaved-changes">
          <AlertDialogHeader>
            <AlertDialogTitle>Unsaved Changes</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes. Are you sure you want to close without saving?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-close">Keep Editing</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmClose} data-testid="button-confirm-close">
              Close Without Saving
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className={showAssistant ? "max-w-[95vw] h-[95vh] overflow-hidden flex flex-col" : "max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"}>
          <DialogHeader>
            <DialogTitle className="text-center">Store Details</DialogTitle>
            <DialogDescription>
              View and edit store information, contact details, and notes
            </DialogDescription>
            <div className="flex items-center justify-between gap-4 pt-2">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="show-assistant"
                    checked={showAssistant}
                    onCheckedChange={(checked) => handleShowAssistantChange(!!checked)}
                    data-testid="checkbox-show-assistant"
                  />
                  <Label
                    htmlFor="show-assistant"
                    className="text-sm font-medium cursor-pointer whitespace-nowrap flex items-center gap-1"
                  >
                    <Sparkles className="h-3 w-3" />
                    Show AI Assistant
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="auto-load-script"
                    checked={autoLoadScript}
                    onCheckedChange={(checked) => handleAutoLoadScriptChange(!!checked)}
                    data-testid="checkbox-auto-load-script"
                  />
                  <Label
                    htmlFor="auto-load-script"
                    className="text-sm font-medium cursor-pointer whitespace-nowrap flex items-center gap-1"
                  >
                    Auto Load Script
                  </Label>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="listing-active"
                  checked={formData.open === "TRUE" || formData.open === "true"}
                  onCheckedChange={(checked) => handleInputChange('open', checked ? "TRUE" : "FALSE")}
                  data-testid="checkbox-listing-active"
                />
                <Label
                  htmlFor="listing-active"
                  className="text-sm font-medium cursor-pointer whitespace-nowrap"
                >
                  Listing Active
                </Label>
              </div>
            </div>
          </DialogHeader>

          <div className="flex gap-4 overflow-hidden flex-1">
            {/* AI Assistant Panel - NOW ON LEFT */}
            {showAssistant && (
              <div className="w-1/2 border-r pr-4 flex flex-col overflow-hidden">
                <InlineAIChatEnhanced
                  storeContext={{
                    sales_ready_summary: formData.sales_ready_summary,
                    notes: formData.notes,
                    point_of_contact: formData.point_of_contact,
                    poc_email: formData.poc_email,
                    poc_phone: formData.poc_phone,
                    status: formData.status,
                    follow_up_date: formData.follow_up_date,
                    next_action: formData.next_action,
                    dba: dbaName,
                    name: formData.name,
                    type: formData.type,
                    link: formData.link,
                    address: formData.address,
                    city: formData.city,
                    state: formData.state,
                    phone: formData.phone,
                    email: formData.email,
                    website: formData.website,
                  }}
                  contextUpdateTrigger={contextUpdateTrigger}
                  loadDefaultScriptTrigger={loadDefaultScriptTrigger}
                />
              </div>
            )}

            {/* Store Details Content - NOW ON RIGHT */}
            <div className={showAssistant ? "w-1/2 flex flex-col overflow-hidden pl-2" : "w-full flex flex-col overflow-hidden"}>
              {!row ? (
                <div className="flex items-center justify-center h-64">
                  <p>No store data available</p>
                </div>
              ) : (
                <>
                  <div className="flex-1 overflow-y-auto">
                    <Accordion type="multiple" defaultValue={["sales-info"]} className="w-full" data-testid="accordion-store-details">
                      {/* Sales Info - AT THE TOP - EXPANDED BY DEFAULT */}
                      <AccordionItem value="sales-info" data-testid="accordion-item-sales-info">
                        <AccordionTrigger className="text-lg font-semibold" data-testid="trigger-sales-info">
                          Sales Info
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="space-y-4 pt-2">
                            <div className="space-y-2">
                              <Label htmlFor="sales_ready_summary">Sales-ready Summary</Label>
                              <Textarea
                                id="sales_ready_summary"
                                data-testid="input-sales-ready-summary"
                                value={formData.sales_ready_summary}
                                onChange={(e) => handleInputChange('sales_ready_summary', e.target.value)}
                                placeholder="Summary for sales team..."
                                rows={4}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="notes">Notes</Label>
                              <Textarea
                                id="notes"
                                data-testid="input-notes"
                                value={formData.notes}
                                onChange={(e) => handleInputChange('notes', e.target.value)}
                                placeholder="Call notes, contact info from store worker..."
                                rows={4}
                              />
                            </div>

                            {/* Multiple Locations Feature */}
                            <div className="space-y-4 pt-4 border-t">
                              <div className="flex items-center space-x-2">
                                <Checkbox
                                  id="multiple_locations"
                                  checked={multiLocationMode}
                                  onCheckedChange={(checked) => {
                                    setMultiLocationMode(checked as boolean);
                                    if (!checked) {
                                      setSelectedStores([]);
                                      setCurrentDbaStores([]);
                                      setDbaName("");
                                      setStoreSearch("");
                                    }
                                  }}
                                  data-testid="checkbox-multiple-locations"
                                />
                                <Label htmlFor="multiple_locations" className="cursor-pointer font-medium">
                                  Multiple Locations (claim DBA with multiple stores)
                                </Label>
                              </div>

                              {multiLocationMode && (
                                <div className="space-y-4 pl-6 border-l-2 border-primary/20">
                                  <div className="space-y-2">
                                    <Label htmlFor="dba_name">DBA / Company Name</Label>
                                    <Input
                                      id="dba_name"
                                      data-testid="input-dba-name"
                                      value={dbaName}
                                      onChange={(e) => setDbaName(e.target.value)}
                                      placeholder="e.g., House of Dank, Green Thumb Industries"
                                    />
                                  </div>

                                  {/* Parent creation type */}
                                  <div className="space-y-3 p-3 bg-muted/30 rounded-md">
                                    <Label>Parent Record</Label>
                                    <div className="space-y-2">
                                      <div className="flex items-center space-x-2">
                                        <Checkbox
                                          id="parent-new"
                                          checked={parentCreationType === 'new'}
                                          onCheckedChange={(checked) => {
                                            if (checked) {
                                              setParentCreationType('new');
                                              setSelectedParentLink('');
                                            }
                                          }}
                                          data-testid="checkbox-parent-new"
                                        />
                                        <Label htmlFor="parent-new" className="cursor-pointer font-normal">
                                          Create new parent (Corporate Office)
                                        </Label>
                                      </div>
                                      <div className="flex items-center space-x-2">
                                        <Checkbox
                                          id="parent-existing"
                                          checked={parentCreationType === 'existing'}
                                          onCheckedChange={(checked) => {
                                            if (checked) {
                                              setParentCreationType('existing');
                                              if (selectedStores.length > 0) {
                                                setSelectedParentLink(selectedStores[0].link);
                                              }
                                            }
                                          }}
                                          data-testid="checkbox-parent-existing"
                                        />
                                        <Label htmlFor="parent-existing" className="cursor-pointer font-normal">
                                          Use existing location as parent
                                        </Label>
                                      </div>
                                    </div>

                                    {/* Parent address fields (for new parent only) */}
                                    {parentCreationType === 'new' && (
                                      <div className="space-y-3 pt-2 border-t">
                                        <Label className="text-xs text-muted-foreground">Corporate Office Location</Label>
                                        <div className="grid grid-cols-1 gap-2">
                                          <Input
                                            placeholder="Address"
                                            value={parentAddress}
                                            onChange={(e) => setParentAddress(e.target.value)}
                                            data-testid="input-parent-address"
                                          />
                                          <div className="grid grid-cols-2 gap-2">
                                            <Input
                                              placeholder="City"
                                              value={parentCity}
                                              onChange={(e) => setParentCity(e.target.value)}
                                              data-testid="input-parent-city"
                                            />
                                            <Input
                                              placeholder="State"
                                              value={parentState}
                                              onChange={(e) => setParentState(e.target.value)}
                                              data-testid="input-parent-state"
                                            />
                                          </div>
                                          <Input
                                            placeholder="Phone"
                                            type="tel"
                                            value={parentPhone}
                                            onChange={(e) => setParentPhone(e.target.value)}
                                            data-testid="input-parent-phone"
                                          />
                                          <Input
                                            placeholder="Email"
                                            type="email"
                                            value={parentEmail}
                                            onChange={(e) => setParentEmail(e.target.value)}
                                            data-testid="input-parent-email"
                                          />
                                        </div>
                                        <Label className="text-xs text-muted-foreground">Corporate Contact Info (optional)</Label>
                                        <div className="grid grid-cols-1 gap-2">
                                          <Input
                                            placeholder="POC Name"
                                            value={parentPocName}
                                            onChange={(e) => setParentPocName(e.target.value)}
                                            data-testid="input-parent-poc-name"
                                          />
                                          <Input
                                            placeholder="POC Email"
                                            type="email"
                                            value={parentPocEmail}
                                            onChange={(e) => setParentPocEmail(e.target.value)}
                                            data-testid="input-parent-poc-email"
                                          />
                                          <Input
                                            placeholder="POC Phone"
                                            type="tel"
                                            value={parentPocPhone}
                                            onChange={(e) => setParentPocPhone(e.target.value)}
                                            data-testid="input-parent-poc-phone"
                                          />
                                        </div>
                                      </div>
                                    )}

                                    {/* Select parent from existing stores */}
                                    {parentCreationType === 'existing' && selectedStores.length > 0 && (
                                      <div className="space-y-2 pt-2 border-t">
                                        <Label htmlFor="select-parent">Select Parent Location</Label>
                                        <Select
                                          value={selectedParentLink}
                                          onValueChange={setSelectedParentLink}
                                        >
                                          <SelectTrigger id="select-parent" data-testid="select-parent-location">
                                            <SelectValue placeholder="Choose which location is the parent" />
                                          </SelectTrigger>
                                          <SelectContent>
                                            {selectedStores.map((store) => (
                                              <SelectItem key={store.link} value={store.link}>
                                                {store.name}
                                              </SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                      </div>
                                    )}
                                  </div>

                                  {/* Head Office selection */}
                                  {selectedStores.length > 0 && (
                                    <div className="space-y-2 p-3 bg-muted/30 rounded-md">
                                      <Label htmlFor="select-head-office">Head Office Location (optional)</Label>
                                      <p className="text-xs text-muted-foreground">
                                        Select which location is the corporate headquarters
                                      </p>
                                      <Select
                                        value={headOfficeLink}
                                        onValueChange={setHeadOfficeLink}
                                      >
                                        <SelectTrigger id="select-head-office" data-testid="select-head-office">
                                          <SelectValue placeholder="Choose head office (or skip)" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="none">None</SelectItem>
                                          {selectedStores.map((store) => (
                                            <SelectItem key={store.link} value={store.link}>
                                              {store.name}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    </div>
                                  )}

                                  {/* Current stores in DBA (read-only) */}
                                  {currentDbaStores.length > 0 && (
                                    <div className="space-y-2">
                                      <Label>Current Stores in this DBA ({currentDbaStores.length})</Label>
                                      <div className="space-y-2 max-h-40 overflow-y-auto border rounded-md p-2 bg-muted/30">
                                        {currentDbaStores.map((store) => (
                                          <div
                                            key={store.link}
                                            className="flex items-center justify-between p-2 bg-background rounded-md"
                                            data-testid={`current-store-${store.link}`}
                                          >
                                            <span className="text-sm">{store.name}</span>
                                            <Badge variant="secondary" className="text-xs">Current</Badge>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  {/* New stores being added to DBA */}
                                  <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                      <Label>Selected Locations ({selectedStores.length})</Label>
                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setStoreSearchDialog(true)}
                                        data-testid="button-add-locations"
                                      >
                                        <Search className="h-4 w-4 mr-2" />
                                        Add Locations
                                      </Button>
                                    </div>

                                    {selectedStores.length > 0 ? (
                                      <div className="space-y-2 max-h-40 overflow-y-auto border rounded-md p-2">
                                        {selectedStores.map((store) => (
                                          <div
                                            key={store.link}
                                            className="flex items-center justify-between p-2 bg-muted/50 rounded-md"
                                            data-testid={`selected-store-${store.link}`}
                                          >
                                            <span className="text-sm">{store.name}</span>
                                            <Button
                                              type="button"
                                              variant="ghost"
                                              size="sm"
                                              onClick={() => setSelectedStores(prev => prev.filter(s => s.link !== store.link))}
                                              data-testid={`button-remove-store-${store.link}`}
                                            >
                                              ×
                                            </Button>
                                          </div>
                                        ))}
                                      </div>
                                    ) : (
                                      <p className="text-sm text-muted-foreground p-2 border rounded-md bg-muted/30">
                                        No new locations selected. Click "Add Locations" to add stores to this DBA.
                                      </p>
                                    )}
                                  </div>

                                  <Button
                                    type="button"
                                    variant="default"
                                    onClick={async () => {
                                      if (selectedStores.length === 0) {
                                        toast({
                                          title: "No stores selected",
                                          description: "Please select at least one store to add to this DBA",
                                          variant: "destructive",
                                        });
                                        return;
                                      }

                                      if (parentCreationType === 'existing' && !selectedParentLink) {
                                        toast({
                                          title: "Parent not selected",
                                          description: "Please select which location should be the parent",
                                          variant: "destructive",
                                        });
                                        return;
                                      }

                                      try {
                                        const storeLinks = selectedStores.map(s => s.link);

                                        // Step 1: Claim all locations with DBA name (existing behavior)
                                        const claimResponse = await apiRequest('POST', '/api/stores/claim-multiple', {
                                          storeLinks,
                                          dbaName: dbaName.trim(),
                                          storeSheetId,
                                          trackerSheetId,
                                          isUpdatingExisting: currentDbaStores.length > 0
                                        });

                                        // Step 2: Create parent DBA record
                                        let parentLink: string;

                                        if (parentCreationType === 'new') {
                                          // Create new parent (corporate office)
                                          const parentResponse = await apiRequest('POST', '/api/dba/create-parent', {
                                            dbaName: dbaName.trim(),
                                            address: parentAddress || '',
                                            city: parentCity || '',
                                            state: parentState || '',
                                            phone: parentPhone || '',
                                            email: parentEmail || '',
                                            pocName: parentPocName || '',
                                            pocEmail: parentPocEmail || '',
                                            pocPhone: parentPocPhone || '',
                                            notes: `Corporate parent for ${dbaName.trim()}`,
                                            agentName: currentUser?.agentName || '',
                                            storeSheetId,
                                            trackerSheetId
                                          });
                                          parentLink = parentResponse.parentLink;
                                        } else {
                                          // Use existing location as parent
                                          const parentResponse = await apiRequest('POST', '/api/dba/create-parent', {
                                            dbaName: dbaName.trim(),
                                            parentLink: selectedParentLink,
                                            storeSheetId,
                                            trackerSheetId
                                          });
                                          parentLink = selectedParentLink;
                                        }

                                        // Step 3: Link all child locations to parent
                                        const childLinks = storeLinks.filter(link => link !== parentLink);
                                        if (childLinks.length > 0) {
                                          await apiRequest('POST', '/api/dba/link-children', {
                                            parentLink,
                                            childLinks
                                          });
                                        }

                                        // Step 4: Set head office if selected
                                        if (headOfficeLink && headOfficeLink !== 'none') {
                                          await apiRequest('POST', '/api/dba/set-head-office', {
                                            headOfficeLink,
                                            parentLink,
                                            mergePocInfo: true
                                          });
                                        }

                                        toast({
                                          title: "Success",
                                          description: `Claimed ${selectedStores.length} location(s) with DBA "${dbaName.trim()}" and created parent record`,
                                        });

                                        // Reset state
                                        setMultiLocationMode(false);
                                        setSelectedStores([]);
                                        setCurrentDbaStores([]);
                                        setDbaName("");
                                        setSelectedParentLink('');
                                        setHeadOfficeLink('');
                                        setParentPocName('');
                                        setParentPocEmail('');
                                        setParentPocPhone('');

                                        // Refresh the dashboard
                                        await queryClient.invalidateQueries({ queryKey: ['merged-data'] });
                                        await refetch();
                                        await refetchChildren();

                                        // Close the dialog
                                        onOpenChange(false);
                                      } catch (error: any) {
                                        toast({
                                          title: "Error",
                                          description: error.message || "Failed to claim locations",
                                          variant: "destructive",
                                        });
                                      }
                                    }}
                                    disabled={!dbaName || !dbaName.trim() || selectedStores.length === 0 || !storeSheetId || !trackerSheetId}
                                    data-testid="button-claim-multiple"
                                  >
                                    <Sparkles className="h-4 w-4 mr-2" />
                                    Claim DBA with Parent-Child Structure
                                  </Button>
                                </div>
                              )}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <div className="space-y-2">
                                <Label htmlFor="point_of_contact">Point of Contact</Label>
                                <Input
                                  id="point_of_contact"
                                  data-testid="input-point-of-contact"
                                  value={formData.point_of_contact}
                                  onChange={(e) => handleInputChange('point_of_contact', e.target.value)}
                                  placeholder="Primary contact person"
                                />
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="poc_email">POC Email</Label>
                                <Input
                                  id="poc_email"
                                  data-testid="input-poc-email"
                                  type="email"
                                  value={formData.poc_email}
                                  onChange={(e) => handleInputChange('poc_email', e.target.value)}
                                  placeholder="contact@store.com"
                                />
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="poc_phone">POC Phone</Label>
                                <Input
                                  id="poc_phone"
                                  data-testid="input-poc-phone"
                                  type="tel"
                                  value={formData.poc_phone}
                                  onChange={(e) => handleInputChange('poc_phone', e.target.value)}
                                  placeholder="(555) 123-4567"
                                />
                              </div>
                            </div>

                            {/* Status */}
                            <div className="space-y-2 pt-4 border-t">
                              <Label htmlFor="status">Status</Label>
                              <Select
                                value={formData.status}
                                onValueChange={(value) => handleInputChange('status', value)}
                              >
                                <SelectTrigger
                                  id="status"
                                  data-testid="select-status"
                                  style={formData.status && statusColors[formData.status] ? {
                                    backgroundColor: statusColors[formData.status].background,
                                    color: statusColors[formData.status].text,
                                  } : undefined}
                                >
                                  <SelectValue placeholder="Select status" />
                                </SelectTrigger>
                                <SelectContent>
                                  {statusOptions.map((status: string) => {
                                    const colors = statusColors[status];
                                    return (
                                      <SelectItem
                                        key={status}
                                        value={status}
                                        data-testid={`status-option-${status.toLowerCase().replace(/[^a-z]+/g, '-')}`}
                                        style={{
                                          backgroundColor: colors?.background || 'transparent',
                                          color: colors?.text || 'inherit',
                                        }}
                                      >
                                        {status}
                                      </SelectItem>
                                    );
                                  })}
                                </SelectContent>
                              </Select>
                            </div>

                            {/* Smart Reminder Box - Collapsible */}
                            <Collapsible open={reminderSectionOpen} onOpenChange={setReminderSectionOpen} className="pt-4 border-t">
                              <CollapsibleTrigger asChild>
                                <Button
                                  variant="ghost"
                                  className="w-full justify-between p-3 h-auto"
                                  data-testid="button-toggle-reminder"
                                >
                                  <span className="font-medium">Set Reminder</span>
                                  <ChevronDown className={`h-4 w-4 transition-transform ${reminderSectionOpen ? "rotate-180" : ""}`} />
                                </Button>
                              </CollapsibleTrigger>
                              <CollapsibleContent className="pt-2">
                                <QuickReminder
                                  onSave={async (reminderData) => {
                                    try {
                                      const response = await apiRequest('POST', '/api/reminders', {
                                        title: `Follow up: ${formData.name}`,
                                        description: reminderData.note,
                                        reminderDate: reminderData.date.toISOString(),
                                        reminderTime: reminderData.time,
                                        storeMetadata: {
                                          sheetId: trackerSheetId,
                                          uniqueIdentifier: getLinkValue(row),
                                          storeName: formData.name,
                                          address: formData.address,
                                          city: formData.city,
                                          state: formData.state,
                                          pointOfContact: formData.point_of_contact,
                                          pocEmail: formData.poc_email || formData.email,
                                          pocPhone: formData.poc_phone || formData.phone,
                                        },
                                        useCustomerTimezone: reminderData.useCustomerTimezone,
                                        customerTimezone: reminderData.customerTimezone,
                                        agentTimezone: reminderData.agentTimezone,
                                        calendarReminders: reminderData.calendarReminders,
                                      });

                                      // Update the form data to reflect the changes
                                      const followUpDate = format(reminderData.date, 'M/d/yyyy');
                                      handleInputChange('follow_up_date', followUpDate);
                                      handleInputChange('next_action', reminderData.note);

                                      // Automatically save Follow-Up Date and Next Action to tracker sheet using mutation
                                      try {
                                        const link = formData.link || getLinkValue(row);
                                        if (link && trackerSheetId) {
                                          await upsertTrackerFieldsMutation.mutateAsync({
                                            link,
                                            updates: {
                                              'Follow-Up Date': followUpDate,
                                              'Next Action': reminderData.note,
                                            }
                                          });

                                          // Update initialData to prevent "unsaved changes" indicator
                                          setInitialData(prev => ({
                                            ...prev,
                                            follow_up_date: followUpDate,
                                            next_action: reminderData.note,
                                          }));

                                          toast({
                                            title: "Reminder Created",
                                            description: response.warning
                                              ? response.warning.message
                                              : "Your reminder has been saved and Follow-Up Date updated.",
                                            variant: response.warning ? "default" : "default",
                                          });
                                        } else {
                                          toast({
                                            title: "Reminder Created",
                                            description: response.warning
                                              ? response.warning.message
                                              : "Your reminder has been saved but Follow-Up Date could not be updated (missing link or tracker sheet).",
                                            variant: response.warning ? "default" : "default",
                                          });
                                        }
                                      } catch (saveError: any) {
                                        toast({
                                          title: "Partial Success",
                                          description: "Reminder created but Follow-Up Date could not be saved: " + (saveError.message || "Unknown error"),
                                          variant: "destructive",
                                        });
                                      }

                                      // Invalidate reminder queries to ensure UI updates immediately
                                      queryClient.invalidateQueries({
                                        predicate: (query) => {
                                          const key = query.queryKey[0];
                                          return typeof key === 'string' && key.startsWith('/api/reminders');
                                        }
                                      });
                                    } catch (error: any) {
                                      console.error('[REMINDER] Error:', error);
                                      toast({
                                        title: "Error",
                                        description: error.message || "Failed to create reminder",
                                        variant: "destructive",
                                      });
                                    }
                                  }}
                                  storeAddress={formData.address}
                                  storeCity={formData.city}
                                  storeState={formData.state}
                                  userTimezone={userPreferences?.timezone}
                                  defaultTimezoneMode={userPreferences?.defaultTimezoneMode}
                                  timeFormat={userPreferences?.timeFormat}
                                  pointOfContact={formData.point_of_contact}
                                  pocEmail={formData.poc_email}
                                  pocPhone={formData.poc_phone}
                                  defaultEmail={formData.email}
                                  defaultPhone={formData.phone}
                                />
                              </CollapsibleContent>
                            </Collapsible>
                          </div>
                        </AccordionContent>
                      </AccordionItem>

                      {/* DBA Management - only show if this location has children or is a child */}
                      {(childLocations && childLocations.children && childLocations.children.length > 0) || formData.parent_link ? (
                        <AccordionItem value="dba-management" data-testid="accordion-item-dba-management">
                          <AccordionTrigger className="text-lg font-semibold" data-testid="trigger-dba-management">
                            DBA Management
                          </AccordionTrigger>
                          <AccordionContent>
                            <div className="space-y-4 pt-2">
                              {/* Show parent info if this is a child location */}
                              {formData.parent_link && (
                                <div className="p-3 bg-muted/30 rounded-md space-y-2">
                                  <Label className="text-sm font-medium">This is a child location</Label>
                                  <p className="text-xs text-muted-foreground">
                                    Parent: <span className="font-medium">{formData.dba || 'Unknown'}</span>
                                  </p>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={async () => {
                                      try {
                                        await apiRequest('POST', '/api/dba/unlink-children', {
                                          parentLink: formData.parent_link,
                                          childLinks: [currentStoreLink]
                                        });

                                        toast({
                                          title: "Success",
                                          description: "Removed from parent DBA",
                                        });

                                        await queryClient.invalidateQueries({ queryKey: ['merged-data'] });
                                        await refetch();
                                        await refetchChildren();
                                      } catch (error: any) {
                                        toast({
                                          title: "Error",
                                          description: error.message || "Failed to unlink from parent",
                                          variant: "destructive",
                                        });
                                      }
                                    }}
                                    data-testid="button-unlink-from-parent"
                                  >
                                    Remove from Parent DBA
                                  </Button>
                                </div>
                              )}

                              {/* Show child locations if this is a parent */}
                              {childLocations && childLocations.children && childLocations.children.length > 0 && (
                                <div className="space-y-3">
                                  <div className="flex items-center justify-between">
                                    <Label>Child Locations ({childLocations.children.length})</Label>
                                    {childLocations.headOffice && (
                                      <Badge variant="secondary" className="text-xs">
                                        Head Office: {childLocations.headOffice.name}
                                      </Badge>
                                    )}
                                  </div>

                                  <div className="space-y-2 max-h-60 overflow-y-auto border rounded-md p-2">
                                    {childLocations.children.map((child: any) => (
                                      <div
                                        key={child.link}
                                        className="flex items-center justify-between p-2 bg-muted/50 rounded-md"
                                        data-testid={`child-location-${child.link}`}
                                      >
                                        <div className="flex-1">
                                          <p className="text-sm font-medium">{child.name}</p>
                                          {child.address && (
                                            <p className="text-xs text-muted-foreground">{child.address}, {child.city}, {child.state}</p>
                                          )}
                                        </div>
                                        <div className="flex items-center gap-2">
                                          {childLocations.headOfficeLink === child.link && (
                                            <Badge variant="default" className="text-xs">HQ</Badge>
                                          )}
                                          <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={async () => {
                                              if (!confirm(`Remove "${child.name}" from this DBA?`)) return;

                                              try {
                                                await apiRequest('POST', '/api/dba/unlink-children', {
                                                  parentLink: currentStoreLink,
                                                  childLinks: [child.link]
                                                });

                                                toast({
                                                  title: "Success",
                                                  description: `Removed ${child.name} from DBA`,
                                                });

                                                await queryClient.invalidateQueries({ queryKey: ['merged-data'] });
                                                await refetch();
                                                await refetchChildren();
                                              } catch (error: any) {
                                                toast({
                                                  title: "Error",
                                                  description: error.message || "Failed to remove child location",
                                                  variant: "destructive",
                                                });
                                              }
                                            }}
                                            data-testid={`button-remove-child-${child.link}`}
                                          >
                                            Remove
                                          </Button>
                                        </div>
                                      </div>
                                    ))}
                                  </div>

                                  {/* Add more child locations */}
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      setMultiLocationMode(true);
                                      setDbaName(formData.dba || '');
                                    }}
                                    data-testid="button-add-more-children"
                                  >
                                    <Plus className="h-4 w-4 mr-2" />
                                    Add More Locations to DBA
                                  </Button>
                                </div>
                              )}
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      ) : null}

                      {/* Basic Information */}
                      <AccordionItem value="basic-info" data-testid="accordion-item-basic-info">
                        <AccordionTrigger className="text-lg font-semibold" data-testid="trigger-basic-info">
                          Basic Information
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="space-y-4 pt-2">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label htmlFor="name">Store Name</Label>
                                <Input
                                  id="name"
                                  data-testid="input-store-name"
                                  value={formData.name}
                                  onChange={(e) => handleInputChange('name', e.target.value)}
                                  placeholder="Enter store name"
                                />
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="type">Type</Label>
                                <Input
                                  id="type"
                                  data-testid="input-type"
                                  value={formData.type}
                                  onChange={(e) => handleInputChange('type', e.target.value)}
                                  placeholder="e.g., Dispensary, Headshop"
                                />
                              </div>
                            </div>

                            {/* Profile Link - HIDDEN */}
                            <input
                              type="hidden"
                              id="link"
                              value={formData.link}
                              onChange={(e) => handleInputChange('link', e.target.value)}
                            />
                          </div>
                        </AccordionContent>
                      </AccordionItem>

                      {/* Contact Information - includes Street Address, City, State */}
                      <AccordionItem value="contact-info" data-testid="accordion-item-contact-info">
                        <AccordionTrigger className="text-lg font-semibold" data-testid="trigger-contact-info">
                          Contact Information
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="space-y-4 pt-2">
                            {/* Street Address, City, State */}
                            <div className="space-y-2">
                              <Label htmlFor="address">Street Address</Label>
                              <Input
                                id="address"
                                data-testid="input-address"
                                value={formData.address}
                                onChange={(e) => handleInputChange('address', e.target.value)}
                                placeholder="123 Main St"
                              />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label htmlFor="city">City</Label>
                                <Input
                                  id="city"
                                  data-testid="input-city"
                                  value={formData.city}
                                  onChange={(e) => handleInputChange('city', e.target.value)}
                                  placeholder="City"
                                />
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="state">State</Label>
                                <Popover open={stateComboboxOpen} onOpenChange={setStateComboboxOpen}>
                                  <PopoverTrigger asChild>
                                    <Button
                                      variant="outline"
                                      role="combobox"
                                      aria-expanded={stateComboboxOpen}
                                      className="w-full justify-between"
                                      id="state"
                                    >
                                      {formData.state || "Select state..."}
                                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                    </Button>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-full p-0">
                                    <Command>
                                      <CommandInput placeholder="Search state..." />
                                      <CommandList>
                                        <CommandEmpty>No state found.</CommandEmpty>
                                        <CommandGroup>
                                          {US_STATES_AND_PROVINCES.map((state) => (
                                            <CommandItem
                                              key={state}
                                              value={state}
                                              onSelect={() => {
                                                handleInputChange('state', state);
                                                setStateComboboxOpen(false);
                                              }}
                                            >
                                              <Check
                                                className={`mr-2 h-4 w-4 ${formData.state === state ? "opacity-100" : "opacity-0"}`}
                                              />
                                              {state}
                                            </CommandItem>
                                          ))}
                                        </CommandGroup>
                                      </CommandList>
                                    </Command>
                                  </PopoverContent>
                                </Popover>
                              </div>
                            </div>

                            <Separator className="my-4" />

                            {/* Phone, Email, Website */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label htmlFor="phone">Phone</Label>
                                <Input
                                  id="phone"
                                  data-testid="input-phone"
                                  type="tel"
                                  value={formData.phone}
                                  onChange={(e) => handleInputChange('phone', e.target.value)}
                                  placeholder="(555) 123-4567"
                                />
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="email">Email</Label>
                                <Input
                                  id="email"
                                  data-testid="input-email"
                                  type="email"
                                  value={formData.email}
                                  onChange={(e) => handleInputChange('email', e.target.value)}
                                  placeholder="contact@store.com"
                                />
                              </div>
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor="website">Website</Label>
                              <div className="flex gap-2">
                                <Input
                                  id="website"
                                  data-testid="input-website"
                                  value={formData.website}
                                  onChange={(e) => handleInputChange('website', e.target.value)}
                                  placeholder="https://www.store.com"
                                  className="flex-1"
                                />
                                {formData.website && (
                                  <Button variant="outline" size="icon" asChild data-testid="button-open-website">
                                    <a href={formData.website.startsWith('http') ? formData.website : `https://${formData.website}`} target="_blank" rel="noopener noreferrer">
                                      <ExternalLink className="h-4 w-4" />
                                    </a>
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  </div>

                  {/* Sticky Save/Cancel Buttons - Only shown when AI Assistant is visible */}
                  {showAssistant && (
                    <div className="sticky bottom-0 bg-background border-t pt-4 mt-4 flex justify-end gap-2">
                      <Button variant="outline" onClick={() => onOpenChange(false)} data-testid="button-cancel">
                        Cancel
                      </Button>
                      <Button
                        onClick={handleCallFromDetails}
                        data-testid="button-call"
                        variant="outline"
                      >
                        <Phone className="h-4 w-4 mr-2" />
                        Call
                      </Button>
                      <Button
                        onClick={handleSave}
                        disabled={saveMutation.isPending}
                        data-testid="button-save"
                        variant="outline"
                      >
                        {saveMutation.isPending ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <Save className="h-4 w-4 mr-2" />
                            Save
                          </>
                        )}
                      </Button>
                      <Button
                        onClick={handleSaveAndExit}
                        disabled={saveMutation.isPending}
                        data-testid="button-save-and-exit"
                        style={currentColors.actionButtons ? { backgroundColor: currentColors.actionButtons, borderColor: currentColors.actionButtons } : undefined}
                      >
                        {saveMutation.isPending ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <Save className="h-4 w-4 mr-2" />
                            Save & Exit
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* DialogFooter - Only shown when AI Assistant is NOT visible */}
          {!showAssistant && (
            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)} data-testid="button-cancel">
                Cancel
              </Button>
              <Button
                onClick={handleCallFromDetails}
                data-testid="button-call"
                variant="outline"
              >
                <Phone className="h-4 w-4 mr-2" />
                Call
              </Button>
              <Button
                onClick={handleSave}
                disabled={saveMutation.isPending}
                data-testid="button-save"
                variant="outline"
              >
                {saveMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save
                  </>
                )}
              </Button>
              <Button
                onClick={handleSaveAndExit}
                disabled={saveMutation.isPending}
                data-testid="button-save-and-exit"
                style={currentColors.actionButtons ? { backgroundColor: currentColors.actionButtons, borderColor: currentColors.actionButtons } : undefined}
              >
                {saveMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save & Exit
                  </>
                )}
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      {/* Store Search Dialog for Multi-Location Selection */}
      <Dialog open={storeSearchDialog} onOpenChange={setStoreSearchDialog}>
        <DialogContent className="max-w-3xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Select Multiple Locations</DialogTitle>
            <DialogDescription>
              Search and select multiple stores to claim with the DBA name
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="store_search">Search Stores (type 2+ letters to search)</Label>
              <Input
                id="store_search"
                data-testid="input-store-search"
                value={storeSearch}
                onChange={(e) => setStoreSearch(e.target.value)}
                placeholder="Search by name, city, state, or address..."
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                {selectedStores.length} location{selectedStores.length !== 1 ? 's' : ''} selected
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (filteredStores.length > 0) {
                      setSelectedStores(filteredStores.map((store: any) => ({ link: store.link, name: store.name })));
                    }
                  }}
                  disabled={filteredStores.length === 0}
                  data-testid="button-select-all"
                >
                  Select All ({filteredStores.length})
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedStores([])}
                  disabled={selectedStores.length === 0}
                  data-testid="button-select-none"
                >
                  Clear All
                </Button>
              </div>
            </div>

            <ScrollArea className="h-96 border rounded-md">
              <div className="p-4 space-y-2">
                {storeSearch.length < 2 ? (
                  <p className="text-center text-muted-foreground py-8">
                    Type 2 or more letters to search for stores...
                  </p>
                ) : isLoadingStores ? (
                  <p className="text-center text-muted-foreground py-8">
                    <Loader2 className="h-6 w-6 mx-auto mb-2 animate-spin" />
                    Loading stores...
                  </p>
                ) : filteredStores.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    No stores found matching "{storeSearch}"
                  </p>
                ) : (
                  filteredStores.map((store: any) => {
                    const isSelected = selectedStores.some(s => s.link === store.link);

                    const toggleStore = () => {
                      setSelectedStores(prev => {
                        const alreadySelected = prev.some(s => s.link === store.link);
                        if (alreadySelected) {
                          return prev.filter(s => s.link !== store.link);
                        } else {
                          return [...prev, { link: store.link, name: store.name }];
                        }
                      });
                    };

                    return (
                      <div
                        key={store.link}
                        className={`flex items-start space-x-3 p-3 rounded-md border cursor-pointer hover-elevate ${
                          isSelected ? 'bg-primary/10 border-primary' : ''
                        }`}
                        onClick={toggleStore}
                        data-testid={`store-option-${store.link}`}
                      >
                        <Checkbox
                          checked={isSelected}
                          data-testid={`checkbox-store-${store.link}`}
                        />
                        <div className="flex-1">
                          <div className="font-medium">{store.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {store.city && store.state ? `${store.city}, ${store.state}` : store.city || store.state || ''}
                          </div>
                          {store.address && (
                            <div className="text-xs text-muted-foreground">{store.address}</div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </ScrollArea>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setStoreSearchDialog(false)} data-testid="button-cancel-search">
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}