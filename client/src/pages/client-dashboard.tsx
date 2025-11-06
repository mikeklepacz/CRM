import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { RefreshCw, Settings2, Save, ChevronLeft, ChevronRight, Maximize2, Phone, Mail, ExternalLink, ArrowUpDown, ArrowUp, ArrowDown, Check, ChevronsUpDown, Calendar as CalendarIcon, Type, AlignJustify, RotateCcw, Palette, EyeOff, SortAsc, SortDesc, AlignLeft, AlignCenter, AlignRight, Search, Sparkles, Store, Bot, Download, ChevronDown, Copy } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { ThemeToggle } from "@/components/theme-toggle";
import { useTheme } from "@/components/theme-provider";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useCustomTheme, defaultLightColors, defaultDarkColors } from "@/hooks/use-custom-theme";
import { debug } from "@/lib/debug";
import { format, parse, isValid } from "date-fns";
import { generateAndDownloadVCard } from "@/lib/vcard-utils";
import { AddressEditDialog } from "@/components/address-edit-dialog";
import { Loader2 } from "lucide-react";
import { FranchiseFinderDialog } from "@/components/franchise-finder-dialog";
import { DuplicateFinderDialog } from "@/components/duplicate-finder-dialog";
import type { FranchiseGroup } from "@shared/franchiseUtils";
import { SharedColorPicker } from "@/components/shared-color-picker";
import { InlineAIChatEnhanced } from "@/components/inline-ai-chat-enhanced";
import { useChatPanel } from "@/hooks/useChatPanel";
import { QuickReminder } from "@/components/quick-reminder";
import { normalizeLink } from "@shared/linkUtils";
import { StatusManagementDialog } from "@/components/status-management-dialog";
import { CallHistoryDialog } from "@/components/call-history-dialog";
import { StoreDetailsDialog } from "@/components/store-details-dialog";

// US States and Canadian Provinces abbreviations to full names mapping
const REGIONS: Record<string, string> = {
  // US States
  'AL': 'Alabama', 'AK': 'Alaska', 'AZ': 'Arizona', 'AR': 'Arkansas', 'CA': 'California',
  'CO': 'Colorado', 'CT': 'Connecticut', 'DE': 'Delaware', 'FL': 'Florida', 'GA': 'Georgia',
  'HI': 'Hawaii', 'ID': 'Idaho', 'IL': 'Illinois', 'IN': 'Indiana', 'IA': 'Iowa',
  'KS': 'Kansas', 'KY': 'Kentucky', 'LA': 'Louisiana', 'ME': 'Maine', 'MD': 'Maryland',
  'MA': 'Massachusetts', 'MI': 'Michigan', 'MN': 'Minnesota', 'MS': 'Mississippi', 'MO': 'Missouri',
  'MT': 'Montana', 'NE': 'Nebraska', 'NV': 'Nevada', 'NH': 'New Hampshire', 'NJ': 'New Jersey',
  'NM': 'New Mexico', 'NY': 'New York', 'NC': 'North Carolina', 'ND': 'North Dakota', 'OH': 'Ohio',
  'OK': 'Oklahoma', 'OR': 'Oregon', 'PA': 'Pennsylvania', 'RI': 'Rhode Island', 'SC': 'South Carolina',
  'SD': 'South Dakota', 'TN': 'Tennessee', 'TX': 'Texas', 'UT': 'Utah', 'VT': 'Vermont',
  'VA': 'Virginia', 'WA': 'Washington', 'WV': 'West Virginia', 'WI': 'Wisconsin', 'WY': 'Wyoming',
  // Canadian Provinces and Territories
  'AA': 'Alberta', // Alias for Alberta
  'AB': 'Alberta', 'BC': 'British Columbia', 'MB': 'Manitoba', 'NB': 'New Brunswick',
  'NL': 'Newfoundland and Labrador', 'NS': 'Nova Scotia', 'NT': 'Northwest Territories',
  'NU': 'Nunavut', 'ON': 'Ontario', 'PE': 'Prince Edward Island', 'QC': 'Quebec',
  'SK': 'Saskatchewan', 'YT': 'Yukon'
};

// Helper function to get full state/province name from abbreviation
const getStateName = (state: string): string => {
  if (!state) return '';
  const upperState = state.toUpperCase().trim();
  return REGIONS[upperState] || state;
};

// Canadian provinces and territories (full names)
const CANADIAN_PROVINCES = new Set([
  'Alberta',
  'British Columbia',
  'Manitoba',
  'New Brunswick',
  'Newfoundland and Labrador',
  'Northwest Territories',
  'Nova Scotia',
  'Nunavut',
  'Ontario',
  'Prince Edward Island',
  'Quebec',
  'Saskatchewan',
  'Yukon'
]);

// Helper function to check if a state/province is Canadian
const isCanadianProvince = (state: string): boolean => {
  return CANADIAN_PROVINCES.has(state);
};

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

interface GoogleSheet {
  id: string;
  spreadsheetName: string;
  sheetName: string;
  sheetPurpose: string;
}

interface MergedDataRow {
  [key: string]: any;
  _storeRowIndex?: number;
  _trackerRowIndex?: number;
  _storeSheetId?: string;
  _trackerSheetId?: string;
  _deletedFromStore?: boolean;
  _hasTrackerData?: boolean; // Added to indicate if a tracker row exists for this store
}

