import { useRef, useState } from "react";
import type { FranchiseGroup } from "@shared/franchiseUtils";

interface UseClientDashboardStateProps {
  actualTheme: string;
  darkColors: any;
  lightColors: any;
  userPreferences: any;
}

export function useClientDashboardState(props: UseClientDashboardStateProps) {
  const [storeSheetId, setStoreSheetId] = useState<string>("");
  const [trackerSheetId, setTrackerSheetId] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");
  const [nameFilter, setNameFilter] = useState("");
  const [cityFilter, setCityFilter] = useState("");
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>({});
  const [columnOrder, setColumnOrder] = useState<string[]>([]);
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({});
  const [editedCells, setEditedCells] = useState<Record<string, any>>({});
  const [expandedCell, setExpandedCell] = useState<{ row: any; column: string; value: string; isEditable: boolean } | null>(null);
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
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
  const [fontSize, setFontSize] = useState<number>(14);
  const [rowHeight, setRowHeight] = useState<number>(48);
  const [resizingColumn, setResizingColumn] = useState<{ column: string; startX: number; startWidth: number } | null>(null);
  const [preferencesLoaded, setPreferencesLoaded] = useState(false);
  const [contextMenuColumn, setContextMenuColumn] = useState<string | null>(null);
  const [textAlign, setTextAlign] = useState<"left" | "center" | "right" | "justify">("left");
  const [verticalAlign, setVerticalAlign] = useState<"top" | "middle" | "bottom">("middle");
  const [freezeFirstColumn, setFreezeFirstColumn] = useState<boolean>(false);
  const [contextUpdateTrigger, setContextUpdateTrigger] = useState(0);
  const [loadDefaultScriptTrigger, setLoadDefaultScriptTrigger] = useState(0);

  const [addressEditDialog, setAddressEditDialog] = useState<{ open: boolean; row: any } | null>(null);
  const [storeDetailsDialog, setStoreDetailsDialog] = useState<{
    open: boolean;
    row: any;
    franchiseContext?: { brandName: string; allLocations: any[] };
  } | null>(null);

  const [franchiseFinderOpen, setFranchiseFinderOpen] = useState(false);
  const [selectedFranchise, setSelectedFranchise] = useState<FranchiseGroup | null>(null);
  const [duplicateFinderOpen, setDuplicateFinderOpen] = useState(false);

  const [exportVCardDialogOpen, setExportVCardDialogOpen] = useState(false);
  const [vCardExportFields, setVCardExportFields] = useState({
    phone: true,
    email: true,
    website: true,
    address: true,
    salesSummary: true,
    storeHours: true,
  });
  const [vCardListName, setVCardListName] = useState("");
  const [vCardPlatform, setVCardPlatform] = useState<"ios" | "android">("ios");

  const [callHistoryOpen, setCallHistoryOpen] = useState(false);
  const [isEmailCrawling, setIsEmailCrawling] = useState(false);
  const [emailCrawlResults, setEmailCrawlResults] = useState<{ totalProcessed: number; emailsFound: number } | null>(null);

  const [lightModeColors, setLightModeColors] = useState(props.lightColors);
  const [darkModeColors, setDarkModeColors] = useState(props.darkColors);
  const [hasInitializedColors, setHasInitializedColors] = useState(false);
  const customColors = props.actualTheme === "dark" ? darkModeColors : lightModeColors;
  const setCustomColors = props.actualTheme === "dark" ? setDarkModeColors : setLightModeColors;

  const [viewAsAgent, setViewAsAgent] = useState(props.userPreferences?.viewAsAgent || false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastProcessedVersion, setLastProcessedVersion] = useState<string>("");

  const tableContainerRef = useRef<HTMLDivElement>(null);

  return {
    addressEditDialog,
    callHistoryOpen,
    cityFilter,
    citySearchTerm,
    columnOrder,
    columnWidths,
    contextMenuColumn,
    contextUpdateTrigger,
    customColors,
    darkModeColors,
    duplicateFinderOpen,
    editedCells,
    emailCrawlResults,
    expandedCell,
    exportVCardDialogOpen,
    fontSize,
    franchiseFinderOpen,
    freezeFirstColumn,
    hasInitializedColors,
    isEmailCrawling,
    isRefreshing,
    lastProcessedVersion,
    lightModeColors,
    loadDefaultScriptTrigger,
    nameFilter,
    openCombobox,
    preferencesLoaded,
    resizingColumn,
    rowHeight,
    searchTerm,
    selectedCities,
    selectedCountries,
    selectedFranchise,
    selectedStates,
    selectedStatuses,
    setAddressEditDialog,
    setCallHistoryOpen,
    setCityFilter,
    setCitySearchTerm,
    setColumnOrder,
    setColumnWidths,
    setContextMenuColumn,
    setContextUpdateTrigger,
    setCustomColors,
    setDarkModeColors,
    setDuplicateFinderOpen,
    setEditedCells,
    setEmailCrawlResults,
    setExpandedCell,
    setExportVCardDialogOpen,
    setFontSize,
    setFranchiseFinderOpen,
    setFreezeFirstColumn,
    setHasInitializedColors,
    setIsEmailCrawling,
    setIsRefreshing,
    setLastProcessedVersion,
    setLightModeColors,
    setLoadDefaultScriptTrigger,
    setNameFilter,
    setOpenCombobox,
    setPreferencesLoaded,
    setResizingColumn,
    setRowHeight,
    setSearchTerm,
    setSelectedCities,
    setSelectedCountries,
    setSelectedFranchise,
    setSelectedStates,
    setSelectedStatuses,
    setShowCanadaOnly,
    setShowMyStoresOnly,
    setShowStateless,
    setShowUnclaimedOnly,
    setSortColumn,
    setSortDirection,
    setStoreDetailsDialog,
    setStoreSheetId,
    setTextAlign,
    setTrackerSheetId,
    setVCardExportFields,
    setVCardListName,
    setVCardPlatform,
    setVerticalAlign,
    setViewAsAgent,
    setVisibleColumns,
    showCanadaOnly,
    showMyStoresOnly,
    showStateless,
    showUnclaimedOnly,
    sortColumn,
    sortDirection,
    storeDetailsDialog,
    storeSheetId,
    tableContainerRef,
    textAlign,
    trackerSheetId,
    vCardExportFields,
    vCardListName,
    vCardPlatform,
    verticalAlign,
    viewAsAgent,
    visibleColumns,
  };
}
