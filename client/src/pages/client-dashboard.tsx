import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useLocation } from "wouter";
import { canAccessAdminFeatures } from "@/lib/authUtils";
import { useOptionalProject } from "@/contexts/project-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Table } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Settings2, Save, ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown, Check, ChevronsUpDown, Calendar as CalendarIcon, RotateCcw, Palette, EyeOff, SortAsc, SortDesc, Search, Sparkles, Bot, Download, ChevronDown } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { ThemeToggle } from "@/components/theme-toggle";
import { useTheme } from "@/components/theme-provider";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useCustomTheme, defaultLightColors, defaultDarkColors } from "@/hooks/use-custom-theme";
import { debug } from "@/lib/debug";
import { format, parse, isValid } from "date-fns";
import { Loader2 } from "lucide-react";
import type { FranchiseGroup } from "@shared/franchiseUtils";
import { SharedColorPicker } from "@/components/shared-color-picker";
import { InlineAIChatEnhanced } from "@/components/inline-ai-chat-enhanced";
import { useChatPanel } from "@/hooks/useChatPanel";
import { QuickReminder } from "@/components/quick-reminder";
import { normalizeLink } from "@shared/linkUtils";
import { DisplaySettingsCard } from "@/components/client-dashboard/display-settings-card";
import { FranchiseControls } from "@/components/client-dashboard/franchise-controls";
import { SearchRefreshControls } from "@/components/client-dashboard/search-refresh-controls";
import { StatesFilterPopover } from "@/components/client-dashboard/states-filter-popover";
import { StatusFilterPopover } from "@/components/client-dashboard/status-filter-popover";
import { StatusManagementDialog } from "@/components/status-management-dialog";
import { getLinkValue, getStateName, isValidStateName } from "@/components/client-dashboard/region-utils";
import {
  extractDomain,
  formatHours,
  hexToHsl,
  hslToHex,
  lightenColor,
} from "@/components/client-dashboard/client-dashboard-utils";
import type { GoogleSheet, MergedDataRow } from "@/components/client-dashboard/client-dashboard.types";
import { ClientDashboardInlineStatus } from "@/components/client-dashboard/client-dashboard-inline-status";
import { CitiesFilterPopover } from "@/components/client-dashboard/cities-filter-popover";
import { ClientDashboardLoadingScreen } from "@/components/client-dashboard/client-dashboard-loading-screen";
import { ClientDashboardResultsShell } from "@/components/client-dashboard/client-dashboard-results-shell";
import { ClientDashboardTableHeader } from "@/components/client-dashboard/client-dashboard-table-header";
import { ClientDashboardVirtualizedTableBody } from "@/components/client-dashboard/client-dashboard-virtualized-table-body";
import { filterMyStoresRows } from "@/components/client-dashboard/client-dashboard-filter-my-stores";
import { filterRegularRows } from "@/components/client-dashboard/client-dashboard-filter-regular";
import { filterFranchiseRows } from "@/components/client-dashboard/client-dashboard-filter-franchise";
import { ColumnSettingsPopover } from "@/components/client-dashboard/column-settings-popover";
import { CountriesFilterPopover } from "@/components/client-dashboard/countries-filter-popover";
import { DashboardActionButtons } from "@/components/client-dashboard/dashboard-action-buttons";
import { handleVCardExportFlow } from "@/components/client-dashboard/vcard-export-flow";
import { useTwilioVoip } from "@/hooks/useTwilioVoip";
import { ClientDashboardMainFrame } from "@/components/client-dashboard/client-dashboard-main-frame";
import { ClientDashboardDialogSections } from "@/components/client-dashboard/client-dashboard-dialog-sections";
import {
  buildCitiesInSelectedStatesSummary,
  buildCountriesSummary,
  buildStatesSummary,
} from "@/components/client-dashboard/client-dashboard-derived-data";
import { useClientDashboardMutations } from "@/components/client-dashboard/use-client-dashboard-mutations";