// Status Editor Popover Component
function StatusEditorPopover({
  statusOptions,
  statusColors,
  colorRowByStatus,
  setColorRowByStatus,
  updateStatusEntry,
  colorPresets,
  setColorPresets,
  deleteColorPreset,
  currentUser,
}: {
  statusOptions: string[];
  statusColors: { [status: string]: { background: string; text: string } };
  colorRowByStatus: boolean;
  setColorRowByStatus: (value: boolean) => void;
  updateStatusEntry: (index: number, name: string, bgColor: string, textColor: string) => void;
  colorPresets: Array<{name: string, color: string}>;
  setColorPresets: (presets: Array<{name: string, color: string}>) => void;
  deleteColorPreset: (index: number) => void;
  currentUser: any;
}) {
  const { toast } = useToast();
  const { actualTheme } = useTheme();
  const [localStatuses, setLocalStatuses] = useState(statusOptions);
  const [localColors, setLocalColors] = useState(statusColors);
  const [isSaving, setIsSaving] = useState(false);
  const [statusManagementOpen, setStatusManagementOpen] = useState(false);

  const isAdmin = currentUser?.role === 'admin';

  // Update local state when props change
  useEffect(() => {
    setLocalStatuses(statusOptions);
    setLocalColors(statusColors);
  }, [statusOptions, statusColors]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Save all status entries using clean status names
      for (let i = 0; i < localStatuses.length; i++) {
        const statusName = localStatuses[i];
        const colors = localColors[statusName] || { background: '#e5e7eb', text: '#000000' };
        await updateStatusEntry(i, statusName, colors.background, colors.text);
      }

      toast({
        title: "Success",
        description: "Status colors saved successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save status colors",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    const defaultColors = actualTheme === 'dark' ? defaultDarkColors : defaultLightColors;
    setLocalColors(defaultColors.statusColors || {});
    toast({
      title: "Reset Complete",
      description: "Status colors reset to defaults",
    });
  };

  const handleSavePreset = (color: string, name: string) => {
    const newPresets = [...colorPresets, { name, color }];
    setColorPresets(newPresets);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" data-testid="button-status">
          <Palette className="mr-2 h-4 w-4" />
          Status
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[500px] max-h-[600px] overflow-y-auto" align="end">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h4 className="font-medium">Status Customization</h4>
          </div>
          <p className="text-xs text-muted-foreground">
            Customize status colors{isAdmin ? ' and names' : ''}. Changes apply everywhere.
          </p>

          {/* Edit Statuses Button (Admin only) */}
          {isAdmin && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setStatusManagementOpen(true)}
              className="w-full"
              data-testid="button-edit-statuses"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Edit Statuses
            </Button>
          )}

          {/* Color Rows by Status Checkbox */}
          <div className="flex items-center gap-2 p-3 rounded-md border">
            <Checkbox
              id="status-color-rows"
              checked={colorRowByStatus}
              onCheckedChange={(checked) => setColorRowByStatus(!!checked)}
              data-testid="checkbox-status-color-rows"
            />
            <Label htmlFor="status-color-rows" className="text-sm cursor-pointer">
              Color Rows by Status
            </Label>
          </div>

          {/* Status Editors */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Edit Status Colors</Label>
            {localStatuses.map((statusName, index) => {
              const statusNumber = index + 1;
              const colors = localColors[statusName] || { background: '#e5e7eb', text: '#000000' };

              return (
                <div key={index} className="space-y-2 p-3 rounded-md border">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-muted-foreground w-4">{statusNumber}</span>
                    <div className="flex-1 text-sm">{statusName}</div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {/* Background Color */}
                    <SharedColorPicker
                      label="Background"
                      value={colors.background}
                      onChange={(color) => {
                        setLocalColors({
                          ...localColors,
                          [statusName]: { ...colors, background: color }
                        });
                      }}
                      onReset={() => {
                        const defaultColors = actualTheme === 'dark' ? defaultDarkColors : defaultLightColors;
                        const defaultStatusColors = defaultColors.statusColors?.[statusName];
                        if (defaultStatusColors) {
                          setLocalColors({
                            ...localColors,
                            [statusName]: { ...colors, background: defaultStatusColors.background }
                          });
                        }
                      }}
                      colorPresets={colorPresets}
                      onSavePreset={(color, name) => handleSavePreset(color, name)}
                      onDeletePreset={deleteColorPreset}
                      testId={`input-status-bg-${index}`}
                    />

                    {/* Text Color */}
                    <SharedColorPicker
                      label="Text"
                      value={colors.text}
                      onChange={(color) => {
                        setLocalColors({
                          ...localColors,
                          [statusName]: { ...colors, text: color }
                        });
                      }}
                      onReset={() => {
                        const defaultColors = actualTheme === 'dark' ? defaultDarkColors : defaultLightColors;
                        const defaultStatusColors = defaultColors.statusColors?.[statusName];
                        if (defaultStatusColors) {
                          setLocalColors({
                            ...localColors,
                            [statusName]: { ...colors, text: defaultStatusColors.text }
                          });
                        }
                      }}
                      colorPresets={colorPresets}
                      onSavePreset={(color, name) => handleSavePreset(color, name)}
                      onDeletePreset={deleteColorPreset}
                      testId={`input-status-text-${index}`}
                    />
                  </div>
                  {/* Live Preview */}
                  <div
                    className="px-3 py-2 rounded-sm text-sm text-center"
                    style={{
                      backgroundColor: colors.background,
                      color: colors.text,
                    }}
                    data-testid={`preview-status-${index}`}
                  >
                    {statusName}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Save Button */}
          <div className="pt-4 border-t">
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="w-full"
              data-testid="button-save-status-colors"
            >
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Colors
                </>
              )}
            </Button>
          </div>
        </div>
      </PopoverContent>

      <StatusManagementDialog
        open={statusManagementOpen}
        onOpenChange={setStatusManagementOpen}
      />
    </Popover>
  );
}

export default function ClientDashboard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { openPanel } = useChatPanel();
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
  const [citySearchTerm, setCitySearchTerm] = useState("");
  const [selectedStatuses, setSelectedStatuses] = useState<Set<string>>(new Set());
  const [showMyStoresOnly, setShowMyStoresOnly] = useState<boolean>(false);
  const [showUnclaimedOnly, setShowUnclaimedOnly] = useState<boolean>(false);
  const [showCanadaOnly, setShowCanadaOnly] = useState<boolean>(false);
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
  const { lightColors, darkColors, currentColors, statusColors, statusOptions, colorRowByStatus, setColorRowByStatus, updateStatusEntry, colorPresets, setColorPresets, deleteColorPreset } = useCustomTheme();

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

  // Convert hex to HSL (imported from use-custom-theme hook, but need local version for UI)
  const hexToHsl = (hex: string): { h: number; s: number; l: number } => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return { h: 0, s: 0, l: 0 };

    let r = parseInt(result[1], 16) / 255;
    let g = parseInt(result[2], 16) / 255;
    let b = parseInt(result[3], 16) / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0, s = 0, l = (max + min) / 2;

    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

      switch (max) {
        case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
        case g: h = ((b - r) / d + 2) / 6; break;
        case b: h = ((r - g) / d + 4) / 6; break;
      }
    }

    return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
  };

  // Convert HSL to hex
  const hslToHex = (h: number, s: number, l: number): string => {
    s = s / 100;
    l = l / 100;

    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs((h / 60) % 2 - 1));
    const m = l - c / 2;
    let r = 0, g = 0, b = 0;

    if (h >= 0 && h < 60) { r = c; g = x; b = 0; }
    else if (h >= 60 && h < 120) { r = x; g = c; b = 0; }
    else if (h >= 120 && h < 180) { r = 0; g = c; b = x; }
    else if (h >= 180 && h < 240) { r = 0; g = x; b = c; }
    else if (h >= 240 && h < 300) { r = x; g = 0; b = c; }
    else if (h >= 300 && h < 360) { r = c; g = 0; b = x; }

    const toHex = (n: number) => {
      const hex = Math.round((n + m) * 255).toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    };

    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  };

  // Helper function to parse HSL string (e.g., "hsl(120, 100%, 50%)")
  const parseHsl = (hslString: string): { h: number; s: number; l: number } => {
    const match = hslString.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
    if (match) {
      return { h: parseInt(match[1]), s: parseInt(match[2]), l: parseInt(match[3]) };
    }
    // Fallback to hex conversion if input is not HSL string
    return hexToHsl(hslString);
  };

  // Helper function to convert HSL values to a string format (e.g., "hsl(120, 100%, 50%)")
  const hslToString = (h: number, s: number, l: number): string => {
    return `hsl(${h}, ${s}%, ${l}%)`;
  };

  // Helper function to lighten a color by a percentage
  const lightenColor = (color: string, percent: number): string => {
    const hsl = parseHsl(color);
    // Increase lightness
    const newL = Math.min(100, hsl.l + (100 - hsl.l) * (percent / 100));
    return hslToString(hsl.h, hsl.s, newL);
  };

  // Mutation to update a cell in Google Sheets
  const updateCellMutation = useMutation({
    mutationFn: async ({
      sheetId,
      rowIndex,
      column,
      value,
      shouldAutoClaimRow,
      linkValue,
    }: {
      sheetId: string;
      rowIndex: number;
      column: string;
      value: any;
      shouldAutoClaimRow?: boolean;
      linkValue?: string;
    }) => {
      return await apiRequest("PUT", `/api/sheets/${sheetId}/update`, {
        rowIndex,
        column,
        value,
      });
    },
    onMutate: async (variables) => {
      // Cancel any outgoing refetches to avoid overwriting our optimistic update
      await queryClient.cancelQueries({ queryKey: ["merged-data"] });

      // Snapshot the previous value
      const previousData = queryClient.getQueryData(["merged-data"]);

      // Optimistically update the cache
      queryClient.setQueryData(["merged-data"], (old: any) => {
        if (!old || !old.rows) return old;

        return {
          ...old,
          rows: old.rows.map((row: any) => {
            // Match the row being updated (by store row index or tracker row index)
            const isMatchingRow =
              (row._storeRowIndex === variables.rowIndex && row._storeSheetId === variables.sheetId) ||
              (row._trackerRowIndex === variables.rowIndex && row._trackerSheetId === variables.sheetId);

            if (isMatchingRow) {
              return { ...row, [variables.column]: variables.value };
            }
            return row;
          })
        };
      });

      // Return context with the snapshot so we can rollback on error
      return { previousData };
    },
    onSuccess: async (data, variables) => {
      // Auto-claim unclaimed stores after successfully editing a store column
      if (variables.shouldAutoClaimRow && variables.linkValue && trackerSheetId) {
        try {
          // Optimistically mark as claimed in the cache
          queryClient.setQueryData(["merged-data"], (old: any) => {
            if (!old || !old.rows) return old;

            return {
              ...old,
              rows: old.rows.map((row: any) => {
                const rowLink = getLinkValue(row);
                if (rowLink && normalizeLink(rowLink) === normalizeLink(variables.linkValue!)) {
                  return { 
                    ...row, 
                    Agent: currentUser?.name || '',  // Mark as claimed by current user
                    _hasTrackerData: true,  // Mark as having tracker data
                  };
                }
                return row;
              })
            };
          });

          await apiRequest("POST", `/api/sheets/${trackerSheetId}/claim-store`, {
            linkValue: variables.linkValue,
            column: "Agent",  // Claim with Agent column
            value: "",  // Empty value, just claiming
            joinColumn,
          });

          // Background refetch to get correct tracker metadata - fire and forget
          queryClient.refetchQueries({ queryKey: ["merged-data"] });
        } catch (error) {
          // Soft error - don't block the user
          console.error("Auto-claim failed:", error);
        }
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
  });

  // Mutation to claim a store (create new tracker row)
  const claimStoreMutation = useMutation({
    mutationFn: async ({
      trackerSheetId,
      storeRow,
      column,
      value,
      joinColumn,
    }: {
      trackerSheetId: string;
      storeRow: MergedDataRow;
      column: string;
      value: any;
      joinColumn: string;
    }) => {
      return await apiRequest("POST", `/api/sheets/${trackerSheetId}/claim-store`, {
        linkValue: getLinkValue(storeRow),
        column,
        value,
        joinColumn,
      });
    },
    onMutate: async (variables) => {
      // Cancel any outgoing refetches to avoid overwriting our optimistic update
      await queryClient.cancelQueries({ queryKey: ["merged-data"] });

      // Snapshot the previous value
      const previousData = queryClient.getQueryData(["merged-data"]);

      // Optimistically update the cache - mark as claimed
      queryClient.setQueryData(["merged-data"], (old: any) => {
        if (!old || !old.rows) return old;

        return {
          ...old,
          rows: old.rows.map((row: any) => {
            const rowLink = getLinkValue(row);
            const storeLink = getLinkValue(variables.storeRow);
            if (rowLink && storeLink && normalizeLink(rowLink) === normalizeLink(storeLink)) {
              return { 
                ...row, 
                [variables.column]: variables.value,
                Agent: currentUser?.name || '',  // Mark as claimed by current user
              };
            }
            return row;
          })
        };
      });

      // Return context with the snapshot so we can rollback on error
      return { previousData };
    },
    onSuccess: () => {
      // Background refetch to get correct tracker metadata - non-blocking
      queryClient.invalidateQueries({ queryKey: ["merged-data"] });
      toast({
        title: "Store Claimed",
        description: "Store claimed successfully and value updated",
      });
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
  });

  // Mutation to upsert tracker row (create if doesn't exist, update if it does)
  const upsertTrackerMutation = useMutation({
    mutationFn: async ({
      trackerSheetId,
      link,
      updates,
      shouldAutoClaim,
      joinColumn,
    }: {
      trackerSheetId: string;
      link: string;
      updates: Record<string, any>;
      shouldAutoClaim?: boolean;
      joinColumn: string;
    }) => {
      return await apiRequest("POST", "/api/sheets/tracker/upsert", {
        link,
        updates,
      });
    },
    onMutate: async (variables) => {
      // Cancel any outgoing refetches to avoid overwriting our optimistic update
      await queryClient.cancelQueries({ queryKey: ["merged-data"] });

      // Snapshot the previous value
      const previousData = queryClient.getQueryData(["merged-data"]);

      // Optimistically update the cache
      queryClient.setQueryData(["merged-data"], (old: any) => {
        if (!old || !old.rows) return old;

        return {
          ...old,
          rows: old.rows.map((row: any) => {
            // Match the row by link value
            const rowLink = getLinkValue(row);
            if (rowLink && normalizeLink(rowLink) === normalizeLink(variables.link)) {
              return { ...row, ...variables.updates };
            }
            return row;
          })
        };
      });

      // Return context with the snapshot so we can rollback on error
      return { previousData };
    },
    onSuccess: async (data, variables) => {
      // Auto-claim unclaimed stores after successfully creating tracker row
      if (variables.shouldAutoClaim && variables.link && variables.trackerSheetId) {
        try {
          // Optimistically mark as claimed in the cache
          queryClient.setQueryData(["merged-data"], (old: any) => {
            if (!old || !old.rows) return old;

            return {
              ...old,
              rows: old.rows.map((row: any) => {
                const rowLink = getLinkValue(row);
                if (rowLink && normalizeLink(rowLink) === normalizeLink(variables.link)) {
                  return { 
                    ...row, 
                    Agent: currentUser?.name || '',  // Mark as claimed by current user
                    _hasTrackerData: true,  // Mark as having tracker data
                  };
                }
                return row;
              })
            };
          });

          await apiRequest("POST", `/api/sheets/${variables.trackerSheetId}/claim-store`, {
            linkValue: variables.link,
            column: "Agent",  // Claim with Agent column
            value: "",  // Empty value, just claiming
            joinColumn: variables.joinColumn,
          });

          // Background refetch to get correct tracker metadata - fire and forget
          queryClient.refetchQueries({ queryKey: ["merged-data"] });
        } catch (error) {
          // Soft error - don't block the user
          console.error("Auto-claim failed:", error);
        }
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
  });

  // Mutation to save color preferences
  const saveColorsMutation = useMutation({
    mutationFn: async ({ lightModeColors, darkModeColors }: any) => {
      return await apiRequest('PUT', '/api/user/preferences', {
        lightModeColors,
        darkModeColors,
      });
    },
    onSuccess: () => {
      // Reset initialization flag so saved colors get loaded back into local state
      setHasInitializedColors(false);
      queryClient.invalidateQueries({ queryKey: ['/api/user/preferences'] });
      toast({
        title: "Colors Saved",
        description: "Your color preferences have been saved",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleCellUpdate = (row: MergedDataRow, column: string, value: any) => {
    // Only admins can edit CRM table cells - sales agents must use Store Details dialog
    if (currentUser?.role !== 'admin') {
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
  const isRealAdmin = currentUser?.role === 'admin';
  
  // View mode: admins can toggle to view as agent
  const [viewAsAgent, setViewAsAgent] = useState(userPreferences?.viewAsAgent || false);
  const isAdmin = isRealAdmin && !viewAsAgent;

  const [isRefreshing, setIsRefreshing] = useState(false);

  const { data: mergedData, isLoading, refetch } = useQuery({
    queryKey: ['merged-data', storeSheetId, trackerSheetId, joinColumn],
    queryFn: async () => {
      if (!storeSheetId || !trackerSheetId) return null;
      const response = await fetch('/api/sheets/merged-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ storeSheetId, trackerSheetId, joinColumn }),
      });
      if (!response.ok) throw new Error('Failed to fetch merged data');
      return response.json();
    },
    enabled: !!storeSheetId && !!trackerSheetId,
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
        if (isAgentColumn(col) && currentUser?.role !== 'admin') {
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
            currentUser?.role === 'admin' || !isAgentColumn(col)
          );
          setColumnOrder(finalOrder);
        } else {
          const finalOrder = headers.filter((col: string) =>
            currentUser?.role === 'admin' || !isAgentColumn(col)
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
        if (userPreferences && 'showUnclaimedOnly' in userPreferences && userPreferences.showUnclaimedOnly !== undefined) {
          setShowUnclaimedOnly(userPreferences.showUnclaimedOnly);
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
          currentUser?.role === 'admin' || !isAgentColumn(col)
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
        setPreferencesLoaded(true);
      } else {
        // Preferences already loaded - check for new headers
        const newHeaders = headers.filter((h: string) => !currentOrder.includes(h));
        if (newHeaders.length > 0) {
          // Add new headers to column order (filtering out Agent for non-admins)
          const headersToAdd = newHeaders.filter((col: string) =>
            currentUser?.role === 'admin' || !isAgentColumn(col)
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
            window.location.href = `tel:${phoneNumber}`;
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

  const saveExpandedCell = () => {
    if (!expandedCell) return;
    handleCellUpdate(expandedCell.row, expandedCell.column, expandedCell.value);
    setExpandedCell(null);
  };

  const extractDomain = (url: string): string => {
    if (!url) return '';
    try {
      // Add protocol if missing
      const urlWithProtocol = url.startsWith('http') ? url : `https://${url}`;
      const urlObj = new URL(urlWithProtocol);
      return urlObj.hostname.replace('www.', '');
    } catch {
      // If URL parsing fails, try to extract domain manually
      const match = url.match(/(?:https?:\/\/)?(?:www\.)?([^\/\?]+)/i);
      return match ? match[1] : url;
    }
  };

  const formatHours = (value: string): string => {
    if (!value) return '';
    try {
      // Try to parse as JSON
      const hours = JSON.parse(value);
      if (typeof hours !== 'object') return value;

      const dayOrder = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
      const dayAbbrev: Record<string, string> = {
        monday: 'Mon',
        tuesday: 'Tue',
        wednesday: 'Wed',
        thursday: 'Thu',
        friday: 'Fri',
        saturday: 'Sat',
        sunday: 'Sun'
      };

      // Group consecutive days with same hours
      const groups: { days: string[]; hours: string }[] = [];
      let currentGroup: { days: string[]; hours: string } | null = null;

      dayOrder.forEach((day) => {
        const dayHours = hours[day] || hours[day.toLowerCase()];
        if (!dayHours) return;

        if (!currentGroup || currentGroup.hours !== dayHours) {
          // Start new group
          currentGroup = { days: [day], hours: dayHours };
          groups.push(currentGroup);
        } else {
          // Add to current group
          currentGroup.days.push(day);
        }
      });

      // Format groups
      return groups.map((group) => {
        if (group.days.length === 1) {
          return `${dayAbbrev[group.days[0]]}: ${group.hours}`;
        } else {
          const first = dayAbbrev[group.days[0]];
          const last = dayAbbrev[group.days[group.days.length - 1]];
          return `${first}-${last}: ${group.hours}`;
        }
      }).join(' • ');
    } catch {
      // Not valid JSON, return as-is
      return value;
    }
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
  const { allStates, stateCounts } = useMemo(() => {
    const states = new Set<string>();
    const counts: Record<string, number> = {};

    // Look for columns named "state" OR containing ", state" (like "City, State")
    const stateColumns = headers.filter((h: string) => {
      const lower = h.toLowerCase();
      return lower === 'state' || lower.includes(', state');
    });

    data.forEach((row: any) => {
      stateColumns.forEach((col: string) => {
        const value = row[col];
        if (value && String(value).trim()) {
          // Extract just the state part if it's "City, State" format
          const valueStr = String(value).trim();
          let stateAbbrev = valueStr;

          // If format is "City, ST", extract just the state abbreviation
          if (valueStr.includes(',')) {
            const parts = valueStr.split(',');
            if (parts.length >= 2) {
              stateAbbrev = parts[parts.length - 1].trim();
            }
          }

          // Try to convert 2-letter codes to full names
          let stateName = stateAbbrev;
          if (stateAbbrev.length === 2) {
            const fullName = getStateName(stateAbbrev);
            if (fullName) {
              stateName = fullName;
            }
          }

          states.add(stateName);
          counts[stateName] = (counts[stateName] || 0) + 1;
        }
      });
    });

    return {
      allStates: Array.from(states).sort(),
      stateCounts: counts
    };
  }, [headers, data]);

  // Get cities for selected states with their counts
  const { citiesInSelectedStates, cityCounts } = useMemo(() => {
    if (selectedStates.size === 0) {
      return { citiesInSelectedStates: [], cityCounts: {} };
    }

    const cities = new Set<string>();
    const counts: Record<string, number> = {};

    const cityColumns = headers.filter((h: string) => h.toLowerCase() === 'city');
    const stateColumns = headers.filter((h: string) => {
      const lower = h.toLowerCase();
      return lower === 'state' || lower.includes(', state');
    });

    data.forEach((row: any) => {
      // Check if this row's state is in selected states
      const rowState = stateColumns.map((col: string) => {
        const value = row[col];
        if (value && String(value).trim()) {
          const valueStr = String(value).trim();
          let stateAbbrev = valueStr;

          if (valueStr.includes(',')) {
            const parts = valueStr.split(',');
            if (parts.length >= 2) {
              stateAbbrev = parts[parts.length - 1].trim();
            }
          }

          const stateName = getStateName(stateAbbrev);
          return stateName || stateAbbrev;
        }
        return null;
      }).find((state: string | null) => state && selectedStates.has(state));

      if (rowState) {
        cityColumns.forEach((col: string) => {
          const cityValue = row[col];
          if (cityValue && String(cityValue).trim()) {
            const city = String(cityValue).trim();
            cities.add(city);
            counts[city] = (counts[city] || 0) + 1;
          }
        });
      }
    });

    return {
      citiesInSelectedStates: Array.from(cities).sort(),
      cityCounts: counts
    };
  }, [headers, data, selectedStates]);

  // Initialize selected states when data loads (or from saved preferences)
  useEffect(() => {
    if (allStates.length > 0 && selectedStates.size === 0 && preferencesLoaded) {
      if (userPreferences?.selectedStates && userPreferences.selectedStates.length > 0) {
        // Filter saved states to only include ones that still exist in the data
        const validStates = userPreferences.selectedStates.filter((state: string) => allStates.includes(state));
        setSelectedStates(new Set(validStates));
      }
      // If no saved preferences, do NOT auto-select anything - user must manually choose
    }
  }, [allStates.length, userPreferences, preferencesLoaded]);

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
  }, [visibleColumns, columnOrder, columnWidths, selectedStates, selectedCities, fontSize, rowHeight, preferencesLoaded, textAlign, verticalAlign, statusOptions, freezeFirstColumn, showMyStoresOnly, showUnclaimedOnly]);

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
  };

  const clearAllStates = () => {
    setSelectedStates(new Set());
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

  const handleCellEdit = (row: any, column: string, value: string) => {
    // Only admins can edit CRM table cells - sales agents must use Store Details dialog
    if (currentUser?.role !== 'admin') {
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
      const franchiseLinks = new Set(selectedFranchise.locations.map((loc: any) => loc.Link));
      let filtered = data.filter((row: any) => franchiseLinks.has(row.Link));

      // Apply search filter (if any)
      if (searchTerm.trim()) {
        const searchLower = searchTerm.toLowerCase();
        filtered = filtered.filter((row: any) => {
          return headers.some((header: string) => {
            const value = row[header]?.toString().toLowerCase() || '';
            return value.includes(searchLower);
          });
        });
      }

      // Apply sorting
      if (sortColumn) {
        filtered = [...filtered].sort((a: any, b: any) => {
          const aVal = String(a[sortColumn] || '');
          const bVal = String(b[sortColumn] || '');

          // Try numeric comparison first
          const aNum = parseFloat(aVal);
          const bNum = parseFloat(bVal);

          if (!isNaN(aNum) && !isNaN(bNum)) {
            return sortDirection === 'asc' ? aNum - bNum : bNum - aNum;
          }

          // Fall back to string comparison
          const comparison = aVal.toLowerCase().localeCompare(bVal.toLowerCase());
          return sortDirection === 'asc' ? comparison : -comparison;
        });
      }

      return filtered;
    }

    // My Stores Only filter - bypass state/city filters when active
    if (showMyStoresOnly) {
      // Filter to only claimed stores (_hasTrackerData === true)
      let filtered = data.filter((row: any) => row._hasTrackerData === true);

      // Apply search filter (if any)
      if (searchTerm.trim()) {
        const searchLower = searchTerm.toLowerCase();
        filtered = filtered.filter((row: any) => {
          return headers.some((header: string) => {
            const value = row[header]?.toString().toLowerCase() || '';
            return value.includes(searchLower);
          });
        });
      }

      // Apply status filter (if any)
      if (selectedStatuses.size > 0) {
        const statusColumns = headers.filter((h: string) => h.toLowerCase().includes('status'));
        filtered = filtered.filter((row: any) => {
          return statusColumns.some((col: string) => {
            const value = row[col];
            if (value && String(value).trim()) {
              return selectedStatuses.has(String(value).trim());
            }
            return false;
          });
        });
      }

      // Apply sorting
      if (sortColumn) {
        filtered = [...filtered].sort((a: any, b: any) => {
          const aVal = String(a[sortColumn] || '');
          const bVal = String(b[sortColumn] || '');

          // Try numeric comparison first
          const aNum = parseFloat(aVal);
          const bNum = parseFloat(bVal);

          if (!isNaN(aNum) && !isNaN(bNum)) {
            return sortDirection === 'asc' ? aNum - bNum : bNum - aNum;
          }

          // Fall back to string comparison
          const comparison = aVal.toLowerCase().localeCompare(bVal.toLowerCase());
          return sortDirection === 'asc' ? comparison : -comparison;
        });
      }

      return filtered;
    }

    // Regular filtering (all stores mode and Show Unclaimed Shops mode)
    // CRITICAL: If any filter has 0 selections, show NOTHING (not everything)
    if (allStates.length > 0 && selectedStates.size === 0) {
      return []; // Show 0 rows when nothing is selected
    }

    // First filter by search
    let filtered = data.filter((row: any) => {
      const searchLower = searchTerm.toLowerCase();
      return headers.some((header: string) => {
        const value = row[header]?.toString().toLowerCase() || '';
        return value.includes(searchLower);
      });
    });

    // Show Unclaimed Shops: exclude stores claimed by current user
    if (showUnclaimedOnly && currentUser?.agentName) {
      filtered = filtered.filter((row: any) => {
        const agentName = row['Agent Name'] || row['agent name'] || row['Agent'] || row['agent'] || '';
        const agentNameStr = agentName.toString().trim();
        // Exclude if agent name matches current user's agent name
        return agentNameStr !== currentUser.agentName;
      });
    }

    // Filter by name if nameFilter is set
    if (nameFilter.trim()) {
      const nameLower = nameFilter.toLowerCase();
      filtered = filtered.filter((row: any) => {
        const nameValue = (row['name'] || row['Name'] || row['Company'] || row['company'] || '').toString().toLowerCase();
        return nameValue.includes(nameLower);
      });
    }

    // Filter by city if cityFilter is set
    if (cityFilter.trim()) {
      const cityLower = cityFilter.toLowerCase();
      filtered = filtered.filter((row: any) => {
        const cityValue = (row['city'] || row['City'] || '').toString().toLowerCase();
        return cityValue.includes(cityLower);
      });
    }

    // Then filter by states
    if (selectedStates.size > 0 && selectedStates.size < allStates.length) {
      const stateColumns = headers.filter((h: string) => {
        const lower = h.toLowerCase();
        return lower === 'state' || lower.includes(', state');
      });
      filtered = filtered.filter((row: any) => {
        // Check if row's state is in selected states
        return stateColumns.some((col: string) => {
          const value = row[col];
          if (value && String(value).trim()) {
            const valueStr = String(value).trim();
            let stateAbbrev = valueStr;

            // If format is "City, ST", extract just the state abbreviation
            if (valueStr.includes(',')) {
              const parts = valueStr.split(',');
              if (parts.length >= 2) {
                stateAbbrev = parts[parts.length - 1].trim();
              }
            }

            const stateName = getStateName(stateAbbrev);
            return stateName && selectedStates.has(stateName);
          }
          return false;
        });
      });
    }

    // Filter by cities if we have cities available in selected states
    // CRITICAL: If 0 cities are selected, show NOTHING. If some but not all are selected, filter.
    if (selectedStates.size > 0 && citiesInSelectedStates.length > 0) {
      if (selectedCities.size === 0) {
        // NO cities selected = show NOTHING
        return [];
      } else if (selectedCities.size < citiesInSelectedStates.length) {
        // Some cities selected but not all = filter to show only selected cities
        const cityColumns = headers.filter((h: string) => h.toLowerCase() === 'city');
        filtered = filtered.filter((row: any) => {
          return cityColumns.some((col: string) => {
            const value = row[col];
            if (value && String(value).trim()) {
              return selectedCities.has(String(value).trim());
            }
            return false;
          });
        });
      }
      // If all cities are selected, don't filter (show everything)
    }

    // Filter by status if any statuses are selected
    if (selectedStatuses.size > 0) {
      const statusColumns = headers.filter((h: string) => h.toLowerCase().includes('status'));
      filtered = filtered.filter((row: any) => {
        return statusColumns.some((col: string) => {
          const value = row[col];
          if (value && String(value).trim()) {
            return selectedStatuses.has(String(value).trim());
          }
          return false;
        });
      });
    }

    // Then sort
    if (sortColumn) {
      filtered = [...filtered].sort((a: any, b: any) => {
        const aVal = String(a[sortColumn] || '');
        const bVal = String(b[sortColumn] || '');

        // Try numeric comparison first
        const aNum = parseFloat(aVal);
        const bNum = parseFloat(bVal);

        if (!isNaN(aNum) && !isNaN(bNum)) {
          return sortDirection === 'asc' ? aNum - bNum : bNum - aNum;
        }

        // Fall back to string comparison
        const comparison = aVal.toLowerCase().localeCompare(bVal.toLowerCase());
        return sortDirection === 'asc' ? comparison : -comparison;
      });
    }

    return filtered;
  }, [
    data,
    searchTerm,
    nameFilter,
    cityFilter,
    selectedStates,
    selectedCities,
    citiesInSelectedStates.length,
    allStates.length,
    headers,
    sortColumn,
    sortDirection,
    showMyStoresOnly,
    selectedStatuses,
    selectedFranchise
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

  const getCompanyName = (row: any) => {
    return row['Company'] || row['company'] || row['Business Name'] || row['name'] || 'Unknown';
  };

  // Show full-page loading state until data is ready
  if (isLoadingSheets || isLoading || !preferencesLoaded) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={customColors.bodyBackground ? {
          backgroundColor: customColors.bodyBackground,
        } : {}}
      >
        <div className="flex flex-col items-center justify-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-primary mb-4" data-testid="spinner-loading"></div>
          <p className="text-muted-foreground">Loading your data...</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen"
      style={customColors.bodyBackground ? {
        backgroundColor: customColors.bodyBackground,
      } : {}}
    >
      <div
        className="container mx-auto p-6 space-y-6"
        style={{
          backgroundColor: customColors.background,
          color: customColors.text,
        }}
      >
      <Card style={{ backgroundColor: customColors.secondary, borderColor: customColors.border }}>
        <CardHeader className="pb-3">
          <CardTitle>Client Dashboard</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">

          {/* No Sheets Found */}
          {!storeSheetId && !trackerSheetId && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 p-4 rounded-md">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                No sheets found. Please connect your sheets in Admin Dashboard → Google Sheets tab with purposes "clients" (Store Database) and "commissions" (Commission Tracker).
              </p>
            </div>
          )}

          {/* Controls */}
          {storeSheetId && trackerSheetId && (
            <>
              {/* Top Row: Search/Refresh + Display Settings Card */}
              <div className="flex flex-wrap items-start justify-between gap-4">
                {/* Left side: Search and Refresh */}
                <div className="flex flex-col gap-2 flex-1 min-w-[300px]">
                  <div className="flex items-center gap-2">
                    <Input
                      placeholder="Search all columns..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="flex-1 max-w-md"
                      data-testid="input-search"
                    />
                    <Button
                      variant="outline"
                      onClick={handleManualRefresh}
                      disabled={isLoading || isRefreshing}
                      data-testid="button-refresh"
                      style={currentColors.actionButtons ? { backgroundColor: currentColors.actionButtons, borderColor: currentColors.actionButtons } : undefined}
                    >
                      <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                      {isRefreshing ? 'Refreshing...' : 'Refresh'}
                    </Button>
                  </div>
                  {/* Filter toggles */}
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="my-stores-only"
                        checked={showMyStoresOnly}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setShowUnclaimedOnly(false);
                          }
                          setShowMyStoresOnly(checked === true);
                        }}
                        data-testid="checkbox-my-stores-only"
                      />
                      <Label
                        htmlFor="my-stores-only"
                        className="text-sm font-medium cursor-pointer"
                        style={{ color: customColors.text }}
                      >
                        My Stores Only
                      </Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="unclaimed-only"
                        checked={showUnclaimedOnly}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setShowMyStoresOnly(false);
                          }
                          setShowUnclaimedOnly(checked === true);
                        }}
                        data-testid="checkbox-unclaimed-only"
                      />
                      <Label
                        htmlFor="unclaimed-only"
                        className="text-sm font-medium cursor-pointer"
                        style={{ color: customColors.text }}
                      >
                        Show Unclaimed Shops
                      </Label>
                    </div>
                  </div>
                </div>

                {/* Right side: Display Settings Card */}
                <Card className="w-auto">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between gap-4">
                      <CardTitle className="text-sm font-medium">Display Settings</CardTitle>
                      {/* Quick Reset Options in header */}
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Reset Columns */}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const hiddenColumns = ['title', 'error'];
                            const newVisibleColumns: Record<string, boolean> = {};
                            headers.forEach((header: string) => {
                              newVisibleColumns[header] = !hiddenColumns.includes(header.toLowerCase());
                            });
                            setVisibleColumns(newVisibleColumns);
                            setColumnOrder(headers);
                            toast({
                              title: "Columns Reset",
                              description: "All columns are now visible in their original order",
                            });
                          }}
                          data-testid="button-reset-columns-header"
                        >
                          <RotateCcw className="mr-2 h-4 w-4" />
                          Reset Columns
                        </Button>

                        {/* Reset Display (Font & Row Height) */}
                        {(fontSize !== 14 || rowHeight !== 48) && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setFontSize(14);
                              setRowHeight(48);
                              toast({
                                title: "Display Reset",
                                description: "Font size and row height reset to defaults",
                              });
                            }}
                            data-testid="button-reset-display-header"
                          >
                            <Type className="mr-2 h-4 w-4" />
                            Reset Display
                          </Button>
                        )}

                        {/* Reset Alignment */}
                        {(textAlign !== 'left' || verticalAlign !== 'middle') && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setTextAlign('left');
                              setVerticalAlign('middle');
                              toast({
                                title: "Alignment Reset",
                                description: "Text and vertical alignment reset to defaults",
                              });
                            }}
                            data-testid="button-reset-alignment-header"
                          >
                            <AlignLeft className="mr-2 h-4 w-4" />
                            Reset Alignment
                          </Button>
                        )}

                        {/* Reset All Filters */}
                        {(selectedStates.size < allStates.length ||
                          searchTerm !== '') && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedStates(new Set(allStates));
                              setSearchTerm('');
                              toast({
                                title: "Filters Reset",
                                description: "All filters cleared and search reset",
                              });
                            }}
                            data-testid="button-reset-filters-header"
                          >
                            <EyeOff className="mr-2 h-4 w-4" />
                            Reset Filters
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Font Size Selector */}
                      <div className="flex items-center gap-2">
                        <Type className="h-4 w-4 text-muted-foreground" />
                        <Select
                          value={fontSize.toString()}
                          onValueChange={(value) => setFontSize(parseInt(value))}
                        >
                          <SelectTrigger className="w-20" data-testid="select-font-size">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="8">8</SelectItem>
                            <SelectItem value="9">9</SelectItem>
                            <SelectItem value="10">10</SelectItem>
                            <SelectItem value="11">11</SelectItem>
                            <SelectItem value="12">12</SelectItem>
                            <SelectItem value="13">13</SelectItem>
                            <SelectItem value="14">14</SelectItem>
                            <SelectItem value="15">15</SelectItem>
                            <SelectItem value="16">16</SelectItem>
                            <SelectItem value="17">17</SelectItem>
                            <SelectItem value="18">18</SelectItem>
                            <SelectItem value="19">19</SelectItem>
                            <SelectItem value="20">20</SelectItem>
                            <SelectItem value="21">21</SelectItem>
                            <SelectItem value="22">22</SelectItem>
                            <SelectItem value="24">24</SelectItem>
                            <SelectItem value="26">26</SelectItem>
                            <SelectItem value="28">28</SelectItem>
                            <SelectItem value="30">30</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Row Height Slider */}
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" size="icon" data-testid="button-row-height">
                            <AlignJustify className="h-4 w-4" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-72">
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <Label className="text-sm font-medium">Row Height</Label>
                              <span className="text-sm text-muted-foreground">{rowHeight}px</span>
                            </div>
                            <Slider
                              value={[rowHeight]}
                              onValueChange={(value) => setRowHeight(value[0])}
                              min={24}
                              max={200}
                              step={1}
                              className="w-full"
                              data-testid="slider-row-height"
                            />
                            <div className="flex justify-between text-xs text-muted-foreground">
                              <span>Compact</span>
                              <span>Comfortable</span>
                              <span>Spacious</span>
                            </div>
                            {(() => {
                              const minRequired = Math.ceil(fontSize * 1.4 + Math.max(8, fontSize * 0.5) * 2);
                              return rowHeight < minRequired ? (
                                <p className="text-xs text-muted-foreground">
                                  Note: Minimum {minRequired}px needed for {fontSize}px font
                                </p>
                              ) : null;
                            })()}
                          </div>
                        </PopoverContent>
                      </Popover>

                      {/* Text Alignment Buttons */}
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" size="icon" data-testid="button-text-align">
                            {textAlign === 'left' && <AlignLeft className="h-4 w-4" />}
                            {textAlign === 'center' && <AlignCenter className="h-4 w-4" />}
                            {textAlign === 'right' && <AlignRight className="h-4 w-4" />}
                            {textAlign === 'justify' && <AlignJustify className="h-4 w-4" />}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-48">
                          <div className="grid grid-cols-2 gap-2">
                            <Button
                              variant={textAlign === 'left' ? 'default' : 'outline'}
                              size="icon"
                              onClick={() => setTextAlign('left')}
                              data-testid="button-align-left"
                            >
                              <AlignLeft className="h-4 w-4" />
                            </Button>
                            <Button
                              variant={textAlign === 'center' ? 'default' : 'outline'}
                              size="icon"
                              onClick={() => setTextAlign('center')}
                              data-testid="button-align-center"
                            >
                              <AlignCenter className="h-4 w-4" />
                            </Button>
                            <Button
                              variant={textAlign === 'right' ? 'default' : 'outline'}
                              size="icon"
                              onClick={() => setTextAlign('right')}
                              data-testid="button-align-right"
                            >
                              <AlignRight className="h-4 w-4" />
                            </Button>
                            <Button
                              variant={textAlign === 'justify' ? 'default' : 'outline'}
                              size="icon"
                              onClick={() => setTextAlign('justify')}
                              data-testid="button-align-justify"
                            >
                              <AlignJustify className="h-4 w-4" />
                            </Button>
                          </div>
                        </PopoverContent>
                      </Popover>

                      {/* Vertical Alignment Buttons */}
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" size="icon" data-testid="button-vertical-align">
                            {verticalAlign === 'top' && (
                              <div className="flex flex-col justify-start h-4 w-4">
                                <div className="w-1 h-1 bg-current rounded-full"></div>
                              </div>
                            )}
                            {verticalAlign === 'middle' && (
                              <div className="flex flex-col justify-center h-4 w-4">
                                <div className="w-1 h-1 bg-current rounded-full"></div>
                              </div>
                            )}
                            {verticalAlign === 'bottom' && (
                              <div className="flex flex-col justify-end h-4 w-4">
                                <div className="w-1 h-1 bg-current rounded-full"></div>
                              </div>
                            )}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-48">
                          <div className="grid grid-cols-1 gap-2">
                            <Button
                              variant={verticalAlign === 'top' ? 'default' : 'outline'}
                              size="icon"
                              onClick={() => setVerticalAlign('top')}
                              data-testid="button-valign-top"
                            >
                              <div className="flex flex-col justify-start h-4 w-4">
                                <div className="w-1 h-1 bg-current rounded-full"></div>
                              </div>
                            </Button>
                            <Button
                              variant={verticalAlign === 'middle' ? 'default' : 'outline'}
                              size="icon"
                              onClick={() => setVerticalAlign('middle')}
                              data-testid="button-valign-middle"
                            >
                              <div className="flex flex-col justify-center h-4 w-4">
                                <div className="w-1 h-1 bg-current rounded-full"></div>
                              </div>
                            </Button>
                            <Button
                              variant={verticalAlign === 'bottom' ? 'default' : 'outline'}
                              size="icon"
                              onClick={() => setVerticalAlign('bottom')}
                              data-testid="button-valign-bottom"
                            >
                              <div className="flex flex-col justify-end h-4 w-4">
                                <div className="w-1 h-1 bg-current rounded-full"></div>
                              </div>
                            </Button>
                          </div>
                        </PopoverContent>
                      </Popover>

                      {/* Freeze First Column Checkbox */}
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="freeze-first-column"
                          checked={freezeFirstColumn}
                          onCheckedChange={(checked) => setFreezeFirstColumn(!!checked)}
                          data-testid="checkbox-freeze-column"
                        />
                        <Label htmlFor="freeze-first-column" className="text-sm cursor-pointer">Freeze Column</Label>
                      </div>

                      {/* Status Button - Opens editor dialog */}
                      <StatusEditorPopover
                        statusOptions={statusOptions}
                        statusColors={statusColors}
                        colorRowByStatus={colorRowByStatus}
                        setColorRowByStatus={setColorRowByStatus}
                        updateStatusEntry={updateStatusEntry}
                        colorPresets={colorPresets}
                        setColorPresets={setColorPresets}
                        deleteColorPreset={deleteColorPreset}
                        currentUser={currentUser}
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Filters Row */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Total and Visible Shops Counter */}
                <div className="flex items-center gap-2 text-sm text-muted-foreground px-3 py-1 bg-muted rounded-md" data-testid="text-shops-counter">
                  <span className="font-medium">Showing {filteredData.length} of {data.length} shops</span>
                </div>

                <Popover>
                  <PopoverTrigger asChild>
                    <Button 
                      variant="outline" 
                      data-testid="button-states-filter"
                      style={currentColors.statesButton ? { backgroundColor: currentColors.statesButton, borderColor: currentColors.statesButton } : undefined}
                    >
                      <Settings2 className="mr-2 h-4 w-4" />
                      States ({selectedStates.size}/{allStates.length})
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">Filter by State</h4>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={selectAllStates}
                            data-testid="button-select-all-states"
                          >
                            All
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={clearAllStates}
                            data-testid="button-clear-all-states"
                          >
                            None
                          </Button>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Uncheck states to hide rows from those states
                      </p>

                      {/* Canada Checkbox */}
                      <div className="flex items-center gap-2 p-2 bg-muted rounded-md">
                        <Checkbox
                          id="canada-toggle"
                          checked={showCanadaOnly}
                          onCheckedChange={(checked) => {
                            setShowCanadaOnly(!!checked);
                          }}
                          data-testid="checkbox-canada-toggle"
                        />
                        <Label
                          htmlFor="canada-toggle"
                          className="text-sm cursor-pointer flex-1 font-medium"
                        >
                          Canada
                        </Label>
                        <span className="text-xs text-muted-foreground">
                          ({allStates.filter(isCanadianProvince).reduce((sum, state) => sum + (stateCounts[state] || 0), 0)} shops)
                        </span>
                      </div>

                      <ScrollArea className="h-64">
                        <div className="space-y-2">
                          {allStates
                            .filter(state => showCanadaOnly ? isCanadianProvince(state) : !isCanadianProvince(state))
                            .map((state: string) => (
                            <div key={state} className="flex items-center gap-2">
                              <Checkbox
                                id={`state-${state}`}
                                checked={selectedStates.has(state)}
                                onCheckedChange={() => toggleState(state)}
                                data-testid={`checkbox-state-${state}`}
                              />
                              <Label
                                htmlFor={`state-${state}`}
                                className="text-sm cursor-pointer flex-1"
                              >
                                {state}
                              </Label>
                              <span className="text-xs text-muted-foreground">
                                ({stateCounts[state] || 0})
                              </span>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </div>
                  </PopoverContent>
                </Popover>

                {/* Cities Filter - Only shown when states are selected */}
                {selectedStates.size > 0 && citiesInSelectedStates.length > 0 && (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" data-testid="button-cities-filter">
                        <Settings2 className="mr-2 h-4 w-4" />
                        Cities ({selectedCities.size}/{citiesInSelectedStates.length})
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium">Filter by City</h4>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedCities(new Set(citiesInSelectedStates))}
                              data-testid="button-select-all-cities"
                            >
                              All
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedCities(new Set())}
                              data-testid="button-clear-all-cities"
                            >
                              None
                            </Button>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Cities in selected states ({citiesInSelectedStates.length} total)
                        </p>

                        {/* City search box */}
                        <Input
                          placeholder="Search cities..."
                          value={citySearchTerm}
                          onChange={(e) => setCitySearchTerm(e.target.value)}
                          className="h-8"
                          data-testid="input-search-cities"
                        />

                        <ScrollArea className="h-64">
                          <div className="space-y-2">
                            {citiesInSelectedStates
                              .filter((city: string) => 
                                city.toLowerCase().includes(citySearchTerm.toLowerCase())
                              )
                              .map((city: string) => (
                              <div key={city} className="flex items-center gap-2">
                                <Checkbox
                                  id={`city-${city}`}
                                  checked={selectedCities.has(city)}
                                  onCheckedChange={() => {
                                    const newSelected = new Set(selectedCities);
                                    if (newSelected.has(city)) {
                                      newSelected.delete(city);
                                    } else {
                                      newSelected.add(city);
                                    }
                                    setSelectedCities(newSelected);
                                  }}
                                  data-testid={`checkbox-city-${city}`}
                                />
                                <Label
                                  htmlFor={`city-${city}`}
                                  className="text-sm cursor-pointer flex-1"
                                >
                                  {city}
                                </Label>
                                <span className="text-xs text-muted-foreground">
                                  ({cityCounts[city] || 0})
                                </span>
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                      </div>
                    </PopoverContent>
                  </Popover>
                )}

                {/* Franchise Finder */}
                {selectedFranchise ? (
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="outline" 
                      onClick={() => setFranchiseFinderOpen(true)}
                      data-testid="button-franchise-finder"
                      style={currentColors.franchiseButton ? { backgroundColor: currentColors.franchiseButton, borderColor: currentColors.franchiseButton } : undefined}
                    >
                      <Store className="mr-2 h-4 w-4" />
                      {selectedFranchise.brandName}
                      <Badge variant="secondary" className="ml-2">
                        {selectedFranchise.locations.length}
                      </Badge>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedFranchise(null)}
                      data-testid="button-clear-franchise"
                    >
                      Clear
                    </Button>
                  </div>
                ) : (
                  <Button 
                    variant="outline" 
                    onClick={() => setFranchiseFinderOpen(true)}
                    data-testid="button-franchise-finder"
                    style={currentColors.franchiseButton ? { backgroundColor: currentColors.franchiseButton, borderColor: currentColors.franchiseButton } : undefined}
                  >
                    <Store className="mr-2 h-4 w-4" />
                    Find Franchises
                  </Button>
                )}

                {/* Duplicate Finder - Admin Only */}
                {isAdmin && (
                  <Button 
                    variant="outline" 
                    onClick={() => setDuplicateFinderOpen(true)}
                    data-testid="button-dups"
                  >
                    <Copy className="mr-2 h-4 w-4" />
                    DUPS
                  </Button>
                )}

                {/* Status Filter */}
                <Popover>
                  <PopoverTrigger asChild>
                    <Button 
                      variant="outline" 
                      data-testid="button-status-filter"
                      style={currentColors.statusButton ? { backgroundColor: currentColors.statusButton, borderColor: currentColors.statusButton } : undefined}
                    >
                      <Settings2 className="mr-2 h-4 w-4" />
                      Status ({selectedStatuses.size > 0 ? selectedStatuses.size : 'All'})
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">Filter by Status</h4>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedStatuses(new Set(statusOptions))}
                            data-testid="button-select-all-statuses"
                          >
                            All
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedStatuses(new Set())}
                            data-testid="button-clear-all-statuses"
                          >
                            None
                          </Button>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Select which statuses to display
                      </p>

                      <ScrollArea className="h-64">
                        <div className="space-y-2">
                          {statusOptions.map((status) => (
                            <div key={status} className="flex items-center gap-2">
                              <Checkbox
                                id={`status-${status}`}
                                checked={selectedStatuses.has(status)}
                                onCheckedChange={() => {
                                  const newSelected = new Set(selectedStatuses);
                                  if (newSelected.has(status)) {
                                    newSelected.delete(status);
                                  } else {
                                    newSelected.add(status);
                                  }
                                  setSelectedStatuses(newSelected);
                                }}
                                data-testid={`checkbox-status-${status}`}
                              />
                              <Label
                                htmlFor={`status-${status}`}
                                className="text-sm cursor-pointer flex-1"
                              >
                                {status}
                              </Label>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </div>
                  </PopoverContent>
                </Popover>

                <Popover>
                  <PopoverTrigger asChild>
                    <Button 
                      variant="outline" 
                      data-testid="button-column-settings"
                      style={currentColors.columnsButton ? { backgroundColor: currentColors.columnsButton, borderColor: currentColors.columnsButton } : undefined}
                    >
                      <Settings2 className="mr-2 h-4 w-4" />
                      Columns
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-96">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">Manage Columns</h4>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={autoFitColumns}
                            data-testid="button-autofit-columns"
                          >
                            <Maximize2 className="mr-2 h-3 w-3" />
                            Auto-fit
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              const hiddenColumns = ['title', 'error'];
                              const newVisibleColumns: Record<string, boolean> = {};
                              headers.forEach((header: string) => {
                                newVisibleColumns[header] = !hiddenColumns.includes(header.toLowerCase());
                              });
                              setVisibleColumns(newVisibleColumns);
                              setColumnOrder(headers);
                              toast({
                                title: "Columns Reset",
                                description: "All columns are now visible in their original order",
                              });
                            }}
                            data-testid="button-reset-columns"
                          >
                            <RotateCcw className="mr-2 h-3 w-3" />
                            Reset
                          </Button>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">Show/hide and reorder columns (doesn't affect Google Sheets)</p>
                      <ScrollArea className="h-72">
                        <div className="space-y-2">
                          {columnOrder.filter((h: string) => !['error', 'title'].includes(h.toLowerCase())).map((header: string) => {
                            const filteredOrder = columnOrder.filter((h: string) => !['error', 'title'].includes(h.toLowerCase()));
                            const filteredIndex = filteredOrder.indexOf(header);
                            return (
                            <div key={header} className="flex items-center gap-2 group">
                              <Checkbox
                                id={`col-${header}`}
                                checked={visibleColumns[header]}
                                onCheckedChange={() => toggleColumn(header)}
                                data-testid={`checkbox-column-${header}`}
                              />
                              <Label
                                htmlFor={`col-${header}`}
                                className="text-sm cursor-pointer flex-1"
                              >
                                {header}
                                {editableColumns.includes(header) && (
                                  <span className="ml-2 text-xs text-muted-foreground">✏️</span>
                                )}
                              </Label>
                              <div className="flex gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                  onClick={() => moveColumnLeft(header)}
                                  disabled={filteredIndex === 0}
                                  data-testid={`button-move-left-${header}`}
                                >
                                  <ChevronLeft className="h-3 w-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                  onClick={() => moveColumnRight(header)}
                                  disabled={filteredIndex === filteredOrder.length - 1}
                                  data-testid={`button-move-right-${header}`}
                                >
                                  <ChevronRight className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          );
                          })}
                        </div>
                      </ScrollArea>
                    </div>
                  </PopoverContent>
                </Popover>

                {/* Call History Button */}
                <Button
                  variant="outline"
                  onClick={() => setCallHistoryOpen(true)}
                  data-testid="button-call-history"
                  style={currentColors.actionButtons ? { backgroundColor: currentColors.actionButtons, borderColor: currentColors.actionButtons } : undefined}
                >
                  <Phone className="mr-2 h-4 w-4" />
                  Call History
                </Button>

                {/* Export vCard Button */}
                <Button
                  variant="outline"
                  onClick={() => {
                    setVCardListName("");
                    setExportVCardDialogOpen(true);
                  }}
                  data-testid="button-export-vcard"
                  style={currentColors.actionButtons ? { backgroundColor: currentColors.actionButtons, borderColor: currentColors.actionButtons } : undefined}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Export vCard
                </Button>
              </div>
            </>
          )}



          {/* Data Table */}
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-2 text-muted-foreground">Loading data...</p>
            </div>
          ) : storeSheetId && trackerSheetId && data.length > 0 ? (
            <>
              <h2 className="text-2xl font-semibold mb-4" style={{ color: customColors.text }}>
                My Client Dashboard
              </h2>
              <div className="border rounded-md overflow-hidden" style={{ borderColor: customColors.border }}>
              <div 
                ref={tableContainerRef}
                className="h-[600px] w-full overflow-auto" 
                style={{ backgroundColor: customColors.background }}
              >
                <Table className="min-w-full" style={{ tableLayout: 'fixed' }}>
                  <TableHeader className="sticky top-0 z-10" style={{ backgroundColor: customColors.headerBackground || customColors.background }}>
                    <TableRow>
                      {visibleHeaders.map((header: string, index: number) => {
                        const isNameColumn = header.toLowerCase() === 'name' || header.toLowerCase() === 'company';
                        const isCityColumn = header.toLowerCase() === 'city';
                        const hasInlineSearch = isNameColumn || isCityColumn;
                        const isFirstColumn = index === 0;

                        return (
                        <TableHead
                          key={header}
                          className="whitespace-nowrap relative group text-center"
                          style={{ 
                            width: columnWidths[header] || 200,
                            ...(isFirstColumn && freezeFirstColumn ? {
                              position: 'sticky',
                              left: 0,
                              zIndex: 20,
                              backgroundColor: customColors.headerBackground || customColors.background
                            } : {})
                          }}
                        >
                          <div className="flex flex-col gap-1 pr-4">
                            <div className="flex items-center justify-between">
                            <DropdownMenu open={contextMenuColumn === header} onOpenChange={(open) => setContextMenuColumn(open ? header : null)}>
                              <DropdownMenuTrigger asChild>
                                <button
                                  onClick={() => handleSort(header)}
                                  onContextMenu={(e) => {
                                    e.preventDefault();
                                    setContextMenuColumn(header);
                                  }}
                                  className="flex items-center gap-2 hover:text-primary transition-colors cursor-pointer flex-1"
                                  data-testid={`button-sort-${header}`}
                                >
                                  <span>
                                    {header}
                                    {editableColumns.includes(header) && (
                                      <span className="ml-1 text-xs text-muted-foreground">✏️</span>
                                    )}
                                  </span>
                                  {sortColumn === header ? (
                                    sortDirection === 'asc' ? (
                                      <ArrowUp className="h-4 w-4" />
                                    ) : (
                                      <ArrowDown className="h-4 w-4" />
                                    )
                                  ) : (
                                    <ArrowUpDown className="h-4 w-4 opacity-30" />
                                  )}
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="start" className="w-48">
                                <DropdownMenuItem
                                  onClick={() => {
                                    setSortColumn(header);
                                    setSortDirection('asc');
                                    setContextMenuColumn(null);
                                  }}
                                  data-testid={`menu-sort-asc-${header}`}
                                >
                                  <SortAsc className="mr-2 h-4 w-4" />
                                  Sort A → Z
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => {
                                    setSortColumn(header);
                                    setSortDirection('desc');
                                    setContextMenuColumn(null);
                                  }}
                                  data-testid={`menu-sort-desc-${header}`}
                                >
                                  <SortDesc className="mr-2 h-4 w-4" />
                                  Sort Z → A
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => {
                                    toggleColumn(header);
                                    setContextMenuColumn(null);
                                  }}
                                  data-testid={`menu-hide-${header}`}
                                >
                                  <EyeOff className="mr-2 h-4 w-4" />
                                  Hide Column
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => {
                                    moveColumnLeft(header);
                                    setContextMenuColumn(null);
                                  }}
                                  disabled={columnOrder.filter((h: string) => !['error', 'title'].includes(h.toLowerCase())).indexOf(header) === 0}
                                  data-testid={`menu-move-left-${header}`}
                                >
                                  <ChevronLeft className="mr-2 h-4 w-4" />
                                  Move Left
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => {
                                    moveColumnRight(header);
                                    setContextMenuColumn(null);
                                  }}
                                  disabled={columnOrder.filter((h: string) => !['error', 'title'].includes(h.toLowerCase())).indexOf(header) === columnOrder.filter((h: string) => !['error', 'title'].includes(h.toLowerCase())).length - 1}
                                  data-testid={`menu-move-right-${header}`}
                                >
                                  <ChevronRight className="mr-2 h-4 w-4" />
                                  Move Right
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                            </div>

                            {/* Inline search box for Name and City columns */}
                            {hasInlineSearch && (
                              <Input
                                placeholder={`Filter ${header}...`}
                                value={isNameColumn ? nameFilter : cityFilter}
                                onChange={(e) => {
                                  e.stopPropagation();
                                  if (isNameColumn) {
                                    setNameFilter(e.target.value);
                                  } else {
                                    setCityFilter(e.target.value);
                                  }
                                }}
                                onClick={(e) => e.stopPropagation()}
                                className="h-7 text-xs"
                                data-testid={`input-filter-${header.toLowerCase()}`}
                              />
                            )}

                            <div
                              className="absolute right-0 top-0 bottom-0 w-4 cursor-col-resize hover:bg-primary/50 transition-colors z-20 flex items-center justify-center"
                              onMouseDown={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                document.body.style.userSelect = 'none';
                                setResizingColumn({
                                  column: header,
                                  startX: e.clientX,
                                  startWidth: columnWidths[header] || 200,
                                });
                              }}
                              title="Drag to resize column"
                            >
                              <div className="w-0.5 h-8 bg-border group-hover:bg-primary/50 transition-colors" />
                            </div>
                          </div>
                        </TableHead>
                      );
                      })}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <tr style={{ height: `${rowVirtualizer.getTotalSize()}px`, position: 'relative' }}>
                      <td colSpan={visibleHeaders.length} style={{ padding: 0, border: 'none' }}>
                        <div style={{ position: 'relative', height: `${rowVirtualizer.getTotalSize()}px` }}>
                          {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                            const rowIdx = virtualRow.index;
                            const row = filteredData[rowIdx];
                            const rowKey = row._storeRowIndex || row._trackerRowIndex || rowIdx;
                            const isDeletedRow = row._deletedFromStore;
                            // Calculate minimum required height based on font size
                            const verticalPadding = Math.max(8, fontSize * 0.5) * 2;
                            const lineHeight = fontSize * 1.4;
                            const minRequiredHeight = lineHeight + verticalPadding;
                            const effectiveHeight = Math.max(rowHeight, minRequiredHeight);

                            // Get row's status value for coloring
                            const statusColumns = headers.filter((h: string) => h.toLowerCase().includes('status'));
                            const rowStatus = statusColumns.length > 0 ? row[statusColumns[0]] : null;
                            const rowStatusColor = colorRowByStatus && rowStatus && (statusColors as any)?.[rowStatus];

                            // Check if this row is claimed by the current user (for bold text)
                            const agentColumns = headers.filter((h: string) => h.toLowerCase() === 'agent' || h.toLowerCase() === 'agent name');
                            const rowAgent = agentColumns.length > 0 ? row[agentColumns[0]] : null;
                            const isClaimedByCurrentUser = rowAgent && currentUser?.agentName && rowAgent === currentUser.agentName;

                            // Helper function to darken a hex color (for buttons - makes them stand out more than rows)
                            const darkenColor = (hex: string, percent: number = 30) => {
                              // Handle cases where statusColor.background might be empty string
                              if (!hex) return '';
                              const r = parseInt(hex.slice(1, 3), 16);
                              const g = parseInt(hex.slice(3, 5), 16);
                              const b = parseInt(hex.slice(5, 7), 16);

                              const darkenValue = (val: number) => Math.max(0, Math.floor(val * (1 - percent / 100)));

                              const newR = darkenValue(r).toString(16).padStart(2, '0');
                              const newG = darkenValue(g).toString(16).padStart(2, '0');
                              const newB = darkenValue(b).toString(16).padStart(2, '0');

                              return `#${newR}${newG}${newB}`;
                            };

                            return (
                              <div
                                key={virtualRow.key}
                                data-testid={`row-data-${rowIdx}`}
                                className={isDeletedRow ? "bg-destructive/10 hover:bg-destructive/20" : ""}
                                title={isDeletedRow ? "This order was deleted from the store sheet" : ""}
                                style={{
                                  position: 'absolute',
                                  top: 0,
                                  left: 0,
                                  width: '100%',
                                  height: `${virtualRow.size}px`,
                                  transform: `translateY(${virtualRow.start}px)`,
                                  fontSize: `${fontSize}px`,
                                  backgroundColor: rowStatusColor ? rowStatusColor.background : undefined,
                                  color: rowStatusColor ? rowStatusColor.text : customColors.tableTextColor,
                                  display: 'flex',
                                  fontWeight: isClaimedByCurrentUser ? 'bold' : 'normal',
                                }}
                              >
                                {visibleHeaders.map((header: string) => {
                                  const isEditable = editableColumns.some((col: string) => col.toLowerCase() === header.toLowerCase());
                                  const isTrackerColumn = trackerHeaders.some((h: string) => h.toLowerCase() === header.toLowerCase());
                                  const sheetId = isTrackerColumn ? trackerSheetId : storeSheetId;
                                  const rowIndex = isTrackerColumn ? row._trackerRowIndex : row._storeRowIndex;
                                  const rowLink = row.link || row.Link || `row-${rowKey}`;
                                  const cellKey = `${rowLink}-${header}-${sheetId}`;
                                  const cellValue = editedCells[cellKey]?.value ?? row[header] ?? '';

                                  const isPhoneColumn = header.toLowerCase().includes('phone');
                                  const isEmailColumn = header.toLowerCase().includes('email') || header.toLowerCase().includes('e-mail');
                                  const isWebsiteColumn = header.toLowerCase().includes('website') || header.toLowerCase().includes('url') || header.toLowerCase().includes('site');
                                  const isLinkColumn = header.toLowerCase() === 'link';
                                  const isStateColumn = header.toLowerCase() === 'state';
                                  const isStatusColumn = header.toLowerCase().includes('status');
                                  const isHoursColumn = header.toLowerCase().includes('hour');
                                  const isDateColumn = header.toLowerCase().includes('date') || header.toLowerCase().includes('follow');
                                  const isSalesSummaryColumn = header.toLowerCase().includes('sales-ready') || header.toLowerCase().includes('sales ready') || header.toLowerCase().includes('sales_ready');
                                  const isAddressColumn = header.toLowerCase().includes('address') ||
                                                         header.toLowerCase().includes('city') ||
                                                         (header.toLowerCase().includes('state') && header.toLowerCase().includes('city')) ||
                                                         header.toLowerCase().includes('point of contact');

                                  // Determine if this column should allow text wrapping
                                  const isNotesColumn = header.toLowerCase().includes('note') || header.toLowerCase().includes('comment');
                                  const shouldWrap = isAddressColumn || isNotesColumn || isHoursColumn;

                                  // Apply alignment styles
                                  const cellStyle: React.CSSProperties = {
                                    width: columnWidths[header] || 200,
                                    maxWidth: columnWidths[header] || 200,
                                    padding: `${Math.max(8, fontSize * 0.5)}px 16px`,
                                    lineHeight: `${fontSize * 1.4}px`,
                                    height: 'inherit',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    textAlign: textAlign, // Apply textAlign to ALL cells
                                    verticalAlign: verticalAlign,
                                    ...(shouldWrap ? { wordBreak: 'break-word' as const, whiteSpace: 'normal' as const, overflow: 'visible' } : {})
                                  };

                                  // Clean display based on column type
                                  let cleanedValue = cellValue;
                                  if (isHoursColumn) {
                                    cleanedValue = formatHours(cellValue);
                                  }

                                  const isLongText = cleanedValue.length > 100;
                                  const displayValue = isLongText ? cleanedValue.substring(0, 100) + '...' : cleanedValue;

                                  const isLeaflyLink = cellValue.toLowerCase().includes('leafly');
                                  const hasData = cellValue.length > 0;
                                  const comboboxKey = `${rowKey}-${header}`;
                                  const uniqueStates = isStateColumn ? getUniqueColumnValues(header) : [];

                                  const isFirstColumn = visibleHeaders.indexOf(header) === 0;

                                  return (
                                    <div
                                      key={header}
                                      style={{
                                        ...cellStyle,
                                        ...(isFirstColumn && freezeFirstColumn ? {
                                          position: 'sticky',
                                          left: 0,
                                          zIndex: 10,
                                          backgroundColor: rowStatusColor ? rowStatusColor.background : customColors.background
                                        } : {})
                                      }}
                                    >
                                      {isEditable ? (
                                        hasData ? (
                                          // Has data: Show value with edit controls - admins only
                                          isDateColumn ? (
                                            <Popover open={isAdmin && openCombobox === comboboxKey} onOpenChange={(open) => isAdmin && setOpenCombobox(open ? comboboxKey : null)}>
                                              <PopoverTrigger asChild>
                                                <Button
                                                  variant="outline"
                                                  className="w-full justify-start text-left font-normal"
                                                  data-testid={`button-date-${rowKey}-${header}`}
                                                  disabled={!isAdmin}
                                                >
                                                  <CalendarIcon className="mr-2 h-4 w-4" />
                                                  {cellValue || "Pick a date"}
                                                </Button>
                                              </PopoverTrigger>
                                              <PopoverContent className="w-auto p-0" align="start">
                                                <Calendar
                                                  mode="single"
                                                  selected={cellValue ? (() => {
                                                    try {
                                                      const parsed = parse(cellValue, 'M/d/yyyy', new Date());
                                                      return isValid(parsed) ? parsed : undefined;
                                                    } catch {
                                                      return undefined;
                                                    }
                                                  })() : undefined}
                                                  onSelect={(date) => {
                                                    if (date) {
                                                      handleCellUpdate(row, header, format(date, 'M/d/yyyy'));
                                                    }
                                                    setOpenCombobox(null);
                                                  }}
                                                  initialFocus
                                                />
                                              </PopoverContent>
                                            </Popover>
                                          ) : isStatusColumn ? (
                                            <Select
                                              value={cellValue || ""}
                                              onValueChange={(value) => handleCellUpdate(row, header, value)}
                                              disabled={!isAdmin}
                                            >
                                              <SelectTrigger
                                                className="w-full"
                                                data-testid={`button-status-${rowKey}-${header}`}
                                                disabled={!isAdmin}
                                                style={cellValue && statusColors[cellValue] ? {
                                                  backgroundColor: statusColors[cellValue].background,
                                                  color: statusColors[cellValue].text,
                                                } : undefined}
                                              >
                                                <SelectValue placeholder="Select status..." />
                                              </SelectTrigger>
                                              <SelectContent>
                                                {statusOptions.map((status) => {
                                                  const statusColor = statusColors[status];
                                                  return (
                                                    <SelectItem
                                                      key={status}
                                                      value={status}
                                                      data-testid={`option-status-${status}`}
                                                      style={statusColor ? {
                                                        backgroundColor: statusColor.background,
                                                        color: statusColor.text,
                                                      } : undefined}
                                                    >
                                                      {status}
                                                    </SelectItem>
                                                  );
                                                })}
                                              </SelectContent>
                                            </Select>
                                          ) : isStateColumn ? (
                                            <Popover open={isAdmin && openCombobox === comboboxKey} onOpenChange={(open) => isAdmin && setOpenCombobox(open ? comboboxKey : null)}>
                                              <PopoverTrigger asChild>
                                                <Button
                                                  variant="outline"
                                                  role="combobox"
                                                  aria-expanded={openCombobox === comboboxKey}
                                                  className="w-full justify-between"
                                                  data-testid={`button-state-${rowKey}-${header}`}
                                                  disabled={!isAdmin}
                                                >
                                                  {cellValue || "Select state..."}
                                                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                </Button>
                                              </PopoverTrigger>
                                              <PopoverContent className="w-[200px] p-0">
                                                <Command>
                                                  <CommandInput placeholder="Search state..." />
                                                  <CommandList>
                                                    <CommandEmpty>No state found.</CommandEmpty>
                                                    <CommandGroup>
                                                      {uniqueStates.map((state) => (
                                                        <CommandItem
                                                          key={state}
                                                          value={state}
                                                          onSelect={(currentValue) => {
                                                            handleCellUpdate(row, header, state);
                                                            setOpenCombobox(null);
                                                          }}
                                                          data-testid={`option-state-${state}`}
                                                        >
                                                          <Check
                                                            className={`mr-2 h-4 w-4 ${cellValue === state ? "opacity-100" : "opacity-0"}`}
                                                          />
                                                          {state}
                                                        </CommandItem>
                                                      ))}
                                                    </CommandGroup>
                                                  </CommandList>
                                                </Command>
                                              </PopoverContent>
                                            </Popover>
                                          ) : (
                                            <Input
                                              value={cellValue}
                                              onChange={(e) => handleCellEdit(row, header, e.target.value)}
                                              className="w-full"
                                              data-testid={`input-cell-${rowKey}-${header}`}
                                              disabled={!isAdmin}
                                              readOnly={!isAdmin}
                                            />
                                          )
                                        ) : (
                                          // Empty cell: Allow inline editing for new data - admins only
                                          isDateColumn ? (
                                            <Popover open={isAdmin && openCombobox === comboboxKey} onOpenChange={(open) => isAdmin && setOpenCombobox(open ? comboboxKey : null)}>
                                              <PopoverTrigger asChild>
                                                <Button
                                                  variant="outline"
                                                  className="w-full justify-start text-left font-normal"
                                                  data-testid={`button-date-${rowKey}-${header}`}
                                                  disabled={!isAdmin}
                                                >
                                                  <CalendarIcon className="mr-2 h-4 w-4" />
                                                  Pick a date
                                                </Button>
                                              </PopoverTrigger>
                                              <PopoverContent className="w-auto p-0" align="start">
                                                <Calendar
                                                  mode="single"
                                                  onSelect={(date) => {
                                                    if (date) {
                                                      handleCellUpdate(row, header, format(date, 'M/d/yyyy'));
                                                    }
                                                    setOpenCombobox(null);
                                                  }}
                                                  initialFocus
                                                />
                                              </PopoverContent>
                                            </Popover>
                                          ) : isStatusColumn ? (
                                            <Select
                                              value={cellValue || ""}
                                              onValueChange={(value) => handleCellUpdate(row, header, value)}
                                              disabled={!isAdmin}
                                            >
                                              <SelectTrigger
                                                className="w-full"
                                                data-testid={`button-status-${rowKey}-${header}`}
                                                disabled={!isAdmin}
                                              >
                                                <SelectValue placeholder="Select status..." />
                                              </SelectTrigger>
                                              <SelectContent>
                                                {statusOptions.map((status) => {
                                                  const statusColor = statusColors[status];
                                                  return (
                                                    <SelectItem
                                                      key={status}
                                                      value={status}
                                                      data-testid={`option-status-${status}`}
                                                      style={statusColor ? {
                                                        backgroundColor: statusColor.background,
                                                        color: statusColor.text,
                                                      } : undefined}
                                                    >
                                                      {status}
                                                    </SelectItem>
                                                  );
                                                })}
                                              </SelectContent>
                                            </Select>
                                          ) : isStateColumn ? (
                                            <Popover open={isAdmin && openCombobox === comboboxKey} onOpenChange={(open) => isAdmin && setOpenCombobox(open ? comboboxKey : null)}>
                                              <PopoverTrigger asChild>
                                                <Button
                                                  variant="outline"
                                                  role="combobox"
                                                  aria-expanded={openCombobox === comboboxKey}
                                                  className="w-full justify-between"
                                                  data-testid={`button-state-${rowKey}-${header}`}
                                                  disabled={!isAdmin}
                                                >
                                                  {cellValue || "Select state..."}
                                                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                </Button>
                                              </PopoverTrigger>
                                              <PopoverContent className="w-[200px] p-0">
                                                <Command>
                                                  <CommandInput placeholder="Search state..." />
                                                  <CommandList>
                                                    <CommandEmpty>No state found.</CommandEmpty>
                                                    <CommandGroup>
                                                      {uniqueStates.map((state) => (
                                                        <CommandItem
                                                          key={state}
                                                          value={state}
                                                          onSelect={(currentValue) => {
                                                            handleCellUpdate(row, header, state);
                                                            setOpenCombobox(null);
                                                          }}
                                                          data-testid={`option-state-${state}`}
                                                        >
                                                          <Check
                                                            className={`mr-2 h-4 w-4 ${cellValue === state ? "opacity-100" : "opacity-0"}`}
                                                          />
                                                          {state}
                                                        </CommandItem>
                                                      ))}
                                                    </CommandGroup>
                                                  </CommandList>
                                                </Command>
                                              </PopoverContent>
                                            </Popover>
                                          ) : (
                                            <Input
                                              value={cellValue}
                                              onChange={(e) => handleCellEdit(row, header, e.target.value)}
                                              placeholder="Enter value..."
                                              className="w-full"
                                              data-testid={`input-cell-${rowKey}-${header}`}
                                              disabled={!isAdmin}
                                              readOnly={!isAdmin}
                                            />
                                          )
                                        )
                                      ) : (
                                        <div className="flex items-center gap-2" style={{ justifyContent: textAlign === 'center' ? 'center' : textAlign === 'right' ? 'flex-end' : 'flex-start' }}>
                                          {isPhoneColumn && cellValue ? (
                                            <a
                                              href={`tel:${cellValue}`}
                                              onClick={(e) => {
                                                // Don't prevent default - let tel: link work
                                                // But also open the dialog
                                                setStoreDetailsDialog({
                                                  open: true,
                                                  row: row,
                                                  franchiseContext: selectedFranchise ? {
                                                    brandName: selectedFranchise.brandName,
                                                    allLocations: selectedFranchise.locations
                                                  } : undefined
                                                });
                                                // Open AI Assistant with default script (only if autoLoadScript preference is enabled)
                                                const autoLoadEnabled = userPreferences?.autoLoadScript ?? true;
                                                if (autoLoadEnabled) {
                                                  const saved = localStorage.getItem(`storeDetailsShowAssistant`);
                                                  if (saved !== 'true') {
                                                    localStorage.setItem(`storeDetailsShowAssistant`, 'true');
                                                  }
                                                  setLoadDefaultScriptTrigger(prev => prev + 1);
                                                }
                                              }}
                                              className="flex items-center gap-1 hover:underline flex-shrink-0"
                                              style={{ color: customColors.primary }}
                                              data-testid={`link-phone-${rowKey}-${header}`}
                                            >
                                              <Phone className="h-4 w-4 flex-shrink-0" />
                                              <span>{displayValue}</span>
                                            </a>
                                          ) : isEmailColumn && cellValue ? (
                                            <button
                                              onClick={() => setStoreDetailsDialog({
                                                open: true,
                                                row: row,
                                                franchiseContext: selectedFranchise ? {
                                                  brandName: selectedFranchise.brandName,
                                                  allLocations: selectedFranchise.locations
                                                } : undefined
                                              })}
                                              className="flex items-center gap-1 hover:underline flex-shrink-0"
                                              style={{ color: customColors.primary }}
                                              data-testid={`link-email-${rowKey}-${header}`}
                                            >
                                              <Mail className="h-4 w-4 flex-shrink-0" />
                                              <span>{displayValue}</span>
                                            </button>
                                          ) : isSalesSummaryColumn && cellValue ? (
                                            <button
                                              onClick={() => openExpandedView(row, header, cellValue, false)}
                                              className="hover:underline text-left"
                                              style={{ color: customColors.primary }}
                                              data-testid={`link-sales-summary-${rowKey}-${header}`}
                                            >
                                              {cellValue.length > 50 ? cellValue.substring(0, 50) + '...' : cellValue || 'View Summary'}
                                            </button>
                                          ) : (header.toLowerCase() === 'name' || header.toLowerCase() === 'company') && cellValue ? (
                                            <button
                                              onClick={() => setStoreDetailsDialog({
                                                open: true,
                                                row: row,
                                                franchiseContext: selectedFranchise ? {
                                                  brandName: selectedFranchise.brandName,
                                                  allLocations: selectedFranchise.locations
                                                } : undefined
                                              })}
                                              className="hover:underline font-medium text-left"
                                              style={{ color: customColors.primary }}
                                              data-testid={`link-store-${rowKey}-${header}`}
                                            >
                                              {displayValue}
                                            </button>
                                          ) : isWebsiteColumn && cellValue ? (
                                            <a
                                              href={cellValue.startsWith('http') ? cellValue : `https://${cellValue}`}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="flex items-center gap-1 hover:underline flex-shrink-0"
                                              style={{ color: customColors.primary }}
                                              data-testid={`link-website-${rowKey}-${header}`}
                                            >
                                              <ExternalLink className="h-4 w-4 flex-shrink-0" />
                                              <span>{extractDomain(cellValue)}</span>
                                            </a>
                                          ) : isLinkColumn && cellValue ? (
                                            <a
                                              href={cellValue}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="text-2xl hover:scale-110 transition-transform"
                                              data-testid={`link-leafly-${rowKey}-${header}`}
                                              title={cellValue}
                                            >
                                              {isLeaflyLink ? '🍁' : '🔗'}
                                            </a>
                                          ) : (
                                            <span
                                              data-testid={`text-cell-${rowKey}-${header}`}
                                              className={isLongText ? "cursor-pointer hover:text-primary" : ""}
                                              onClick={() => isLongText && openExpandedView(row, header, cellValue, false)}
                                            >
                                              {displayValue}
                                            </span>
                                          )}
                                          {isLongText && !isPhoneColumn && !isWebsiteColumn && !isLinkColumn && !isSalesSummaryColumn && (
                                            <Button
                                              variant="ghost"
                                              size="icon"
                                              className="h-8 w-8 flex-shrink-0"
                                              onClick={() => openExpandedView(row, header, cellValue, false)}
                                              data-testid={`button-expand-${rowKey}-${header}`}
                                            >
                                              <Maximize2 className="h-4 w-4" />
                                            </Button>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            );
                          })}
                        </div>
                      </td>
                    </tr>
                  </TableBody>
                </Table>
              </div>
            </div>
            </>
          ) : storeSheetId && trackerSheetId ? (
            <div className="text-center py-8 text-muted-foreground">
              No data found. Check your sheet selection and try refreshing.
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Select both Store Database and Commission Tracker sheets to view data.
            </div>
          )}

          {filteredData.length > 0 && (
            <div className="text-sm text-muted-foreground">
              Showing {filteredData.length} of {data.length} rows
            </div>
          )}
        </CardContent>
      </Card>

      {/* Expanded Cell Dialog */}
      <Dialog open={!!expandedCell} onOpenChange={(open) => !open && setExpandedCell(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>{expandedCell?.column}</DialogTitle>
            <DialogDescription>
              {expandedCell?.isEditable ? "View and edit the full content" : "View the full content"}
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[50vh] mt-4">
            {expandedCell?.isEditable ? (
              expandedCell.value.length > 100 ? (
                <Textarea
                  value={expandedCell.value}
                  onChange={(e) => setExpandedCell({ ...expandedCell, value: e.target.value })}
                  className="min-h-[300px] font-mono text-sm"
                  data-testid="textarea-expanded"
                />
              ) : (
                <Input
                  value={expandedCell.value}
                  onChange={(e) => setExpandedCell({ ...expandedCell, value: e.target.value })}
                  className="text-base"
                  data-testid="input-expanded"
                />
              )
            ) : (
              <div className="p-4 bg-muted/50 rounded-md whitespace-pre-wrap font-mono text-sm" data-testid="text-expanded">
                {expandedCell?.value}
              </div>
            )}
          </ScrollArea>
          <DialogFooter>
            {expandedCell?.isEditable && (
              <Button 
                onClick={saveExpandedCell} 
                data-testid="button-save-expanded"
                style={currentColors.actionButtons ? { backgroundColor: currentColors.actionButtons, borderColor: currentColors.actionButtons } : undefined}
              >
                Save Changes
              </Button>
            )}
            <Button variant="outline" onClick={() => setExpandedCell(null)} data-testid="button-close-expanded">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Address Edit Dialog */}
      {addressEditDialog && (
        <AddressEditDialog
          open={addressEditDialog.open}
          onOpenChange={(open) => !open && setAddressEditDialog(null)}
          row={addressEditDialog.row}
          trackerSheetId={trackerSheetId}
          joinColumn={joinColumn}
        />
      )}

      {/* Store Details Dialog */}
      {storeDetailsDialog && (
        <StoreDetailsDialog
          open={storeDetailsDialog.open}
          onOpenChange={(open) => {
            if (!open) {
              setStoreDetailsDialog(null);
              // Reset script trigger so it doesn't auto-load when reopening via name link
              setLoadDefaultScriptTrigger(0);
            }
          }}
          row={storeDetailsDialog.row}
          trackerSheetId={trackerSheetId}
          storeSheetId={storeSheetId}
          refetch={refetch}
          franchiseContext={storeDetailsDialog.franchiseContext}
          currentColors={currentColors}
          statusOptions={statusOptions}
          statusColors={statusColors}
          contextUpdateTrigger={contextUpdateTrigger}
          setContextUpdateTrigger={setContextUpdateTrigger}
          loadDefaultScriptTrigger={loadDefaultScriptTrigger}
        />
      )}

      {/* Export vCard Dialog */}
      <Dialog open={exportVCardDialogOpen} onOpenChange={setExportVCardDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Export Contacts to Phone</DialogTitle>
            <DialogDescription>
              Select which fields to include and choose your platform
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Export count */}
            <div className="text-sm text-muted-foreground p-3 bg-muted rounded-md">
              Exporting <span className="font-semibold">{filteredData?.length || 0}</span> stores
            </div>

            {/* Field selection */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Include Fields</Label>
              <div className="space-y-2">
                {Object.entries({
                  phone: "Phone",
                  email: "Email",
                  website: "Website",
                  address: "Address",
                  salesSummary: "Sales Summary",
                  storeHours: "Store Hours"
                }).map(([key, label]) => (
                  <div key={key} className="flex items-center gap-2">
                    <Checkbox
                      id={`vcard-${key}`}
                      checked={vCardExportFields[key as keyof typeof vCardExportFields]}
                      onCheckedChange={(checked) => 
                        setVCardExportFields(prev => ({ ...prev, [key]: checked === true }))
                      }
                      data-testid={`checkbox-vcard-${key}`}
                    />
                    <Label htmlFor={`vcard-${key}`} className="text-sm cursor-pointer">
                      {label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            {/* List name input */}
            <div className="space-y-2">
              <Label htmlFor="vcard-list-name" className="text-sm font-medium">
                List/Group Name
              </Label>
              <Input
                id="vcard-list-name"
                placeholder="e.g., Hemp Wick - Sample Sent"
                value={vCardListName}
                onChange={(e) => setVCardListName(e.target.value)}
                data-testid="input-vcard-list-name"
              />
            </div>

            {/* Platform selection */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Platform</Label>
              <div className="flex gap-4">
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    id="platform-ios"
                    checked={vCardPlatform === "ios"}
                    onChange={() => setVCardPlatform("ios")}
                    className="cursor-pointer"
                    data-testid="radio-platform-ios"
                  />
                  <Label htmlFor="platform-ios" className="text-sm cursor-pointer">
                    iOS
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    id="platform-android"
                    checked={vCardPlatform === "android"}
                    onChange={() => setVCardPlatform("android")}
                    className="cursor-pointer"
                    data-testid="radio-platform-android"
                  />
                  <Label htmlFor="platform-android" className="text-sm cursor-pointer">
                    Android
                  </Label>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button 
              variant="outline" 
              onClick={() => setExportVCardDialogOpen(false)}
              data-testid="button-cancel-vcard-export"
            >
              Cancel
            </Button>
            <Button 
              onClick={() => {
                try {
                  generateAndDownloadVCard(
                    filteredData,
                    vCardExportFields,
                    vCardListName || "Hemp Wick Contacts",
                    vCardPlatform
                  );
                  setExportVCardDialogOpen(false);
                  toast({
                    title: "Export Complete",
                    description: `Exported ${filteredData.length} contacts to vCard`,
                  });
                } catch (error) {
                  console.error('vCard Export Error:', error);
                  toast({
                    title: "Export Failed",
                    description: error instanceof Error ? error.message : "Failed to export contacts",
                    variant: "destructive",
                  });
                }
              }}
              data-testid="button-export-vcard-confirm"
            >
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Franchise Finder Dialog */}
      <FranchiseFinderDialog
        open={franchiseFinderOpen}
        onOpenChange={(open) => {
          setFranchiseFinderOpen(open);
          if (!open) {
            // Don't clear selected franchise when dialog closes - let user manage it via toolbar
          }
        }}
        stores={data}
        onSelectFranchise={(franchise) => {
          setSelectedFranchise(franchise);
          // Also clear other filters to show only franchise stores
          setShowMyStoresOnly(false);
        }}
      />

      {/* Duplicate Finder Dialog */}
      <DuplicateFinderDialog
        open={duplicateFinderOpen}
        onOpenChange={setDuplicateFinderOpen}
        stores={data}
        onDuplicatesDeleted={() => {
          // Refresh the data after deletes
          refetch();
        }}
      />

      {/* Call History Dialog */}
      <CallHistoryDialog 
        open={callHistoryOpen} 
        onOpenChange={setCallHistoryOpen}
        onCallStore={(storeLink, phoneNumber) => {
          // Find the store in the data by matching the link
          const matchingStore = data.find((row: any) => {
            const link = getLinkValue(row);
            if (!link) return false;

            // Normalize and compare links
            const normalizedRowLink = normalizeLink(link);
            const normalizedSearchLink = normalizeLink(storeLink);

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

            // Trigger dial after a delay so user sees the dialog first
            setTimeout(() => {
              window.location.href = `tel:${phoneNumber}`;
            }, 800);
          }
        }}
      />
      </div>

    </div>
  );
}

