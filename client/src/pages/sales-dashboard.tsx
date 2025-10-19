import { useState, useEffect, useRef, useMemo } from "react";
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
import { RefreshCw, Settings2, Save, ChevronLeft, ChevronRight, Maximize2, Phone, Mail, ExternalLink, ArrowUpDown, ArrowUp, ArrowDown, Check, ChevronsUpDown, Calendar as CalendarIcon, Type, AlignJustify, RotateCcw, Palette, EyeOff, SortAsc, SortDesc, AlignLeft, AlignCenter, AlignRight } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { ThemeToggle } from "@/components/theme-toggle";
import { useTheme } from "@/components/theme-provider";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { format, parse, isValid } from "date-fns";
import { ContactActionDialog } from "@/components/contact-action-dialog";
import { AddressEditDialog } from "@/components/address-edit-dialog";
import { HslColorPicker } from "react-colorful";
import { Loader2 } from "lucide-react";

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
}

export default function SalesDashboard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
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
  const [fontSize, setFontSize] = useState<number>(14); // Font size in pixels
  const [rowHeight, setRowHeight] = useState<number>(48); // Row height in pixels
  const [resizingColumn, setResizingColumn] = useState<{ column: string; startX: number; startWidth: number } | null>(null);
  const [preferencesLoaded, setPreferencesLoaded] = useState(false);
  const [contextMenuColumn, setContextMenuColumn] = useState<string | null>(null);
  const { theme: currentTheme, resolvedTheme = 'light' } = useTheme() as any;
  // New state variables for text alignment and vertical alignment
  const [textAlign, setTextAlign] = useState<'left' | 'center' | 'right' | 'justify'>('left');
  const [verticalAlign, setVerticalAlign] = useState<'top' | 'middle' | 'bottom'>('middle');
  const [freezeFirstColumn, setFreezeFirstColumn] = useState<boolean>(true);

  // Status options state (customizable)
  const [statusOptions, setStatusOptions] = useState<string[]>([
    '1 – Contacted',
    '2 – Interested',
    '3 – Sample Sent',
    '4 – Follow-Up',
    '5 – Closed Won',
    '6 – Closed Lost',
  ]);

  // Color row by status state
  const [colorRowByStatus, setColorRowByStatus] = useState<boolean>(false);

  // Contact action dialog state
  const [contactActionDialog, setContactActionDialog] = useState<{
    open: boolean;
    contactType: 'phone' | 'email';
    contactValue: string;
    row: any;
  } | null>(null);

  // Address edit dialog state
  const [addressEditDialog, setAddressEditDialog] = useState<{
    open: boolean;
    row: any;
  } | null>(null);

  // Store details dialog state
  const [storeDetailsDialog, setStoreDetailsDialog] = useState<{
    open: boolean;
    row: any;
  } | null>(null);

  // Default colors for light and dark modes
  const defaultLightColors = {
    background: '#ffffff',
    text: '#000000',
    tableTextColor: '#000000',
    primary: '#3b82f6',
    secondary: '#f3f4f6',
    accent: '#8b5cf6',
    border: '#e5e7eb',
    bodyBackground: '',
    headerBackground: '',
    statusColors: {
      '1 – Contacted': { background: '#dbeafe', text: '#1e40af' },
      '2 – Interested': { background: '#fef3c7', text: '#92400e' },
      '3 – Sample Sent': { background: '#e0e7ff', text: '#3730a3' },
      '4 – Follow-Up': { background: '#fed7aa', text: '#9a3412' },
      '5 – Closed Won': { background: '#d1fae5', text: '#065f46' },
      '6 – Closed Lost': { background: '#fee2e2', text: '#991b1b' },
    },
  };

  const defaultDarkColors = {
    background: '#1a1a1a',
    text: '#ffffff',
    tableTextColor: '#ffffff',
    primary: '#60a5fa',
    secondary: '#2a2a2a',
    accent: '#a7bfa',
    border: '#404040',
    bodyBackground: '',
    headerBackground: '',
    statusColors: {
      '1 – Contacted': { background: '#1e3a8a', text: '#bfdbfe' },
      '2 – Interested': { background: '#78350f', text: '#fef3c7' },
      '3 – Sample Sent': { background: '#312e81', text: '#c7d2fe' },
      '4 – Follow-Up': { background: '#7c2d12', text: '#fed7aa' },
      '5 – Closed Won': { background: '#064e3b', text: '#a7f3d0' },
      '6 – Closed Lost': { background: '#7f1d1d', text: '#fecaca' },
    },
  };

  const [lightModeColors, setLightModeColors] = useState(defaultLightColors);
  const [darkModeColors, setDarkModeColors] = useState(defaultDarkColors);
  const customColors = resolvedTheme === 'dark' ? darkModeColors : lightModeColors;
  const setCustomColors = resolvedTheme === 'dark' ? setDarkModeColors : setLightModeColors;

  // Color presets state
  const [colorPresets, setColorPresets] = useState<Array<{name: string, color: string}>>([]);
  const [presetName, setPresetName] = useState("");
  const [activeColorField, setActiveColorField] = useState<string | null>(null);

  // Convert hex to HSL
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
    }: {
      sheetId: string;
      rowIndex: number;
      column: string;
      value: any;
    }) => {
      return await apiRequest("PUT", `/api/sheets/${sheetId}/update`, {
        rowIndex,
        column,
        value,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["merged-data"] });
      toast({
        title: "Success",
        description: "Cell updated successfully",
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
        linkValue: storeRow[joinColumn],
        column,
        value,
        joinColumn,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["merged-data"] });
      toast({
        title: "Store Claimed",
        description: "Store claimed successfully and value updated",
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
    // Determine which sheet to update based on which headers contain this column (case-insensitive)
    const isStoreColumn = mergedData?.storeHeaders?.some((h: string) => h.toLowerCase() === column.toLowerCase());
    const isTrackerColumn = mergedData?.trackerHeaders?.some((h: string) => h.toLowerCase() === column.toLowerCase());

    let sheetId: string | undefined;
    let rowIndex: number | undefined;

    if (isTrackerColumn && row._trackerSheetId && row._trackerRowIndex) {
      // Update existing tracker row
      sheetId = row._trackerSheetId;
      rowIndex = row._trackerRowIndex;
      updateCellMutation.mutate({ sheetId, rowIndex, column, value });
    } else if (isTrackerColumn && trackerSheetId && !row._trackerRowIndex) {
      // Need to create a new tracker row for this unclaimed store (auto-claim)
      claimStoreMutation.mutate({
        trackerSheetId,
        storeRow: row,
        column,
        value,
        joinColumn
      });
    } else if (isStoreColumn && row._storeSheetId && row._storeRowIndex) {
      // Update store sheet
      sheetId = row._storeSheetId;
      rowIndex = row._storeRowIndex;
      updateCellMutation.mutate({ sheetId, rowIndex, column, value });
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
    colorPresets?: Array<{name: string, color: string}>;
    freezeFirstColumn?: boolean;
  } | null>({
    queryKey: ['/api/user/preferences'],
    staleTime: Infinity, // Don't refetch preferences automatically
  });

  // Fetch available sheets and auto-detect by purpose
  const { data: sheetsData } = useQuery<{ sheets: GoogleSheet[] }>({
    queryKey: ['/api/sheets'],
  });

  const sheets = sheetsData?.sheets || [];

  // Auto-detect sheets by purpose
  useEffect(() => {
    if (sheets.length > 0) {
      const storeSheet = sheets.find(s => s.sheetPurpose === 'Store Database');
      const trackerSheet = sheets.find(s => s.sheetPurpose === 'Commission Tracker');

      if (storeSheet) setStoreSheetId(storeSheet.id);
      if (trackerSheet) setTrackerSheetId(trackerSheet.id);
    }
  }, [sheets.length]);

  // Fetch merged data
  // Get current user
  const { data: currentUser } = useQuery<{ id: string; email?: string; role?: string }>({
    queryKey: ['/api/auth/user'],
  });

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
  
  console.log('=== FRONTEND DEBUG ===');
  console.log('All headers received:', headers);
  console.log('Store headers:', storeHeaders);
  console.log('Tracker headers:', trackerHeaders);
  console.log('Total rows:', data.length);
  const rowWithTracker = data.find((r: any) => r._hasTrackerData);
  if (rowWithTracker) {
    console.log('Sample row with tracker data:', rowWithTracker);
    console.log('Tracker field values in frontend:');
    trackerHeaders.forEach((header: string) => {
      console.log(`  ${header}: "${rowWithTracker[header]}"`);
    });
  }
  console.log('Column order:', columnOrder);
  console.log('Visible columns:', visibleColumns);

  // Initialize visible columns, column order, and widths (or load from saved preferences)
  // Also update when headers change (e.g., when new tracker columns are added)
  useEffect(() => {
    if (headers.length > 0 && preferencesQueryFetched) {
      const currentVisible = { ...visibleColumns };
      const currentWidths = { ...columnWidths };
      const currentOrder = [...columnOrder];
      const hiddenColumns = ['title', 'error']; // Columns to hide by default

      // Check if we have saved preferences (only on first load)
      if (userPreferences && !preferencesLoaded) {
        // Load saved preferences if available
        if (userPreferences.visibleColumns) {
          // Merge saved preferences with new headers (in case new columns were added)
          headers.forEach((header: string) => {
            currentVisible[header] = userPreferences.visibleColumns![header] ?? !hiddenColumns.includes(header.toLowerCase());
          });
        } else {
          headers.forEach((header: string) => {
            currentVisible[header] = !hiddenColumns.includes(header.toLowerCase());
          });
        }

        if (userPreferences.columnOrder && userPreferences.columnOrder.length > 0) {
          // Use saved column order, adding any new columns at the end
          const savedOrder = userPreferences.columnOrder.filter((col: string) => headers.includes(col));
          const newColumns = headers.filter((h: string) => !savedOrder.includes(h));
          setColumnOrder([...savedOrder, ...newColumns]);
        } else {
          setColumnOrder(headers);
        }

        if (userPreferences.columnWidths) {
          headers.forEach((header: string) => {
            currentWidths[header] = userPreferences.columnWidths![header] || 200;
          });
        } else {
          headers.forEach((header: string) => {
            currentWidths[header] = 200;
          });
        }

        setVisibleColumns(currentVisible);
        setColumnWidths(currentWidths);

        // Load font size and row height preferences
        if (userPreferences.fontSize) {
          setFontSize(userPreferences.fontSize);
        }
        if (userPreferences.rowHeight) {
          setRowHeight(userPreferences.rowHeight);
        }

        // Load theme-specific colors
        if (userPreferences.lightModeColors) {
          setLightModeColors({
            ...defaultLightColors,
            ...userPreferences.lightModeColors,
          } as any);
        }
        if (userPreferences.darkModeColors) {
          setDarkModeColors({
            ...defaultDarkColors,
            ...userPreferences.darkModeColors,
          } as any);
        }

        // Load alignment preferences
        if (userPreferences.textAlign) {
          setTextAlign(userPreferences.textAlign);
        }
        if (userPreferences.verticalAlign) {
          setVerticalAlign(userPreferences.verticalAlign);
        }

        // Load status options and row coloring preference
        if (userPreferences.statusOptions) {
          setStatusOptions(userPreferences.statusOptions);
        }
        if (userPreferences.colorRowByStatus !== undefined) {
          setColorRowByStatus(userPreferences.colorRowByStatus);
        }
        if (userPreferences.colorPresets) {
          setColorPresets(userPreferences.colorPresets);
        }
        if (userPreferences.freezeFirstColumn !== undefined) {
          setFreezeFirstColumn(userPreferences.freezeFirstColumn);
        }

        setPreferencesLoaded(true);
      } else if (!preferencesLoaded) {
        // No saved preferences, use defaults (only on first load)
        headers.forEach((header: string) => {
          currentVisible[header] = !hiddenColumns.includes(header.toLowerCase());
          currentWidths[header] = 200;
        });
        setVisibleColumns(currentVisible);
        setColumnOrder(headers);
        setColumnWidths(currentWidths);
        setFontSize(14);
        setRowHeight(48);
        setTextAlign('left');
        setVerticalAlign('middle');
        setColorRowByStatus(false); // Default to false
        setPreferencesLoaded(true);
      } else {
        // Preferences already loaded - check for new headers
        const newHeaders = headers.filter((h: string) => !currentOrder.includes(h));
        if (newHeaders.length > 0) {
          console.log('New headers detected:', newHeaders);
          // Add new headers to column order
          setColumnOrder([...currentOrder, ...newHeaders]);
          
          // Add new headers to visible columns (visible by default unless in hiddenColumns)
          const updatedVisible = { ...currentVisible };
          newHeaders.forEach((header: string) => {
            updatedVisible[header] = !hiddenColumns.includes(header.toLowerCase());
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
  }, [headers, userPreferences, preferencesQueryFetched, preferencesLoaded]);


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
        await apiRequest('PUT', '/api/user/preferences', {
          visibleColumns,
          columnOrder,
          columnWidths,
          selectedStates: Array.from(selectedStates),
          selectedCities: Array.from(selectedCities),
          fontSize,
          rowHeight,
          lightModeColors,
          darkModeColors,
          textAlign, // Save alignment preferences
          verticalAlign, // Save alignment preferences
          statusOptions, // Save status options
          colorRowByStatus, // Save row coloring preference
          colorPresets, // Save color presets
          freezeFirstColumn, // Save freeze column preference
        });
      } catch (error) {
        console.error('Failed to save preferences:', error);
      }
    }, 1000); // Save 1 second after last change

    return () => clearTimeout(timeoutId);
  }, [visibleColumns, columnOrder, columnWidths, selectedStates, selectedCities, fontSize, rowHeight, lightModeColors, darkModeColors, preferencesLoaded, textAlign, verticalAlign, statusOptions, colorRowByStatus, colorPresets, freezeFirstColumn]);

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

  const handleCellEdit = (row: any, column: string, value: string) => {
    // Determine which sheet this column belongs to (case-insensitive)
    const isTrackerColumn = trackerHeaders.some((h: string) => h.toLowerCase() === column.toLowerCase());
    const sheetId = isTrackerColumn ? trackerSheetId : storeSheetId;
    const rowIndex = isTrackerColumn ? row._trackerRowIndex : row._storeRowIndex;
    const rowLink = row.link || row.Link || `row-${rowIndex}`;

    if (!sheetId || !rowIndex) return;

    // Use a stable unique key based on row link (not index) for virtual scrolling
    const key = `${rowLink}-${column}-${sheetId}`;
    setEditedCells(prev => ({
      ...prev,
      [key]: { link: rowLink, rowIndex, column, value, sheetId },
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
    sortDirection
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
        <CardHeader style={{ color: customColors.text }}>
          <CardTitle>Sales Dashboard</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
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
                <div className="flex items-center gap-2 flex-1 min-w-[300px]">
                  <Input
                    placeholder="Search all columns..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="flex-1 max-w-md"
                    data-testid="input-search"
                  />
                  <Button
                    variant="outline"
                    onClick={() => refetch()}
                    disabled={isLoading}
                    data-testid="button-refresh"
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Refresh
                  </Button>
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
                      {/* Font Size Dropdown */}
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

                      {/* Theme Toggle with Label */}
                      <ThemeToggle showLabel={true} variant="outline" />

                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" data-testid="button-theme-customizer">
                      <Palette className="mr-2 h-4 w-4" />
                      Colors
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-96 max-h-[600px] overflow-y-auto">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">Customize Colors</h4>
                        <div className="flex items-center gap-2 px-2 py-1 rounded-md bg-muted text-xs font-medium">
                          {resolvedTheme === 'dark' ? '🌙 Dark Mode' : '☀️ Light Mode'}
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Currently editing colors for {resolvedTheme === 'dark' ? 'dark' : 'light'} theme. Switch theme to customize the other color set.
                      </p>
                      <div className="space-y-4">
                        {(['background', 'tableTextColor', 'text', 'primary', 'secondary', 'accent', 'border', 'bodyBackground', 'headerBackground'] as const).map((field) => {
                          const fieldLabels = {
                            background: 'Table Background',
                            tableTextColor: 'Table Text Color',
                            text: 'Interface Text Color',
                            primary: 'Primary Button',
                            secondary: 'Secondary Button',
                            accent: 'Accent',
                            border: 'Border',
                            bodyBackground: 'Page Background',
                            headerBackground: 'Header Background',
                          };

                          const fieldDescriptions = {
                            background: 'Main table background color',
                            tableTextColor: 'Color of text in table cells',
                            text: 'Color of headings and interface text',
                            primary: 'Primary action buttons and highlights',
                            secondary: 'Secondary buttons and card backgrounds',
                            accent: 'Accent elements and secondary highlights',
                            border: 'Border lines between rows and card edges',
                            bodyBackground: 'Main page body background (leave empty for theme default)',
                            headerBackground: 'Top header background (leave empty for theme default)',
                          };

                          const currentColor = customColors[field] || (field === 'bodyBackground' ? '#f9fafb' : field === 'headerBackground' ? '#ffffff' : '#000000');
                          const hslColor = hexToHsl(currentColor);
                          const hslString = customColors[field] ? `${Math.round(hslColor.h)}° ${Math.round(hslColor.s)}% ${Math.round(hslColor.l)}%` : '(Theme Default)';

                          return (
                            <div key={field} className="space-y-2">
                              <Label className="text-sm font-medium">{fieldLabels[field]}</Label>
                              <p className="text-xs text-muted-foreground">{fieldDescriptions[field]}</p>

                              <Popover open={activeColorField === field} onOpenChange={(open) => setActiveColorField(open ? field : null)}>
                                <PopoverTrigger asChild>
                                  <Button variant="outline" className="w-full justify-start gap-2" data-testid={`button-color-${field}`}>
                                    <div
                                      className="h-6 w-6 rounded border"
                                      style={{ backgroundColor: currentColor }}
                                    />
                                    <span className="font-mono text-sm">{hslString}</span>
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-80" align="start">
                                  <div className="space-y-4">
                                    <HslColorPicker
                                      color={hslColor}
                                      onChange={(color) => {
                                        const hexColor = hslToHex(color.h, color.s, color.l);
                                        setCustomColors({ ...customColors, [field]: hexColor });
                                      }}
                                    />

                                    <div className="space-y-2">
                                      <Label className="text-xs">HSL Values</Label>
                                      <div className="grid grid-cols-3 gap-2">
                                        <div>
                                          <Label className="text-xs text-muted-foreground">H</Label>
                                          <Input
                                            type="number"
                                            min="0"
                                            max="360"
                                            value={Math.round(hslColor.h)}
                                            onChange={(e) => {
                                              const h = parseInt(e.target.value) || 0;
                                              const hexColor = hslToHex(h, hslColor.s, hslColor.l);
                                              setCustomColors({ ...customColors, [field]: hexColor });
                                            }}
                                            className="font-mono text-xs"
                                          />
                                        </div>
                                        <div>
                                          <Label className="text-xs text-muted-foreground">S%</Label>
                                          <Input
                                            type="number"
                                            min="0"
                                            max="100"
                                            value={Math.round(hslColor.s)}
                                            onChange={(e) => {
                                              const s = parseInt(e.target.value) || 0;
                                              const hexColor = hslToHex(hslColor.h, s, hslColor.l);
                                              setCustomColors({ ...customColors, [field]: hexColor });
                                            }}
                                            className="font-mono text-xs"
                                          />
                                        </div>
                                        <div>
                                          <Label className="text-xs text-muted-foreground">L%</Label>
                                          <Input
                                            type="number"
                                            min="0"
                                            max="100"
                                            value={Math.round(hslColor.l)}
                                            onChange={(e) => {
                                              const l = parseInt(e.target.value) || 0;
                                              const hexColor = hslToHex(hslColor.h, hslColor.s, l);
                                              setCustomColors({ ...customColors, [field]: hexColor });
                                            }}
                                            className="font-mono text-xs"
                                          />
                                        </div>
                                      </div>
                                    </div>

                                    {colorPresets.length > 0 && (
                                      <div className="space-y-2">
                                        <Label className="text-xs text-muted-foreground">Saved Presets</Label>
                                        <div className="grid grid-cols-5 gap-2">
                                          {colorPresets.map((preset, idx) => (
                                            <div key={idx} className="relative group">
                                              <button
                                                onClick={() => setCustomColors({ ...customColors, [field]: preset.color })}
                                                className="h-10 w-full rounded border hover:ring-2 hover:ring-primary transition-all"
                                                style={{ backgroundColor: preset.color }}
                                                title={preset.name}
                                              />
                                              <button
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  setColorPresets(colorPresets.filter((_, i) => i !== idx));
                                                  toast({ title: "Preset deleted", description: `"${preset.name}" removed` });
                                                }}
                                                className="absolute -top-1 -right-1 h-4 w-4 bg-destructive text-destructive-foreground rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-xs"
                                              >
                                                ×
                                              </button>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )}

                                    <div className="space-y-2">
                                      <Label className="text-xs text-muted-foreground">Save as Preset</Label>
                                      <div className="flex gap-2">
                                        <Input
                                          placeholder="Preset name"
                                          value={presetName}
                                          onChange={(e) => setPresetName(e.target.value)}
                                          className="flex-1 text-sm"
                                        />
                                        <Button
                                          size="sm"
                                          onClick={() => {
                                            if (presetName.trim()) {
                                              const colorValue = customColors[field as keyof typeof customColors];
                                              const colorString = typeof colorValue === 'string' ? colorValue : JSON.stringify(colorValue);
                                              setColorPresets([...colorPresets, { name: presetName, color: colorString }]);
                                              setPresetName("");
                                              toast({ title: "Preset saved", description: `"${presetName}" added to presets` });
                                            }
                                          }}
                                          disabled={!presetName.trim()}
                                        >
                                          <Save className="h-4 w-4" />
                                        </Button>
                                      </div>
                                    </div>

                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="w-full"
                                      onClick={() => {
                                        if (field === 'bodyBackground' || field === 'headerBackground') {
                                          setCustomColors({ ...customColors, [field]: '' });
                                        } else {
                                          setCustomColors({ ...customColors, [field]: defaultLightColors[field] });
                                        }
                                      }}
                                    >
                                      <RotateCcw className="h-4 w-4 mr-2" />
                                      {field === 'bodyBackground' || field === 'headerBackground' ? 'Reset to Theme Default' : 'Reset to Default'}
                                    </Button>
                                  </div>
                                </PopoverContent>
                              </Popover>
                            </div>
                          );
                        })}

                        <Separator className="my-4" />

                            <div className="space-y-3">
                              <h5 className="font-medium text-sm">Status Colors</h5>
                              <p className="text-xs text-muted-foreground">Customize status dropdown colors (background and text)</p>

                              <div className="space-y-3">
                                {statusOptions.map((status) => {
                                  const statusColor = (customColors.statusColors as any)?.[status] || { background: '#e5e7eb', text: '#1f2937' };
                                  const bgHsl = hexToHsl(statusColor.background);
                                  const textHsl = hexToHsl(statusColor.text);
                                  const bgHslString = `${Math.round(bgHsl.h)}° ${Math.round(bgHsl.s)}% ${Math.round(bgHsl.l)}%`;
                                  const textHslString = `${Math.round(textHsl.h)}° ${Math.round(textHsl.s)}% ${Math.round(textHsl.l)}%`;

                                  return (
                                    <div key={status} className="space-y-2">
                                      <Label className="text-sm font-medium">{status}</Label>
                                      <div className="grid grid-cols-2 gap-2">
                                        <div>
                                          <Label className="text-xs text-muted-foreground">Background (Row Color)</Label>
                                          <Popover>
                                            <PopoverTrigger asChild>
                                              <Button variant="outline" size="sm" className="w-full justify-start gap-2 mt-1 h-8">
                                                <div className="h-4 w-4 rounded border" style={{ backgroundColor: statusColor.background }} />
                                                <span className="font-mono text-xs">{bgHslString}</span>
                                              </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-72" align="start">
                                              <div className="space-y-3">
                                                <HslColorPicker
                                                  color={bgHsl}
                                                  onChange={(color) => {
                                                    const hexColor = hslToHex(color.h, color.s, color.l);
                                                    setCustomColors({
                                                      ...customColors,
                                                      statusColors: {
                                                        ...customColors.statusColors,
                                                        [status]: { ...statusColor, background: hexColor }
                                                      }
                                                    });
                                                  }}
                                                />
                                                <div className="space-y-2">
                                                  <Label className="text-xs">HSL Values</Label>
                                                  <div className="grid grid-cols-3 gap-2">
                                                    <div>
                                                      <Label className="text-xs text-muted-foreground">H</Label>
                                                      <Input
                                                        type="number"
                                                        min="0"
                                                        max="360"
                                                        value={Math.round(bgHsl.h)}
                                                        onChange={(e) => {
                                                          const h = parseInt(e.target.value) || 0;
                                                          const hexColor = hslToHex(h, bgHsl.s, bgHsl.l);
                                                          setCustomColors({
                                                            ...customColors,
                                                            statusColors: {
                                                              ...customColors.statusColors,
                                                              [status]: { ...statusColor, background: hexColor }
                                                            }
                                                          });
                                                        }}
                                                        className="font-mono text-xs"
                                                      />
                                                    </div>
                                                    <div>
                                                      <Label className="text-xs text-muted-foreground">S%</Label>
                                                      <Input
                                                        type="number"
                                                        min="0"
                                                        max="100"
                                                        value={Math.round(bgHsl.s)}
                                                        onChange={(e) => {
                                                          const s = parseInt(e.target.value) || 0;
                                                          const hexColor = hslToHex(bgHsl.h, s, bgHsl.l);
                                                          setCustomColors({
                                                            ...customColors,
                                                            statusColors: {
                                                              ...customColors.statusColors,
                                                              [status]: { ...statusColor, background: hexColor }
                                                            }
                                                          });
                                                        }}
                                                        className="font-mono text-xs"
                                                      />
                                                    </div>
                                                    <div>
                                                      <Label className="text-xs text-muted-foreground">L%</Label>
                                                      <Input
                                                        type="number"
                                                        min="0"
                                                        max="100"
                                                        value={Math.round(bgHsl.l)}
                                                        onChange={(e) => {
                                                          const l = parseInt(e.target.value) || 0;
                                                          const hexColor = hslToHex(bgHsl.h, bgHsl.s, l);
                                                          setCustomColors({
                                                            ...customColors,
                                                            statusColors: {
                                                              ...customColors.statusColors,
                                                              [status]: { ...statusColor, background: hexColor }
                                                            }
                                                          });
                                                        }}
                                                        className="font-mono text-xs"
                                                      />
                                                    </div>
                                                  </div>
                                                  <p className="text-xs text-muted-foreground mt-2">
                                                    Button/dropdown colors auto-darken by 30% L
                                                  </p>
                                                </div>
                                              </div>
                                            </PopoverContent>
                                          </Popover>
                                        </div>
                                        <div>
                                          <Label className="text-xs text-muted-foreground">Text</Label>
                                          <Popover>
                                            <PopoverTrigger asChild>
                                              <Button variant="outline" size="sm" className="w-full justify-start gap-2 mt-1 h-8">
                                                <div className="h-4 w-4 rounded border" style={{ backgroundColor: statusColor.text }} />
                                                <span className="font-mono text-xs">{textHslString}</span>
                                              </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-72" align="start">
                                              <div className="space-y-3">
                                                <HslColorPicker
                                                  color={textHsl}
                                                  onChange={(color) => {
                                                    const hexColor = hslToHex(color.h, color.s, color.l);
                                                    setCustomColors({
                                                      ...customColors,
                                                      statusColors: {
                                                        ...customColors.statusColors,
                                                        [status]: { ...statusColor, text: hexColor }
                                                      }
                                                    });
                                                  }}
                                                />
                                                <div className="space-y-2">
                                                  <Label className="text-xs">HSL Values</Label>
                                                  <div className="grid grid-cols-3 gap-2">
                                                    <div>
                                                      <Label className="text-xs text-muted-foreground">H</Label>
                                                      <Input
                                                        type="number"
                                                        min="0"
                                                        max="360"
                                                        value={Math.round(textHsl.h)}
                                                        onChange={(e) => {
                                                          const h = parseInt(e.target.value) || 0;
                                                          const hexColor = hslToHex(h, textHsl.s, textHsl.l);
                                                          setCustomColors({
                                                            ...customColors,
                                                            statusColors: {
                                                              ...customColors.statusColors,
                                                              [status]: { ...statusColor, text: hexColor }
                                                            }
                                                          });
                                                        }}
                                                        className="font-mono text-xs"
                                                      />
                                                    </div>
                                                    <div>
                                                      <Label className="text-xs text-muted-foreground">S%</Label>
                                                      <Input
                                                        type="number"
                                                        min="0"
                                                        max="100"
                                                        value={Math.round(textHsl.s)}
                                                        onChange={(e) => {
                                                          const s = parseInt(e.target.value) || 0;
                                                          const hexColor = hslToHex(textHsl.h, s, textHsl.l);
                                                          setCustomColors({
                                                            ...customColors,
                                                            statusColors: {
                                                              ...customColors.statusColors,
                                                              [status]: { ...statusColor, text: hexColor }
                                                            }
                                                          });
                                                        }}
                                                        className="font-mono text-xs"
                                                      />
                                                    </div>
                                                    <div>
                                                      <Label className="text-xs text-muted-foreground">L%</Label>
                                                      <Input
                                                        type="number"
                                                        min="0"
                                                        max="100"
                                                        value={Math.round(textHsl.l)}
                                                        onChange={(e) => {
                                                          const l = parseInt(e.target.value) || 0;
                                                          const hexColor = hslToHex(textHsl.h, textHsl.s, l);
                                                          setCustomColors({
                                                            ...customColors,
                                                            statusColors: {
                                                              ...customColors.statusColors,
                                                              [status]: { ...statusColor, text: hexColor }
                                                            }
                                                          });
                                                        }}
                                                        className="font-mono text-xs"
                                                      />
                                                    </div>
                                                  </div>
                                                </div>
                                              </div>
                                            </PopoverContent>
                                          </Popover>
                                        </div>
                                      </div>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="w-full mt-1"
                                        onClick={() => setCustomColors({ ...customColors, statusColors: { ...customColors.statusColors, [status]: { background: '', text: '' } } })}
                                        title="Reset to theme default"
                                      >
                                        <RotateCcw className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>

                            <Separator className="my-4" />

                            {/* Row Coloring Toggle */}
                            <div className="space-y-2">
                              <div className="flex items-center space-x-2">
                                <Checkbox
                                  id="color-row-by-status"
                                  checked={colorRowByStatus}
                                  onCheckedChange={(checked) => setColorRowByStatus(!!checked)}
                                />
                                <Label htmlFor="color-row-by-status" className="text-sm font-medium">Color entire row by status</Label>
                              </div>
                            </div>

                            <Separator className="my-4" />

                            {/* Reset All Colors Button - Inside Colors Popover */}
                            <Button
                              variant="destructive"
                              className="w-full"
                              onClick={() => {
                                if (resolvedTheme === 'dark') {
                                  setDarkModeColors(defaultDarkColors);
                                } else {
                                  setLightModeColors(defaultLightColors);
                                }
                                toast({
                                  title: "Colors Reset",
                                  description: `${resolvedTheme === 'dark' ? 'Dark' : 'Light'} mode colors have been reset to defaults`,
                                });
                              }}
                              data-testid="button-reset-all-colors-inline"
                            >
                              <RotateCcw className="mr-2 h-4 w-4" />
                              Reset {resolvedTheme === 'dark' ? 'Dark' : 'Light'} Mode Colors
                            </Button>
                          </div>
                        </div>
                      </PopoverContent>
                    </Popover>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Filter Buttons Row */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Total and Visible Shops Counter */}
                <div className="flex items-center gap-2 text-sm text-muted-foreground px-3 py-1 bg-muted rounded-md" data-testid="text-shops-counter">
                  <span className="font-medium">Showing {filteredData.length} of {data.length} shops</span>
                </div>

                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" data-testid="button-states-filter">
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
                            checked={allStates.filter(isCanadianProvince).every(state => selectedStates.has(state))}
                            onCheckedChange={(checked) => {
                              const canadianStates = allStates.filter(isCanadianProvince);
                              const newSelected = new Set(selectedStates);
                              if (checked) {
                                canadianStates.forEach(state => newSelected.add(state));
                              } else {
                                canadianStates.forEach(state => newSelected.delete(state));
                              }
                              setSelectedStates(newSelected);
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
                            {allStates.map((state: string) => (
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

                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" data-testid="button-column-settings">
                      <Settings2 className="mr-2 h-4 w-4" />
                      Columns
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-96">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">Manage Columns</h4>
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
            <div className="border rounded-md overflow-hidden" style={{ borderColor: customColors.border }}>
              <div 
                ref={tableContainerRef}
                className="h-[600px] w-full overflow-auto" 
                style={{ backgroundColor: colorRowByStatus ? '#ffffff' : customColors.background }}
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
                      const rowStatusColor = colorRowByStatus && rowStatus && (customColors.statusColors as any)?.[rowStatus];

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
                                    backgroundColor: rowStatusColor ? rowStatusColor.background : (colorRowByStatus ? '#ffffff' : customColors.background)
                                  } : {})
                                }}
                              >
                                {isEditable ? (
                                  hasData ? (
                                    // Has data: Show value with edit controls - always allow editing
                                    isDateColumn ? (
                                      <Popover open={openCombobox === comboboxKey} onOpenChange={(open) => setOpenCombobox(open ? comboboxKey : null)}>
                                        <PopoverTrigger asChild>
                                          <Button
                                            variant="outline"
                                            className="w-full justify-start text-left font-normal"
                                            data-testid={`button-date-${rowKey}-${header}`}
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
                                      >
                                        <SelectTrigger
                                          className="w-full"
                                          data-testid={`button-status-${rowKey}-${header}`}
                                          style={cellValue && (customColors.statusColors as any)?.[cellValue] ? {
                                            backgroundColor: (customColors.statusColors as any)[cellValue].background,
                                            color: (customColors.statusColors as any)[cellValue].text,
                                          } : undefined}
                                        >
                                          <SelectValue placeholder="Select status..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {statusOptions.map((status) => {
                                            const statusColor = (customColors.statusColors as any)?.[status];
                                            return (
                                              <SelectItem
                                                key={status}
                                                value={status}
                                                data-testid={`option-status-${status}`}
                                                style={statusColor ? {
                                                  backgroundColor: darkenColor(statusColor.background, 30),
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
                                      <Popover open={openCombobox === comboboxKey} onOpenChange={(open) => setOpenCombobox(open ? comboboxKey : null)}>
                                        <PopoverTrigger asChild>
                                          <Button
                                            variant="outline"
                                            role="combobox"
                                            aria-expanded={openCombobox === comboboxKey}
                                            className="w-full justify-between"
                                            data-testid={`button-state-${rowKey}-${header}`}
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
                                      />
                                    )
                                  ) : (
                                    // Empty cell: Allow inline editing for new data
                                    isDateColumn ? (
                                      <Popover open={openCombobox === comboboxKey} onOpenChange={(open) => setOpenCombobox(open ? comboboxKey : null)}>
                                        <PopoverTrigger asChild>
                                          <Button
                                            variant="outline"
                                            className="w-full justify-start text-left font-normal"
                                            data-testid={`button-date-${rowKey}-${header}`}
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
                                      >
                                        <SelectTrigger
                                          className="w-full"
                                          data-testid={`button-status-${rowKey}-${header}`}
                                        >
                                          <SelectValue placeholder="Select status..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {statusOptions.map((status) => {
                                            const statusColor = (customColors.statusColors as any)?.[status];
                                            return (
                                              <SelectItem
                                                key={status}
                                                value={status}
                                                data-testid={`option-status-${status}`}
                                                style={statusColor ? {
                                                  backgroundColor: darkenColor(statusColor.background, 30),
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
                                      <Popover open={openCombobox === comboboxKey} onOpenChange={(open) => setOpenCombobox(open ? comboboxKey : null)}>
                                        <PopoverTrigger asChild>
                                          <Button
                                            variant="outline"
                                            role="combobox"
                                            aria-expanded={openCombobox === comboboxKey}
                                            className="w-full justify-between"
                                            data-testid={`button-state-${rowKey}-${header}`}
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
                                      />
                                    )
                                  )
                                ) : (
                                  <div className="flex items-center gap-2">
                                    {isPhoneColumn && cellValue ? (
                                      <button
                                        onClick={() => setContactActionDialog({
                                          open: true,
                                          contactType: 'phone',
                                          contactValue: cellValue,
                                          row: row,
                                        })}
                                        className="flex items-center gap-1 hover:underline"
                                        style={{ color: customColors.primary }}
                                        data-testid={`link-phone-${rowKey}-${header}`}
                                      >
                                        <Phone className="h-4 w-4" />
                                        <span>{displayValue}</span>
                                      </button>
                                    ) : isEmailColumn && cellValue ? (
                                      <button
                                        onClick={() => setContactActionDialog({
                                          open: true,
                                          contactType: 'email',
                                          contactValue: cellValue,
                                          row: row,
                                        })}
                                        className="flex items-center gap-1 hover:underline"
                                        style={{ color: customColors.primary }}
                                        data-testid={`link-email-${rowKey}-${header}`}
                                      >
                                        <Mail className="h-4 w-4" />
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
                                          row: row
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
                                        className="flex items-center gap-1 hover:underline"
                                        style={{ color: customColors.primary }}
                                        data-testid={`link-website-${rowKey}-${header}`}
                                      >
                                        <ExternalLink className="h-4 w-4" />
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
              <Button onClick={saveExpandedCell} data-testid="button-save-expanded">
                Save Changes
              </Button>
            )}
            <Button variant="outline" onClick={() => setExpandedCell(null)} data-testid="button-close-expanded">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Contact Action Dialog */}
      {contactActionDialog && (
        <ContactActionDialog
          open={contactActionDialog.open}
          onOpenChange={(open) => !open && setContactActionDialog(null)}
          contactType={contactActionDialog.contactType}
          contactValue={contactActionDialog.contactValue}
          row={contactActionDialog.row}
          trackerSheetId={trackerSheetId}
          joinColumn={joinColumn}
          userEmail={currentUser?.email || ''}
        />
      )}

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
          onOpenChange={(open) => !open && setStoreDetailsDialog(null)}
          row={storeDetailsDialog.row}
          trackerSheetId={trackerSheetId}
          storeSheetId={storeSheetId}
          refetch={refetch}
        />
      )}
      </div>
    </div>
  );
}

// Store Details Dialog Component
function StoreDetailsDialog({ open, onOpenChange, row, trackerSheetId, storeSheetId, refetch }: { 
  open: boolean; 
  onOpenChange: (open: boolean) => void; 
  row: any;
  trackerSheetId: string | undefined;
  storeSheetId: string | undefined;
  refetch: () => Promise<any>;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

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
  });

  // Track initial data to determine what changed
  const [initialData, setInitialData] = useState(formData);
  
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
      // Helper function to get value from various possible field names (case-insensitive)
      const getValue = (fieldNames: string[]) => {
        for (const fieldName of fieldNames) {
          // Try exact match first
          if (row[fieldName]) return row[fieldName];
          
          // Try case-insensitive match
          const key = Object.keys(row).find(k => k.toLowerCase() === fieldName.toLowerCase());
          if (key && row[key]) return row[key];
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
      };
      setFormData(populatedData);
      setInitialData(populatedData);
    }
  }, [row, open]);

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
      
      // Update initialData after auto-fill so hasUnsavedChanges doesn't trigger on auto-filled values
      if (updated) {
        setInitialData(prev => ({
          ...prev,
          poc_email: emailToSet || prev.poc_email,
          poc_phone: phoneToSet || prev.poc_phone
        }));
      }
    } else {
      // If notes are cleared, clear POC fields if they haven't been manually edited
      if (!pocFieldsManuallyEdited.email && formData.poc_email) {
        setFormData(prev => ({ ...prev, poc_email: '' }));
        setInitialData(prev => ({ ...prev, poc_email: '' }));
      }
      if (!pocFieldsManuallyEdited.phone && formData.poc_phone) {
        setFormData(prev => ({ ...prev, poc_phone: '' }));
        setInitialData(prev => ({ ...prev, poc_phone: '' }));
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
    notes: { sheet: 'tracker', column: 'Notes' },
    point_of_contact: { sheet: 'tracker', column: 'Point of Contact' },
    poc_email: { sheet: 'tracker', column: 'POC Email' },
    poc_phone: { sheet: 'tracker', column: 'POC Phone' },
    status: { sheet: 'tracker', column: 'Status' },
    follow_up_date: { sheet: 'tracker', column: 'Follow-Up Date' },
    next_action: { sheet: 'tracker', column: 'Next Action' },
  };

  // Save mutation - update cells directly
  const saveMutation = useMutation({
    mutationFn: async () => {
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
        const link = formData.link || row.link || row.Link;
        if (!link) {
          throw new Error("Cannot save tracker fields: Store link is missing");
        }
        
        promises.push(
          apiRequest('POST', '/api/sheets/tracker/upsert', { link, updates: trackerChanges })
        );
      }

      await Promise.all(promises);
    },
    onSuccess: async () => {
      toast({
        title: "Success",
        description: "Store information updated successfully",
      });
      // Invalidate and refetch to update the table immediately
      await queryClient.invalidateQueries({ queryKey: ['merged-data'] });
      await refetch();
      setInitialData(formData); // Update initial data so changes are no longer "unsaved"
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
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
    // Check if any tracker fields are being changed
    const trackerFieldsChanged = Object.keys(formData).some((key) => {
      const typedKey = key as keyof typeof formData;
      const mapping = fieldToSheetMapping[key];
      return mapping?.sheet === 'tracker' && formData[typedKey] !== initialData[typedKey];
    });
    
    // If tracker fields are being changed, follow_up_date is mandatory
    if (trackerFieldsChanged && !formData.follow_up_date) {
      toast({
        title: "Validation Error",
        description: "Follow-Up Date is required when updating sales tracking information.",
        variant: "destructive",
      });
      return;
    }
    
    saveMutation.mutate();
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
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{formData.name || "Store Details"}</DialogTitle>
          <DialogDescription>{formData.type}</DialogDescription>
        </DialogHeader>

        {!row ? (
          <div className="flex items-center justify-center h-64">
            <p>No store data available</p>
          </div>
        ) : (
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
                    <div className="flex items-center justify-between">
                      <Label htmlFor="notes">Notes</Label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleReDetect}
                        data-testid="button-redetect"
                        className="h-7"
                      >
                        <RefreshCw className="h-3 w-3 mr-1" />
                        Detect Contact Info
                      </Button>
                    </div>
                    <Textarea
                      id="notes"
                      data-testid="input-notes"
                      value={formData.notes}
                      onChange={(e) => handleInputChange('notes', e.target.value)}
                      placeholder="Call notes, contact info from store worker..."
                      rows={4}
                    />
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
                        placeholder="contact@email.com"
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
                  
                  {/* Status, Follow-Up Date, Next Action */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t">
                    <div className="space-y-2">
                      <Label htmlFor="status">Status</Label>
                      <Select
                        value={formData.status}
                        onValueChange={(value) => handleInputChange('status', value)}
                      >
                        <SelectTrigger id="status" data-testid="select-status">
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1 – Contacted" data-testid="status-option-contacted">1 – Contacted</SelectItem>
                          <SelectItem value="2 – Interested" data-testid="status-option-interested">2 – Interested</SelectItem>
                          <SelectItem value="3 – Sample Sent" data-testid="status-option-sample-sent">3 – Sample Sent</SelectItem>
                          <SelectItem value="4 – Follow-Up" data-testid="status-option-follow-up">4 – Follow-Up</SelectItem>
                          <SelectItem value="5 – Closed Won" data-testid="status-option-closed-won">5 – Closed Won</SelectItem>
                          <SelectItem value="6 – Closed Lost" data-testid="status-option-closed-lost">6 – Closed Lost</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="follow_up_date" className="flex items-center gap-1">
                        Follow-Up Date
                        <span className="text-destructive">*</span>
                      </Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className="w-full justify-start text-left font-normal"
                            data-testid="button-follow-up-date"
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {formData.follow_up_date ? (
                              format(parse(formData.follow_up_date, 'M/d/yyyy', new Date()), 'PPP')
                            ) : (
                              <span className="text-muted-foreground">Pick a date</span>
                            )}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" data-testid="popover-follow-up-date">
                          <Calendar
                            mode="single"
                            selected={formData.follow_up_date ? parse(formData.follow_up_date, 'M/d/yyyy', new Date()) : undefined}
                            onSelect={(date) => handleInputChange('follow_up_date', date ? format(date, 'M/d/yyyy') : '')}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="next_action">Next Action</Label>
                      <Input
                        id="next_action"
                        data-testid="input-next-action"
                        value={formData.next_action}
                        onChange={(e) => handleInputChange('next_action', e.target.value)}
                        placeholder="e.g., Call back next week"
                      />
                    </div>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

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
                      <Input
                        id="state"
                        data-testid="input-state"
                        value={formData.state}
                        onChange={(e) => handleInputChange('state', e.target.value)}
                        placeholder="State"
                      />
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
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} data-testid="button-cancel">
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saveMutation.isPending} data-testid="button-save">
            {saveMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}