// Status Editor Popover Component
export default function ClientDashboard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const voip = useTwilioVoip();
  const { openPanel } = useChatPanel();
  const projectContext = useOptionalProject();
  const currentProject = projectContext?.currentProject;
  const [storeSheetId, setStoreSheetId] = useState<string>("");
  const [trackerSheetId, setTrackerSheetId] = useState<string>("");
  const joinColumn = "link"; // Hardcoded to "link"
  const [searchTerm, setSearchTerm] = useState("");
  const [nameFilter, setNameFilter] = useState("");
  const [cityFilter, setCityFilter] = useState("");
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>({});
  const [columnOrder, setColumnOrder] = useState<string[]>([]);
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({});
  const [editedCells, setEditedCells] = useState<Record<string, { link: string; rowIndex: number; column: string; value: string; sheetId: string }>>({});
  const [expandedCell, setExpandedCell] = useState<{ row: any; column: string; value: string; isEditable: boolean } | null>(null);
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [openCombobox, setOpenCombobox] = useState<string | null>(null);
  const [selectedStates, setSelectedStates] = useState<Set<string>>(new Set());
  const [selectedCities, setSelectedCities] = useState<Set<string>>(new Set());
  const [selectedCountries, setSelectedCountries] = useState<Set<string>>(new Set());
  const [citySearchTerm, setCitySearchTerm] = useState("");
  const [selectedStatuses, setSelectedStatuses] = useState<Set<string>>(new Set());
  const [showMyStoresOnly, setShowMyStoresOnly] = useState<boolean>(false);
  const [showUnclaimedOnly, setShowUnclaimedOnly] = useState<boolean>(true);
  const [showCanadaOnly, setShowCanadaOnly] = useState<boolean>(false);
  const [showStateless, setShowStateless] = useState(false);
  const [fontSize, setFontSize] = useState<number>(14); // Font size in pixels
  const [rowHeight, setRowHeight] = useState<number>(48); // Row height in pixels
  const [resizingColumn, setResizingColumn] = useState<{ column: string; startX: number; startWidth: number } | null>(null);
  const [preferencesLoaded, setPreferencesLoaded] = useState(false);
  const [contextMenuColumn, setContextMenuColumn] = useState<string | null>(null);
  const { theme: currentTheme, actualTheme } = useTheme();
  // New state variables for text alignment and vertical alignment
  const [textAlign, setTextAlign] = useState<'left' | 'center' | 'right' | 'justify'>('left');
  const [verticalAlign, setVerticalAlign] = useState<'top' | 'middle' | 'bottom'>('middle');
  const [freezeFirstColumn, setFreezeFirstColumn] = useState<boolean>(false);

  // AI Assistant states
  const [contextUpdateTrigger, setContextUpdateTrigger] = useState(0);
  const [loadDefaultScriptTrigger, setLoadDefaultScriptTrigger] = useState(0);

  // Use global theme hook for colors and statuses
  const { lightColors, darkColors, currentColors, statusColors, statusOptions, colorRowByStatus, setColorRowByStatus, saveAllStatusColors, colorPresets, setColorPresets, deleteColorPreset } = useCustomTheme();

  // Address edit dialog state
  const [addressEditDialog, setAddressEditDialog] = useState<{
    open: boolean;
    row: any;
  } | null>(null);

  // Store details dialog state
  const [storeDetailsDialog, setStoreDetailsDialog] = useState<{
    open: boolean;
    row: any;
    franchiseContext?: {
      brandName: string;
      allLocations: any[];
    };
  } | null>(null);

  // Franchise finder dialog state
  const [franchiseFinderOpen, setFranchiseFinderOpen] = useState(false);
  const [selectedFranchise, setSelectedFranchise] = useState<FranchiseGroup | null>(null);
  
  // Duplicate finder dialog state
  const [duplicateFinderOpen, setDuplicateFinderOpen] = useState(false);

  // Export vCard dialog state
  const [exportVCardDialogOpen, setExportVCardDialogOpen] = useState(false);
  const [vCardExportFields, setVCardExportFields] = useState({
    phone: true,
    email: true,
    website: true,
    address: true,
    salesSummary: true,
    storeHours: true
  });
  const [vCardListName, setVCardListName] = useState("");
  const [vCardPlatform, setVCardPlatform] = useState<"ios" | "android">("ios");

  // Call History dialog state
  const [callHistoryOpen, setCallHistoryOpen] = useState(false);

  // Email crawler state
  const [isEmailCrawling, setIsEmailCrawling] = useState(false);
  const [emailCrawlResults, setEmailCrawlResults] = useState<{ totalProcessed: number; emailsFound: number } | null>(null);

  // Local state for editing colors before saving
  // Initialize once from hook values, then allow independent editing
  const [lightModeColors, setLightModeColors] = useState(lightColors);
  const [darkModeColors, setDarkModeColors] = useState(darkColors);
  const [hasInitializedColors, setHasInitializedColors] = useState(false);
  const customColors = actualTheme === 'dark' ? darkModeColors : lightModeColors;
  const setCustomColors = actualTheme === 'dark' ? setDarkModeColors : setLightModeColors;

  // Initialize local state from hook values only once (when preferences load)
  // Don't continuously sync to allow editing before saving
  useEffect(() => {
    // Use JSON comparison to detect when colors actually differ from defaults
    const lightChanged = JSON.stringify(lightColors) !== JSON.stringify(defaultLightColors);
    const darkChanged = JSON.stringify(darkColors) !== JSON.stringify(defaultDarkColors);

    if (!hasInitializedColors && (lightChanged || darkChanged)) {
      setLightModeColors(lightColors);
      setDarkModeColors(darkColors);
      setHasInitializedColors(true);
    }
  }, [lightColors, darkColors, hasInitializedColors]);

  const { updateCellMutation, upsertTrackerMutation, saveColorsMutation } =
    useClientDashboardMutations({
      getCurrentUserName: () => (currentUser as any)?.name || "",
      getLinkValue,
      joinColumn,
      queryClient,
      setHasInitializedColors,
      toast,
      trackerSheetId,
    });

  const handleCellUpdate = (row: MergedDataRow, column: string, value: any) => {
    // Only admins can edit CRM table cells - sales agents must use Store Details dialog
    if (!canAccessAdminFeatures(currentUser)) {
      toast({
        title: "Editing Restricted",
        description: "Please use the Store Details popup to make changes.",
        variant: "default",
      });
      return;
    }

    // Determine which sheet to update based on which headers contain this column (case-insensitive)
    const isStoreColumn = mergedData?.storeHeaders?.some((h: string) => h.toLowerCase() === column.toLowerCase());
    const isTrackerColumn = mergedData?.trackerHeaders?.some((h: string) => h.toLowerCase() === column.toLowerCase());
    const isUnclaimed = !row._trackerRowIndex;

    let sheetId: string | undefined;
    let rowIndex: number | undefined;

    if (isTrackerColumn && row._trackerSheetId && row._trackerRowIndex) {
      // Update existing tracker row (claimed store)
      sheetId = row._trackerSheetId;
      rowIndex = row._trackerRowIndex;
      updateCellMutation.mutate({ sheetId, rowIndex, column, value });
    } else if (isTrackerColumn && isUnclaimed) {
      // Use tracker upsert for unclaimed stores - creates row + claims
      const linkValue = getLinkValue(row);
      if (!linkValue || !trackerSheetId) {
        toast({
          title: "Error",
          description: "Cannot update tracker column: Missing link value",
          variant: "destructive",
        });
        return;
      }

      // Use upsert mutation which creates tracker row and updates value
      upsertTrackerMutation.mutate({
        trackerSheetId,
        link: linkValue,
        updates: { [column]: value },
        shouldAutoClaim: true,
        joinColumn
      });
    } else if (isStoreColumn && row._storeSheetId && row._storeRowIndex) {
      // Update store sheet - will auto-claim if unclaimed
      sheetId = row._storeSheetId;
      rowIndex = row._storeRowIndex;
      const linkValue = getLinkValue(row);

      updateCellMutation.mutate({
        sheetId,
        rowIndex,
        column,
        value,
        shouldAutoClaimRow: isUnclaimed && !!linkValue,
        linkValue: linkValue
      });
    } else {
      toast({
        title: "Error",
        description: `Cannot determine which sheet to update. Column "${column}" not found in sheet headers.`,
        variant: "destructive",
      });
    }
  };

  // Fetch user preferences
  const { data: userPreferences, isFetched: preferencesQueryFetched } = useQuery<{
    visibleColumns?: Record<string, boolean>;
    columnOrder?: string[];
    columnWidths?: Record<string, number>;
    selectedStates?: string[];
    fontSize?: number;
    rowHeight?: number;
    customColors?: {
      background: string;
      text: string;
      primary: string;
      secondary: string;
      accent: string;
      border: string;
      bodyBackground?: string;
      headerBackground?: string;
      statusColors?: { [status: string]: { background: string; text: string } };
    };
    lightModeColors?: {
      background: string;
      text: string;
      primary: string;
      secondary: string;
      accent: string;
      border: string;
      bodyBackground: string;
      headerBackground: string;
      statusColors?: { [status: string]: { background: string; text: string } };
    };
    darkModeColors?: {
      background: string;
      text: string;
      primary: string;
      secondary: string;
      accent: string;
      border: string;
      bodyBackground: string;
      headerBackground: string;
      statusColors?: { [status: string]: { background: string; text: string } };
    };
    // Add alignment preferences
    textAlign?: 'left' | 'center' | 'right' | 'justify';
    verticalAlign?: 'top' | 'middle' | 'bottom';
    // Add new preferences
    statusOptions?: string[];
    colorRowByStatus?: boolean;
    // colorPresets now managed by useCustomTheme hook
    freezeFirstColumn?: boolean;
    showMyStoresOnly?: boolean;
    autoLoadScript?: boolean;
    viewAsAgent?: boolean;
  } | null>({
    queryKey: ['/api/user/preferences'],
    staleTime: Infinity, // Don't refetch preferences automatically
  });

  // Fetch available sheets and auto-detect by purpose
  const { data: sheetsData, isLoading: isLoadingSheets } = useQuery<{ sheets: GoogleSheet[] }>({
    queryKey: ['/api/sheets'],
  });

  const sheets = sheetsData?.sheets || [];

  // Auto-detect sheets by purpose
  useEffect(() => {
    if (sheets.length > 0) {
      const storeSheet = sheets.find(s => s.sheetPurpose === 'Store Database');
      const trackerSheet = sheets.find(s => s.sheetPurpose === 'commissions');

      if (storeSheet) setStoreSheetId(storeSheet.id);
      if (trackerSheet) setTrackerSheetId(trackerSheet.id);
    }
  }, [sheets]);

  // Fetch merged data
  // Get current user
  const { data: currentUser } = useQuery<{ id: string; email?: string; role?: string; agentName?: string }>({
    queryKey: ['/api/auth/user'],
  });

  // Check if user is admin - only admins can edit CRM table directly
  const isRealAdmin = canAccessAdminFeatures(currentUser);
  
  // View mode: admins can toggle to view as agent
  const [viewAsAgent, setViewAsAgent] = useState(userPreferences?.viewAsAgent || false);
  const isAdmin = isRealAdmin && !viewAsAgent;

  const [isRefreshing, setIsRefreshing] = useState(false);

  const { data: mergedData, isLoading, refetch } = useQuery({
    queryKey: ['merged-data', storeSheetId, trackerSheetId, joinColumn, currentProject?.id],
    queryFn: async () => {
      if (!storeSheetId || !trackerSheetId) return null;
      const response = await fetch('/api/sheets/merged-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ storeSheetId, trackerSheetId, joinColumn, projectId: currentProject?.id }),
      });
      if (!response.ok) throw new Error('Failed to fetch merged data');
      return response.json();
    },
    // Wait for project context to be loaded before fetching to prevent stale cache from projectId=undefined
    enabled: !!storeSheetId && !!trackerSheetId && currentProject !== undefined,
    // Don't use stale data from previous project - always refetch when project changes
    staleTime: 0,
  });

  const headers = mergedData?.headers || [];
  const data = mergedData?.data || [];
  const editableColumns = mergedData?.editableColumns || [];
  const storeHeaders = mergedData?.storeHeaders || [];
  const trackerHeaders = mergedData?.trackerHeaders || [];

  // Initialize visible columns, column order, and widths (or load from saved preferences)
  // Also update when headers change (e.g., when new tracker columns are added)
  useEffect(() => {
    if (headers.length > 0 && preferencesQueryFetched) {
      const currentVisible = { ...visibleColumns };
      const currentWidths = { ...columnWidths };
      const currentOrder = [...columnOrder];
      const hiddenColumns = ['title', 'error']; // Columns to hide by default

      // Hide Agent column for non-admin users (since auto-claiming manages it)
      const isAgentColumn = (col: string) =>
        col.toLowerCase() === 'agent' || col.toLowerCase() === 'agent name';
      const shouldHideColumn = (col: string) => {
        if (isAgentColumn(col) && !canAccessAdminFeatures(currentUser)) {
          return true;
        }
        return hiddenColumns.includes(col.toLowerCase());
      };

      // Check if we have saved preferences (only on first load)
      // Try localStorage first as it's faster, then fall back to database
      let savedPreferences = null;
      
      // First, try localStorage cache
      try {
        const cached = localStorage.getItem('crm_table_preferences');
        if (cached) {
          const parsed = JSON.parse(cached);
          // Use cached if less than 1 hour old
          if (parsed.timestamp && Date.now() - parsed.timestamp < 3600000) {
            savedPreferences = parsed;
          }
        }
      } catch (e) {
        console.warn('Failed to load from localStorage:', e);
      }
      
      // If no fresh cache, use database preferences
      // Only use database if it has actual preference data (not an empty object)
      if (!savedPreferences && userPreferences && Object.keys(userPreferences).length > 0) {
        savedPreferences = userPreferences;
      }
      
      if (savedPreferences && !preferencesLoaded) {
        // Load saved preferences if available
        if (savedPreferences.visibleColumns) {
          // Merge saved preferences with new headers (in case new columns were added)
          headers.forEach((header: string) => {
            currentVisible[header] = savedPreferences.visibleColumns![header] ?? !shouldHideColumn(header);
          });
        } else {
          headers.forEach((header: string) => {
            currentVisible[header] = !shouldHideColumn(header);
          });
        }

        if (savedPreferences.columnOrder && savedPreferences.columnOrder.length > 0) {
          // Use saved column order, adding any new columns at the end
          const savedOrder = savedPreferences.columnOrder.filter((col: string) => headers.includes(col));
          const newColumns = headers.filter((h: string) => !savedOrder.includes(h));
          // Filter out Agent column for non-admin users
          const finalOrder = [...savedOrder, ...newColumns].filter((col: string) =>
            canAccessAdminFeatures(currentUser) || !isAgentColumn(col)
          );
          setColumnOrder(finalOrder);
        } else {
          const finalOrder = headers.filter((col: string) =>
            canAccessAdminFeatures(currentUser) || !isAgentColumn(col)
          );
          setColumnOrder(finalOrder);
        }

        if (savedPreferences.columnWidths) {
          headers.forEach((header: string) => {
            currentWidths[header] = savedPreferences.columnWidths![header] || 200;
          });
        } else {
          headers.forEach((header: string) => {
            currentWidths[header] = 200;
          });
        }

        setVisibleColumns(currentVisible);
        setColumnWidths(currentWidths);

        // Load font size and row height preferences (only from database userPreferences)
        if (userPreferences?.fontSize) {
          setFontSize(userPreferences.fontSize);
        }
        if (userPreferences?.rowHeight) {
          setRowHeight(userPreferences.rowHeight);
        }

        // Load theme-specific colors from hook (already loaded)
        // Colors are now managed by useCustomTheme hook

        // Load alignment preferences (only from database userPreferences)
        if (userPreferences?.textAlign) {
          setTextAlign(userPreferences.textAlign);
        }
        if (userPreferences?.verticalAlign) {
          setVerticalAlign(userPreferences.verticalAlign);
        }

        // Status options are now managed by useCustomTheme hook
        // colorRowByStatus and colorPresets are now managed by useCustomTheme hook
        if (userPreferences?.freezeFirstColumn !== undefined) {
          setFreezeFirstColumn(userPreferences.freezeFirstColumn);
        }
        if (userPreferences?.showMyStoresOnly !== undefined) {
          setShowMyStoresOnly(userPreferences.showMyStoresOnly);
        }
        const userPrefsAny = userPreferences as any;
        if (userPrefsAny && userPrefsAny.showUnclaimedOnly !== undefined) {
          setShowUnclaimedOnly(userPrefsAny.showUnclaimedOnly);
        } else if (!userPrefsAny?.showMyStoresOnly) {
          setShowUnclaimedOnly(true);
        }
        if (userPrefsAny?.showStateless !== undefined) {
          setShowStateless(userPrefsAny.showStateless);
        }
        if (userPreferences?.viewAsAgent !== undefined) {
          setViewAsAgent(userPreferences.viewAsAgent);
        }

        setPreferencesLoaded(true);
      } else if (!preferencesLoaded) {
        // No saved preferences, use defaults (only on first load)
        headers.forEach((header: string) => {
          currentVisible[header] = !shouldHideColumn(header);
          currentWidths[header] = 200;
        });
        setVisibleColumns(currentVisible);
        const finalOrder = headers.filter((col: string) =>
          canAccessAdminFeatures(currentUser) || !isAgentColumn(col)
        );
        setColumnOrder(finalOrder);
        setColumnWidths(currentWidths);
        setFontSize(14);
        setRowHeight(48);
        setTextAlign('left');
        setVerticalAlign('middle');
        setColorRowByStatus(false); // Default to false
        setFreezeFirstColumn(false); // Default to false
        setShowMyStoresOnly(false); // Default to false
        setShowUnclaimedOnly(true); // Default to showing unclaimed shops
        setPreferencesLoaded(true);
      } else {
        // Preferences already loaded - check for new headers
        const newHeaders = headers.filter((h: string) => !currentOrder.includes(h));
        if (newHeaders.length > 0) {
          // Add new headers to column order (filtering out Agent for non-admins)
          const headersToAdd = newHeaders.filter((col: string) =>
            canAccessAdminFeatures(currentUser) || !isAgentColumn(col)
          );
          setColumnOrder([...currentOrder, ...headersToAdd]);

          // Add new headers to visible columns (visible by default unless in hiddenColumns)
          const updatedVisible = { ...currentVisible };
          newHeaders.forEach((header: string) => {
            updatedVisible[header] = !shouldHideColumn(header);
          });
          setVisibleColumns(updatedVisible);

          // Add default widths for new headers
          const updatedWidths = { ...currentWidths };
          newHeaders.forEach((header: string) => {
            updatedWidths[header] = 200;
          });
          setColumnWidths(updatedWidths);
        }
      }
    }
  }, [headers, userPreferences, preferencesQueryFetched, preferencesLoaded, currentUser?.role]);

  // Auto-open store details dialog when navigated from Reminders phone click
  useEffect(() => {
    // Only run when data is loaded
    if (!data || data.length === 0 || !preferencesLoaded) return;

    // Check for ?store= URL parameter
    const urlParams = new URLSearchParams(window.location.search);
    const storeIdentifier = urlParams.get('store');
    const phoneNumber = urlParams.get('phone');
    const autoCall = urlParams.get('autoCall');

    if (storeIdentifier) {

      // Find the store in the data by matching the link (uniqueIdentifier)
      const matchingStore = data.find((row: any) => {
        const link = getLinkValue(row);
        if (!link) return false;

        // Normalize and compare links
        const normalizedRowLink = normalizeLink(link);
        const normalizedSearchLink = normalizeLink(storeIdentifier);

        return normalizedRowLink === normalizedSearchLink;
      });

      if (matchingStore) {
        // Open the store details dialog
        setStoreDetailsDialog({
          open: true,
          row: matchingStore,
        });

        // Trigger default script loading in AI assistant
        setLoadDefaultScriptTrigger(prev => prev + 1);

        // If phone number provided, trigger dial after a delay so user sees the dialog first
        if (phoneNumber) {
          // If autoCall is true, log the call to database first
          if (autoCall === 'true') {
            const storeName = matchingStore['Name'] || matchingStore['name'] || matchingStore['Company'] || 'Unknown Store';
            apiRequest('POST', '/api/call-history', {
              storeLink: storeIdentifier,
              phoneNumber: phoneNumber,
              storeName: storeName,
            }).catch(error => {
              console.error('Failed to log call:', error);
              // Don't block the call if logging fails
            });
          }
          
          setTimeout(() => {
            voip.makeCall(phoneNumber);
          }, 800);
        }

        // Clear the URL parameters so it doesn't auto-open again
        const newUrl = window.location.pathname;
        window.history.replaceState({}, '', newUrl);
      }
    }
  }, [data, preferencesLoaded]);

  // Manual refresh handler - clears server cache and refetches
  const handleManualRefresh = async () => {
    try {
      setIsRefreshing(true);
      // Clear server-side cache
      await fetch('/api/sheets/refresh', {
        method: 'POST',
        credentials: 'include',
      });
      // Refetch data (which will now bypass cache)
      await refetch();
    } catch (error) {
      console.error('Refresh failed:', error);
      toast({
        title: "Refresh failed",
        description: "Could not refresh data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  const toggleColumn = (column: string) => {
    setVisibleColumns(prev => ({
      ...prev,
      [column]: !prev[column],
    }));
  };

  const moveColumnLeft = (column: string) => {
    setColumnOrder(prev => {
      const index = prev.indexOf(column);
      if (index <= 0) return prev; // Already at the start
      const newOrder = [...prev];
      [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
      return newOrder;
    });
  };

  const moveColumnRight = (column: string) => {
    setColumnOrder(prev => {
      const index = prev.indexOf(column);
      if (index === -1 || index >= prev.length - 1) return prev; // Already at the end
      const newOrder = [...prev];
      [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
      return newOrder;
    });
  };

  const handleColumnResize = (column: string, width: number) => {
    setColumnWidths(prev => ({
      ...prev,
      [column]: Math.max(100, width), // Minimum width 100px
    }));
  };

  const openExpandedView = (row: any, column: string, value: string, isEditable: boolean) => {
    setExpandedCell({ row, column, value, isEditable });
  };

  const openStoreDetailsFromTableRow = (row: any, autoLoadAssistant: boolean) => {
    setStoreDetailsDialog({
      open: true,
      row: row,
      franchiseContext: selectedFranchise ? {
        brandName: selectedFranchise.brandName,
        allLocations: selectedFranchise.locations
      } : undefined
    });

    if (!autoLoadAssistant) return;
    const autoLoadEnabled = userPreferences?.autoLoadScript ?? true;
    if (autoLoadEnabled) {
      const saved = localStorage.getItem(`storeDetailsShowAssistant`);
      if (saved !== "true") {
        localStorage.setItem(`storeDetailsShowAssistant`, "true");
      }
      setLoadDefaultScriptTrigger(prev => prev + 1);
    }
  };

  const saveExpandedCell = () => {
    if (!expandedCell) return;
    handleCellUpdate(expandedCell.row, expandedCell.column, expandedCell.value);
    setExpandedCell(null);
  };

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      // Toggle direction if same column
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // New column, default to ascending
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  // Get unique values for a column (for dropdowns)
  const getUniqueColumnValues = (column: string): string[] => {
    const values = new Set<string>();
    data.forEach((row: any) => {
      const value = row[column];
      if (value && String(value).trim()) {
        values.add(String(value).trim());
      }
    });
    return Array.from(values).sort();
  };

  // Get all unique states from the data (with full names) and their counts
  const { allStates, stateCounts, statelessCount } = useMemo(
    () =>
      buildStatesSummary({
        headers,
        data,
        getStateName,
        isValidStateName,
      }),
    [headers, data],
  );

  // Get all unique countries from the data with their counts
  const { allCountries, countryCounts } = useMemo(
    () =>
      buildCountriesSummary({
        headers,
        data,
      }),
    [headers, data],
  );

  // Initialize selectedCountries when allCountries changes
  useEffect(() => {
    if (allCountries.length > 0 && selectedCountries.size === 0) {
      setSelectedCountries(new Set(allCountries));
    }
  }, [allCountries]);

  // Get cities for selected states with their counts
  const { citiesInSelectedStates, cityCounts } = useMemo(
    () =>
      buildCitiesInSelectedStatesSummary({
        headers,
        data,
        selectedStates,
        getStateName,
      }),
    [headers, data, selectedStates],
  );

  // State selection: ensure valid selection whenever data or preferences change
  const statesVersion = allStates.join(',');
  const prefsVersion = (userPreferences?.selectedStates || []).sort().join(',');
  const [lastProcessedVersion, setLastProcessedVersion] = useState<string>('');
  
  useEffect(() => {
    // Wait for BOTH data and preferences to be ready
    if (allStates.length === 0 || !preferencesLoaded) return;
    
    // Create a combined version that includes both data and preferences
    const combinedVersion = `${statesVersion}|${prefsVersion}`;
    
    // Skip if we've already processed this exact combination
    if (combinedVersion === lastProcessedVersion) return;
    
    // Mark as processed
    setLastProcessedVersion(combinedVersion);
    
    // Priority 1: Try saved preferences (always apply if valid)
    if (userPreferences?.selectedStates && userPreferences.selectedStates.length > 0) {
      const validPrefs = userPreferences.selectedStates.filter((s: string) => allStates.includes(s));
      if (validPrefs.length > 0) {
        setSelectedStates(new Set(validPrefs));
        return;
      }
    }
    
    // Priority 2: Check if current selection is valid
    const currentValidCount = Array.from(selectedStates).filter(s => allStates.includes(s)).length;
    if (currentValidCount > 0) return;
    
    // Priority 3: Fallback to all states so data is visible
    setSelectedStates(new Set(allStates));
  }, [allStates, statesVersion, prefsVersion, selectedStates, preferencesLoaded, userPreferences, lastProcessedVersion]);

  // Initialize selected cities when states change or cities load
  useEffect(() => {
    if (citiesInSelectedStates.length > 0) {
      // Always auto-select all cities when the list of available cities changes
      // This ensures that when states are selected, all their cities are checked
      setSelectedCities(new Set(citiesInSelectedStates));
    } else if (citiesInSelectedStates.length === 0) {
      // Clear cities if no states are selected
      setSelectedCities(new Set());
    }
  }, [citiesInSelectedStates.join(',')]);

  // Auto-save cell changes immediately
  useEffect(() => {
    if (Object.keys(editedCells).length === 0) return;

    const saveChanges = async () => {
      try {
        // Save each cell individually
        const updates = Object.values(editedCells);

        for (const { sheetId, rowIndex, column, value } of updates) {
          await updateCellMutation.mutateAsync({ sheetId, rowIndex, column, value });
        }

        setEditedCells({});
      } catch (error: any) {
        toast({
          title: "Auto-save failed",
          description: error.message || "Failed to save changes",
          variant: "destructive",
        });
      }
    };

    const timeoutId = setTimeout(saveChanges, 500);
    return () => clearTimeout(timeoutId);
  }, [editedCells]);

  // Auto-save user preferences when they change (debounced)
  useEffect(() => {
    if (!preferencesLoaded) return; // Don't save until we've loaded initial preferences

    const timeoutId = setTimeout(async () => {
      try {
        // Database preferences (no timestamp)
        const dbPrefs = {
          visibleColumns,
          columnOrder,
          columnWidths,
          selectedStates: Array.from(selectedStates),
          showStateless,
          selectedCities: Array.from(selectedCities),
          fontSize,
          rowHeight,
          textAlign, // Save alignment preferences
          verticalAlign, // Save alignment preferences
          statusOptions, // Save status options
          // colorPresets now managed by useCustomTheme hook
          freezeFirstColumn, // Save freeze column preference
          showMyStoresOnly, // Save My Stores Only preference
          showUnclaimedOnly, // Save Show Unclaimed Only preference
          colorRowByStatus: userPreferences?.colorRowByStatus, // Preserve colorRowByStatus state
          // Note: Colors are saved separately via useCustomTheme
        };
        
        // Save to database (primary storage) - WITHOUT timestamp
        await apiRequest('PUT', '/api/user/preferences', dbPrefs);
        
        // Also save to localStorage as backup/cache for faster loading - WITH timestamp
        try {
          localStorage.setItem('crm_table_preferences', JSON.stringify({
            visibleColumns,
            columnOrder,
            columnWidths,
            timestamp: Date.now(), // Only for localStorage cache validation
          }));
        } catch (e) {
          console.warn('Failed to save to localStorage:', e);
        }
      } catch (error) {
        console.error('Failed to save preferences:', error);
      }
    }, 1000); // Save 1 second after last change

    return () => clearTimeout(timeoutId);
  }, [visibleColumns, columnOrder, columnWidths, selectedStates, selectedCities, fontSize, rowHeight, preferencesLoaded, textAlign, verticalAlign, statusOptions, freezeFirstColumn, showMyStoresOnly, showUnclaimedOnly, showStateless]);

  // Handle column resizing with global mouse events
  useEffect(() => {
    if (!resizingColumn) return;

    // Set cursor style during resize
    document.body.style.cursor = 'col-resize';

    const handleMouseMove = (e: MouseEvent) => {
      e.preventDefault();
      const diff = e.clientX - resizingColumn.startX;
      const newWidth = Math.max(100, resizingColumn.startWidth + diff);
      setColumnWidths(prev => ({
        ...prev,
        [resizingColumn.column]: newWidth,
      }));
    };

    const handleMouseUp = () => {
      // Restore cursor and user selection
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      setResizingColumn(null);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      // Cleanup in case component unmounts during resize
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [resizingColumn]);

  const toggleState = (state: string) => {
    const newSelected = new Set(selectedStates);
    if (newSelected.has(state)) {
      newSelected.delete(state);
    } else {
      newSelected.add(state);
    }
    setSelectedStates(newSelected);
  };

  const selectAllStates = () => {
    setSelectedStates(new Set(allStates));
    setShowStateless(true);
  };

  const clearAllStates = () => {
    setSelectedStates(new Set());
    setShowStateless(false);
  };

  // Auto-fit all columns to content
  const autoFitColumns = () => {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) return;

    const newWidths: Record<string, number> = {};
    context.font = `${fontSize}px system-ui, -apple-system, sans-serif`;

    visibleHeaders.forEach((header: string) => {
      // Measure header text with extra padding for sort icons and column actions
      const headerWidth = context.measureText(header).width + 100; // Increased for sort icon, resize handle, padding
      
      // Measure content of visible rows
      const contentWidths = filteredData.slice(0, 100).map((row: any) => { // Sample first 100 rows for performance
        const value = String(row[header] || '');
        let baseWidth = context.measureText(value).width;
        
        // Add extra padding for different column types
        const isEditableColumn = editableColumns.some((col: string) => col.toLowerCase() === header.toLowerCase());
        const isLinkColumn = header.toLowerCase() === 'link';
        const isStatusColumn = header.toLowerCase().includes('status');
        
        // Account for icons, badges, and action buttons
        if (isLinkColumn) {
          baseWidth += 60; // Extra space for link icon
        } else if (isStatusColumn) {
          baseWidth += 40; // Extra space for status badge padding
        } else if (isEditableColumn) {
          baseWidth += 30; // Extra space for edit indicator
        }
        
        return baseWidth + 50; // Base padding for cell padding and borders
      });

      // Use the max of header width and content widths, with min 100px and max 600px
      const maxContentWidth = Math.max(...contentWidths, 0);
      const optimalWidth = Math.max(100, Math.min(600, Math.max(headerWidth, maxContentWidth)));
      newWidths[header] = Math.ceil(optimalWidth);
    });

    setColumnWidths(newWidths);
    toast({
      title: "Columns Auto-fitted",
      description: "Column widths adjusted to fit content",
    });
  };

  const handleFindEmails = async () => {
    if (isEmailCrawling) return;
    setIsEmailCrawling(true);
    setEmailCrawlResults(null);

    try {
      const normalizeUrl = (url: string) => {
        if (!url) return "";
        return url
          .toLowerCase()
          .trim()
          .replace(/^https?:\/\//, "")
          .replace(/^www\./, "")
          .replace(/\/$/, "");
      };

      const visibleWebsites = filteredData
        .map((row: any) => ({
          website: normalizeUrl(row.Website || row.website || ""),
          hasEmail: !!(row.Email || row.email),
        }))
        .filter((value: any) => value.website);

      const response = await fetch("/api/clients/crawl-emails", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visibleWebsites, projectId: currentProject?.id }),
        credentials: "include",
      });
      const data = await response.json();

      if (response.ok) {
        setEmailCrawlResults({
          totalProcessed: data.totalProcessed,
          emailsFound: data.emailsFound,
        });
        const moreText = data.hasMore
          ? ` (${data.remainingToProcess} more to check - click again)`
          : "";
        toast({
          title: data.emailsFound > 0 ? "Emails Found!" : "Crawl Complete",
          description: `Found ${data.emailsFound} emails from ${data.totalProcessed} websites${moreText}`,
        });
        refetch();
      } else {
        toast({
          title: "Error",
          description: data.message || "Failed to crawl emails",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to crawl emails",
        variant: "destructive",
      });
    } finally {
      setIsEmailCrawling(false);
    }
  };

  const handleCellEdit = (row: any, column: string, value: string) => {
    // Only admins can edit CRM table cells - sales agents must use Store Details dialog
    if (!canAccessAdminFeatures(currentUser)) {
      toast({
        title: "Editing Restricted",
        description: "Please use the Store Details popup to make changes.",
        variant: "default",
      });
      return;
    }

    // Determine which sheet this column belongs to (case-insensitive)
    const isTrackerColumn = trackerHeaders.some((h: string) => h.toLowerCase() === column.toLowerCase());
    const sheetId = isTrackerColumn ? trackerSheetId : storeSheetId;
    const rowIndex = isTrackerColumn ? row._trackerRowIndex : row._storeRowIndex;
    const rowLink = row.link || row.Link || `row-${rowIndex}`;

    if (!sheetId) return; // Only check sheetId, allow editing even if rowIndex is undefined (unclaimed stores)

    // Use a stable unique key based on row link (not index) for virtual scrolling
    const key = `${rowLink}-${column}-${sheetId}`;
    setEditedCells(prev => ({
      ...prev,
      [key]: { link: rowLink, rowIndex, column, value, sheetId, isUnclaimed: !rowIndex },
    }));
  };

  const handleSave = async () => {
    const edits = Object.values(editedCells);
    if (edits.length === 0) return;

    try {
      // Save all edits in parallel
      await Promise.all(
        edits.map(({ sheetId, rowIndex, column, value }) =>
          apiRequest('PUT', `/api/sheets/${sheetId}/update`, { rowIndex, column, value })
        )
      );

      // Only clear state after ALL saves succeed
      toast({ title: "Success", description: `${edits.length} changes saved successfully` });
      setEditedCells({});
      refetch();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save some changes. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Filter and sort data (memoized for performance)
  const filteredData = useMemo(() => {
    // Franchise filter - show only selected franchise locations
    if (selectedFranchise) {
      return filterFranchiseRows({
        data,
        headers,
        searchTerm,
        selectedFranchise,
        sortColumn,
        sortDirection,
      });
    }

    // My Stores Only filter - apply ALL same filters as regular mode
    if (showMyStoresOnly) {
      return filterMyStoresRows({
        allCountries,
        allStates,
        citiesInSelectedStates,
        cityFilter,
        data,
        headers,
        nameFilter,
        searchTerm,
        selectedCities,
        selectedCountries,
        selectedStates,
        selectedStatuses,
        showStateless,
        sortColumn,
        sortDirection,
        getStateName,
        isValidStateName,
      });
    }

    return filterRegularRows({
      allCountries,
      allStates,
      citiesInSelectedStates,
      cityFilter,
      data,
      headers,
      isRealAdmin,
      nameFilter,
      searchTerm,
      selectedCities,
      selectedCountries,
      selectedStates,
      selectedStatuses,
      showMyStoresOnly,
      showStateless,
      showUnclaimedOnly,
      sortColumn,
      sortDirection,
      getStateName,
      isValidStateName,
    });
  }, [
    data,
    searchTerm,
    nameFilter,
    cityFilter,
    selectedStates,
    selectedCities,
    citiesInSelectedStates.length,
    allStates.length,
    selectedCountries,
    allCountries.length,
    headers,
    sortColumn,
    sortDirection,
    showMyStoresOnly,
    showUnclaimedOnly,
    isRealAdmin,
    selectedStatuses,
    selectedFranchise,
    showStateless
  ]);

  const visibleHeaders = columnOrder.filter((h: string) => visibleColumns[h]);
  const hasUnsavedChanges = Object.keys(editedCells).length > 0;

  // Virtual scrolling setup
  const tableContainerRef = useRef<HTMLDivElement>(null);

  // Calculate row height based on user settings
  const estimatedRowHeight = rowHeight;

  const rowVirtualizer = useVirtualizer({
    count: filteredData.length,
    getScrollElement: () => tableContainerRef.current,
    estimateSize: () => estimatedRowHeight,
    overscan: 10, // Render 10 extra rows above/below viewport for smooth scrolling
  });

  // Identify status columns (assuming there's only one)
  const statusColumns = headers.filter((h: string) => h.toLowerCase().includes('status'));

  // Show full-page loading state until data is ready
  if (isLoadingSheets || isLoading || !preferencesLoaded) {
    return <ClientDashboardLoadingScreen bodyBackground={customColors.bodyBackground} />;
  }

  return (
    <>
      <ClientDashboardMainFrame
        allCountries={allCountries}
        allStates={allStates}
        autoFitColumns={autoFitColumns}
        citiesInSelectedStates={citiesInSelectedStates}
        cityCounts={cityCounts}
        cityFilter={cityFilter}
        citySearchTerm={citySearchTerm}
        clearAllStates={clearAllStates}
        colorPresets={colorPresets}
        colorRowByStatus={colorRowByStatus}
        columnOrder={columnOrder}
        columnWidths={columnWidths}
        contextMenuColumn={contextMenuColumn}
        countryCounts={countryCounts}
        currentColors={currentColors}
        currentUser={currentUser}
        customColors={customColors}
        data={data}
        deleteColorPreset={deleteColorPreset}
        editableColumns={editableColumns}
        editedCells={editedCells}
        filteredData={filteredData}
        fontSize={fontSize}
        formatHours={formatHours}
        freezeFirstColumn={freezeFirstColumn}
        getUniqueColumnValues={getUniqueColumnValues}
        handleCellEdit={handleCellEdit}
        handleCellUpdate={handleCellUpdate}
        handleManualRefresh={handleManualRefresh}
        handleSort={handleSort}
        headers={headers}
        isAdmin={isAdmin}
        isEmailCrawling={isEmailCrawling}
        isLoading={isLoading}
        isRefreshing={isRefreshing}
        moveColumnLeft={moveColumnLeft}
        moveColumnRight={moveColumnRight}
        nameFilter={nameFilter}
        onCallHistoryOpen={() => setCallHistoryOpen(true)}
        onExportVCardOpen={() => {
          setVCardListName("");
          setExportVCardDialogOpen(true);
        }}
        onFindEmails={handleFindEmails}
        onOpenDuplicateFinder={() => setDuplicateFinderOpen(true)}
        onOpenFranchiseFinder={() => setFranchiseFinderOpen(true)}
        openCombobox={openCombobox}
        openExpandedView={openExpandedView}
        openStoreDetailsFromTableRow={openStoreDetailsFromTableRow}
        rowHeight={rowHeight}
        rowVirtualizer={rowVirtualizer}
        saveAllStatusColors={saveAllStatusColors}
        searchTerm={searchTerm}
        selectAllStates={selectAllStates}
        selectedCities={selectedCities}
        selectedCountries={selectedCountries}
        selectedFranchise={selectedFranchise}
        selectedStates={selectedStates}
        selectedStatuses={selectedStatuses}
        setCityFilter={setCityFilter}
        setCitySearchTerm={setCitySearchTerm}
        setColorPresets={setColorPresets}
        setColorRowByStatus={setColorRowByStatus}
        setColumnOrder={setColumnOrder}
        setContextMenuColumn={setContextMenuColumn}
        setFontSize={setFontSize}
        setFreezeFirstColumn={setFreezeFirstColumn}
        setNameFilter={setNameFilter}
        setOpenCombobox={setOpenCombobox}
        setResizingColumn={setResizingColumn}
        setRowHeight={setRowHeight}
        setSearchTerm={setSearchTerm}
        setSelectedCities={setSelectedCities}
        setSelectedCountries={setSelectedCountries}
        setSelectedFranchise={setSelectedFranchise}
        setSelectedStates={setSelectedStates}
        setSelectedStatuses={setSelectedStatuses}
        setShowCanadaOnly={setShowCanadaOnly}
        setShowMyStoresOnly={setShowMyStoresOnly}
        setShowStateless={setShowStateless}
        setShowUnclaimedOnly={setShowUnclaimedOnly}
        setSortColumn={setSortColumn}
        setSortDirection={setSortDirection}
        setTextAlign={setTextAlign}
        setVerticalAlign={setVerticalAlign}
        setVisibleColumns={setVisibleColumns}
        showCanadaOnly={showCanadaOnly}
        showMyStoresOnly={showMyStoresOnly}
        showStateless={showStateless}
        showUnclaimedOnly={showUnclaimedOnly}
        sortColumn={sortColumn}
        sortDirection={sortDirection}
        stateCounts={stateCounts}
        statelessCount={statelessCount}
        statusColors={statusColors}
        statusOptions={statusOptions}
        storeSheetId={storeSheetId}
        tableContainerRef={tableContainerRef}
        textAlign={textAlign}
        toggleColumn={toggleColumn}
        toggleState={toggleState}
        toast={toast}
        trackerHeaders={trackerHeaders}
        trackerSheetId={trackerSheetId}
        verticalAlign={verticalAlign}
        visibleColumns={visibleColumns}
        visibleHeaders={visibleHeaders}
      />

      <ClientDashboardDialogSections
        addressEditDialog={addressEditDialog}
        callHistoryOpen={callHistoryOpen}
        contextUpdateTrigger={contextUpdateTrigger}
        currentColors={currentColors}
        data={data}
        duplicateFinderOpen={duplicateFinderOpen}
        expandedCell={expandedCell}
        exportVCardDialogOpen={exportVCardDialogOpen}
        filteredData={filteredData}
        franchiseFinderOpen={franchiseFinderOpen}
        joinColumn={joinColumn}
        loadDefaultScriptTrigger={loadDefaultScriptTrigger}
        onAddressClose={() => setAddressEditDialog(null)}
        onCallHistoryOpenChange={setCallHistoryOpen}
        onContextUpdateTriggerChange={setContextUpdateTrigger}
        onDial={(phoneNumber: string) => voip.makeCall(phoneNumber)}
        onDuplicatesDeleted={() => {
          refetch();
        }}
        onDuplicateFinderOpenChange={setDuplicateFinderOpen}
        onExpandedClose={() => setExpandedCell(null)}
        onExpandedOpenChange={(open: boolean) => {
          if (!open) {
            setExpandedCell(null);
          }
        }}
        onExpandedSave={saveExpandedCell}
        onExpandedValueChange={(value: string) => {
          if (expandedCell) {
            setExpandedCell({ ...expandedCell, value });
          }
        }}
        onFranchiseFinderOpenChange={setFranchiseFinderOpen}
        onLoadDefaultScriptTriggerChange={setLoadDefaultScriptTrigger}
        onNavigateToStore={(newRow: any) => {
          setStoreDetailsDialog({
            open: true,
            row: newRow,
          });
        }}
        onSelectFranchise={(franchise: FranchiseGroup) => {
          setSelectedFranchise(franchise);
          setShowMyStoresOnly(false);
        }}
        onShowStore={(matchingStore: any) => {
          setStoreDetailsDialog({
            open: true,
            row: matchingStore,
          });
          setLoadDefaultScriptTrigger((prev) => prev + 1);
        }}
        onStoreDetailsClose={() => {
          setStoreDetailsDialog(null);
          setLoadDefaultScriptTrigger(0);
        }}
        onVCardCancel={() => setExportVCardDialogOpen(false)}
        onVCardConfirm={() => handleVCardExportFlow({
          filteredData,
          queryClient,
          setExportVCardDialogOpen,
          toast,
          vCardExportFields,
          vCardListName,
          vCardPlatform,
        })}
        onVCardFieldsChange={setVCardExportFields}
        onVCardListNameChange={setVCardListName}
        onVCardOpenChange={setExportVCardDialogOpen}
        onVCardPlatformChange={setVCardPlatform}
        platform={vCardPlatform}
        refetch={refetch}
        statusColors={statusColors}
        statusOptions={statusOptions}
        storeDetailsDialog={storeDetailsDialog}
        storeSheetId={storeSheetId}
        trackerSheetId={trackerSheetId}
        vCardExportFields={vCardExportFields}
        vCardListName={vCardListName}
      />
    </>
  );
}
