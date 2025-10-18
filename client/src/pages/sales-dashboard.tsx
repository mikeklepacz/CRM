import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { RefreshCw, Settings2, Save, ChevronLeft, ChevronRight, Maximize2, Phone, Mail, ExternalLink, ArrowUpDown, ArrowUp, ArrowDown, Check, ChevronsUpDown, Calendar as CalendarIcon, Type, AlignJustify } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { format, parse, isValid } from "date-fns";

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

interface GoogleSheet {
  id: string;
  spreadsheetName: string;
  sheetName: string;
  sheetPurpose: string;
}

export default function SalesDashboard() {
  const { toast } = useToast();
  const [storeSheetId, setStoreSheetId] = useState<string>("");
  const [trackerSheetId, setTrackerSheetId] = useState<string>("");
  const joinColumn = "link"; // Hardcoded to "link"
  const [searchTerm, setSearchTerm] = useState("");
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>({});
  const [columnOrder, setColumnOrder] = useState<string[]>([]);
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({});
  const [editedCells, setEditedCells] = useState<Record<string, { rowIndex: number; column: string; value: string; sheetId: string }>>({});
  const [expandedCell, setExpandedCell] = useState<{ row: any; column: string; value: string; isEditable: boolean } | null>(null);
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [openCombobox, setOpenCombobox] = useState<string | null>(null);
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());
  const [selectedKeywords, setSelectedKeywords] = useState<Set<string>>(new Set());
  const [selectedStates, setSelectedStates] = useState<Set<string>>(new Set());
  const [fontSize, setFontSize] = useState<number>(14); // Font size in pixels
  const [rowHeight, setRowHeight] = useState<number>(48); // Row height in pixels
  const [resizingColumn, setResizingColumn] = useState<{ column: string; startX: number; startWidth: number } | null>(null);
  const [preferencesLoaded, setPreferencesLoaded] = useState(false);

  // Fetch user preferences
  const { data: userPreferences, isFetched: preferencesQueryFetched } = useQuery<{
    visibleColumns?: Record<string, boolean>;
    columnOrder?: string[];
    columnWidths?: Record<string, number>;
    selectedTags?: string[];
    selectedKeywords?: string[];
    selectedStates?: string[];
    fontSize?: number;
    rowHeight?: number;
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
      const storeSheet = sheets.find(s => s.sheetPurpose === 'clients');
      const trackerSheet = sheets.find(s => s.sheetPurpose === 'commissions');

      if (storeSheet) setStoreSheetId(storeSheet.id);
      if (trackerSheet) setTrackerSheetId(trackerSheet.id);
    }
  }, [sheets.length]);

  // Fetch merged data
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
  useEffect(() => {
    if (headers.length > 0 && preferencesQueryFetched && !preferencesLoaded) {
      const initialVisible: Record<string, boolean> = {};
      const initialWidths: Record<string, number> = {};
      const hiddenColumns = ['title', 'error']; // Columns to hide by default

      // Check if we have saved preferences
      if (userPreferences) {
        // Load saved preferences if available
        if (userPreferences.visibleColumns) {
          // Merge saved preferences with new headers (in case new columns were added)
          headers.forEach((header: string) => {
            initialVisible[header] = userPreferences.visibleColumns![header] ?? !hiddenColumns.includes(header.toLowerCase());
          });
        } else {
          headers.forEach((header: string) => {
            initialVisible[header] = !hiddenColumns.includes(header.toLowerCase());
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
            initialWidths[header] = userPreferences.columnWidths![header] || 200;
          });
        } else {
          headers.forEach((header: string) => {
            initialWidths[header] = 200;
          });
        }

        setVisibleColumns(initialVisible);
        setColumnWidths(initialWidths);
        
        // Load font size and row height preferences
        if (userPreferences.fontSize) {
          setFontSize(userPreferences.fontSize);
        }
        if (userPreferences.rowHeight) {
          setRowHeight(userPreferences.rowHeight);
        }
        
        setPreferencesLoaded(true);
      } else {
        // No saved preferences, use defaults
        headers.forEach((header: string) => {
          initialVisible[header] = !hiddenColumns.includes(header.toLowerCase());
          initialWidths[header] = 200;
        });
        setVisibleColumns(initialVisible);
        setColumnOrder(headers);
        setColumnWidths(initialWidths);
        setFontSize(14);
        setRowHeight(48);
        setPreferencesLoaded(true);
      }
    }
  }, [headers.length, userPreferences, preferencesQueryFetched, preferencesLoaded]);


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
    handleCellEdit(expandedCell.row, expandedCell.column, expandedCell.value);
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

  const cleanTagDisplay = (value: string, filterBySelected: boolean = false, selectedSet?: Set<string>): string => {
    if (!value) return '';
    const setToUse = selectedSet || selectedTags;
    // Split by comma, clean each tag, filter out empty ones, and rejoin
    return String(value)
      .split(',')
      .map((tag: string) => {
        let cleaned = tag.trim();
        // Remove brackets and quotes
        cleaned = cleaned.replace(/^["'\[\]]+|["'\[\]]+$/g, '');
        cleaned = cleaned.replace(/^["']+|["']+$/g, '');
        return cleaned;
      })
      .filter((tag: string) => {
        if (!tag || tag === '""' || tag === "''") return false;
        // If filtering by selected tags, only show selected ones
        if (filterBySelected) {
          return setToUse.has(tag);
        }
        return true;
      })
      .join(', ');
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

  // Get all unique tags from the data
  const allTags = (() => {
    const tags = new Set<string>();
    const tagColumns = headers.filter((h: string) => h.toLowerCase().includes('tag'));
    data.forEach((row: any) => {
      tagColumns.forEach((col: string) => {
        const value = row[col];
        if (value && String(value).trim()) {
          // Split by comma if multiple tags in one cell
          String(value).split(',').forEach((tag: string) => {
            let cleaned = tag.trim();
            // Remove quotes and brackets
            cleaned = cleaned.replace(/^["'\[\]]+|["'\[\]]+$/g, '');
            cleaned = cleaned.replace(/^["']+|["']+$/g, '');
            if (cleaned && cleaned !== '""' && cleaned !== "''") {
              tags.add(cleaned);
            }
          });
        }
      });
    });
    return Array.from(tags).sort();
  })();

  // Get all unique keywords/phrases from the data
  const allKeywords = (() => {
    const keywords = new Set<string>();
    const keywordColumns = headers.filter((h: string) => 
      h.toLowerCase().includes('keyword') || 
      h.toLowerCase().includes('phrase')
    );
    data.forEach((row: any) => {
      keywordColumns.forEach((col: string) => {
        const value = row[col];
        if (value && String(value).trim()) {
          // Split by comma if multiple keywords in one cell
          String(value).split(',').forEach((keyword: string) => {
            let cleaned = keyword.trim();
            // Remove quotes and brackets
            cleaned = cleaned.replace(/^["'\[\]]+|["'\[\]]+$/g, '');
            cleaned = cleaned.replace(/^["']+|["']+$/g, '');
            if (cleaned && cleaned !== '""' && cleaned !== "''") {
              keywords.add(cleaned);
            }
          });
        }
      });
    });
    return Array.from(keywords).sort();
  })();

  // Get all unique states from the data (with full names)
  const allStates = (() => {
    const states = new Set<string>();
    // Look for columns named "state" OR containing ", state" (like "City, State")
    const stateColumns = headers.filter((h: string) => {
      const lower = h.toLowerCase();
      return lower === 'state' || lower.includes(', state');
    });
    console.log('=== STATE FILTER DEBUG ===');
    console.log('Headers:', headers);
    console.log('State columns found:', stateColumns);
    console.log('Number of data rows:', data.length);
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
          
          // Only accept 2-letter state codes
          if (stateAbbrev.length === 2) {
            const stateName = getStateName(stateAbbrev);
            if (stateName) {
              states.add(stateName);
            }
          }
        }
      });
    });
    const statesArray = Array.from(states).sort();
    console.log('All states extracted:', statesArray);
    console.log('States count:', statesArray.length);
    console.log('=== END STATE FILTER DEBUG ===');
    return statesArray;
  })();

  // Initialize selected tags when data loads (or from saved preferences)
  useEffect(() => {
    if (allTags.length > 0 && selectedTags.size === 0) {
      if (userPreferences?.selectedTags && userPreferences.selectedTags.length > 0) {
        // Filter saved tags to only include ones that still exist in the data
        const validTags = userPreferences.selectedTags.filter((tag: string) => allTags.includes(tag));
        setSelectedTags(new Set(validTags.length > 0 ? validTags : allTags));
      } else {
        setSelectedTags(new Set(allTags));
      }
    }
  }, [allTags.length, userPreferences]);

  // Initialize selected keywords when data loads (or from saved preferences)
  useEffect(() => {
    if (allKeywords.length > 0 && selectedKeywords.size === 0) {
      if (userPreferences?.selectedKeywords && userPreferences.selectedKeywords.length > 0) {
        // Filter saved keywords to only include ones that still exist in the data
        const validKeywords = userPreferences.selectedKeywords.filter((kw: string) => allKeywords.includes(kw));
        setSelectedKeywords(new Set(validKeywords.length > 0 ? validKeywords : allKeywords));
      } else {
        setSelectedKeywords(new Set(allKeywords));
      }
    }
  }, [allKeywords.length, userPreferences]);

  // Initialize selected states when data loads (or from saved preferences)
  useEffect(() => {
    if (allStates.length > 0 && selectedStates.size === 0) {
      if (userPreferences?.selectedStates && userPreferences.selectedStates.length > 0) {
        // Filter saved states to only include ones that still exist in the data
        const validStates = userPreferences.selectedStates.filter((state: string) => allStates.includes(state));
        setSelectedStates(new Set(validStates.length > 0 ? validStates : allStates));
      } else {
        setSelectedStates(new Set(allStates));
      }
    }
  }, [allStates.length, userPreferences]);

  // Auto-save user preferences when they change (debounced)
  useEffect(() => {
    if (!preferencesLoaded) return; // Don't save until we've loaded initial preferences

    const timeoutId = setTimeout(async () => {
      try {
        await apiRequest('PUT', '/api/user/preferences', {
          visibleColumns,
          columnOrder,
          columnWidths,
          selectedTags: Array.from(selectedTags),
          selectedKeywords: Array.from(selectedKeywords),
          selectedStates: Array.from(selectedStates),
          fontSize,
          rowHeight,
        });
      } catch (error) {
        console.error('Failed to save preferences:', error);
      }
    }, 1000); // Save 1 second after last change

    return () => clearTimeout(timeoutId);
  }, [visibleColumns, columnOrder, columnWidths, selectedTags, selectedKeywords, selectedStates, fontSize, rowHeight, preferencesLoaded]);

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

  const toggleTag = (tag: string) => {
    const newSelected = new Set(selectedTags);
    if (newSelected.has(tag)) {
      newSelected.delete(tag);
    } else {
      newSelected.add(tag);
    }
    setSelectedTags(newSelected);
  };

  const selectAllTags = () => {
    setSelectedTags(new Set(allTags));
  };

  const clearAllTags = () => {
    setSelectedTags(new Set());
  };

  const toggleKeyword = (keyword: string) => {
    const newSelected = new Set(selectedKeywords);
    if (newSelected.has(keyword)) {
      newSelected.delete(keyword);
    } else {
      newSelected.add(keyword);
    }
    setSelectedKeywords(newSelected);
  };

  const selectAllKeywords = () => {
    setSelectedKeywords(new Set(allKeywords));
  };

  const clearAllKeywords = () => {
    setSelectedKeywords(new Set());
  };

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
    // Determine which sheet this column belongs to
    const isTrackerColumn = trackerHeaders.includes(column);
    const sheetId = isTrackerColumn ? trackerSheetId : storeSheetId;
    const rowIndex = isTrackerColumn ? row._trackerRowIndex : row._storeRowIndex;

    if (!sheetId || !rowIndex) return;

    // Use a unique key that doesn't break on hyphens in column names
    const key = JSON.stringify({ rowIndex, column, sheetId });
    setEditedCells(prev => ({
      ...prev,
      [key]: { rowIndex, column, value, sheetId },
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

  // Filter and sort data
  const filteredData = (() => {
    // First filter by search
    let filtered = data.filter((row: any) => {
      const searchLower = searchTerm.toLowerCase();
      return headers.some((header: string) => {
        const value = row[header]?.toString().toLowerCase() || '';
        return value.includes(searchLower);
      });
    });

    // Then filter by tags
    if (selectedTags.size > 0 && selectedTags.size < allTags.length) {
      const tagColumns = headers.filter((h: string) => h.toLowerCase().includes('tag'));
      filtered = filtered.filter((row: any) => {
        // Check if row has at least one selected tag
        return tagColumns.some((col: string) => {
          const value = row[col];
          if (value && String(value).trim()) {
            const rowTags = String(value).split(',').map((t: string) => {
              let cleaned = t.trim();
              // Remove quotes and brackets
              cleaned = cleaned.replace(/^["'\[\]]+|["'\[\]]+$/g, '');
              cleaned = cleaned.replace(/^["']+|["']+$/g, '');
              return cleaned;
            });
            return rowTags.some((tag: string) => tag && tag !== '""' && tag !== "''" && selectedTags.has(tag));
          }
          return false;
        });
      });
    }

    // Then filter by keywords/phrases
    if (selectedKeywords.size > 0 && selectedKeywords.size < allKeywords.length) {
      const keywordColumns = headers.filter((h: string) => 
        h.toLowerCase().includes('keyword') || 
        h.toLowerCase().includes('phrase')
      );
      filtered = filtered.filter((row: any) => {
        // Check if row has at least one selected keyword
        return keywordColumns.some((col: string) => {
          const value = row[col];
          if (value && String(value).trim()) {
            const rowKeywords = String(value).split(',').map((k: string) => {
              let cleaned = k.trim();
              // Remove quotes and brackets
              cleaned = cleaned.replace(/^["'\[\]]+|["'\[\]]+$/g, '');
              cleaned = cleaned.replace(/^["']+|["']+$/g, '');
              return cleaned;
            });
            return rowKeywords.some((keyword: string) => keyword && keyword !== '""' && keyword !== "''" && selectedKeywords.has(keyword));
          }
          return false;
        });
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
  })();

  const visibleHeaders = columnOrder.filter((h: string) => visibleColumns[h]);
  const hasUnsavedChanges = Object.keys(editedCells).length > 0;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
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
            <div className="flex flex-wrap items-center justify-between gap-4">
              <Input
                placeholder="Search all columns..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-sm"
                data-testid="input-search"
              />

              <div className="flex items-center gap-2">
                {hasUnsavedChanges && (
                  <Button
                    onClick={handleSave}
                    data-testid="button-save-changes"
                  >
                    <Save className="mr-2 h-4 w-4" />
                    Save Changes ({Object.keys(editedCells).length})
                  </Button>
                )}

                <Button
                  variant="outline"
                  onClick={() => refetch()}
                  disabled={isLoading}
                  data-testid="button-refresh"
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Refresh
                </Button>

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

                {/* Reset to Default Button */}
                {(fontSize !== 14 || rowHeight !== 48) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setFontSize(14);
                      setRowHeight(48);
                    }}
                    data-testid="button-reset-display"
                  >
                    Reset Display
                  </Button>
                )}

                {allTags.length > 0 && (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" data-testid="button-tags-filter">
                        <Settings2 className="mr-2 h-4 w-4" />
                        Tags ({selectedTags.size}/{allTags.length})
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium">Filter by Tags</h4>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={selectAllTags}
                              data-testid="button-select-all-tags"
                            >
                              All
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={clearAllTags}
                              data-testid="button-clear-all-tags"
                            >
                              None
                            </Button>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Uncheck tags to hide rows with those tags
                        </p>
                        <ScrollArea className="h-64">
                          <div className="space-y-2">
                            {allTags.map((tag: string) => (
                              <div key={tag} className="flex items-center gap-2">
                                <Checkbox
                                  id={`tag-${tag}`}
                                  checked={selectedTags.has(tag)}
                                  onCheckedChange={() => toggleTag(tag)}
                                  data-testid={`checkbox-tag-${tag}`}
                                />
                                <Label 
                                  htmlFor={`tag-${tag}`} 
                                  className="text-sm cursor-pointer flex-1"
                                >
                                  {tag}
                                </Label>
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                      </div>
                    </PopoverContent>
                  </Popover>
                )}

                {allKeywords.length > 0 && (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" data-testid="button-keywords-filter">
                        <Settings2 className="mr-2 h-4 w-4" />
                        Keywords/Phrases ({selectedKeywords.size}/{allKeywords.length})
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium">Filter by Keywords/Phrases</h4>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={selectAllKeywords}
                              data-testid="button-select-all-keywords"
                            >
                              All
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={clearAllKeywords}
                              data-testid="button-clear-all-keywords"
                            >
                              None
                            </Button>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Uncheck items to hide rows with those keywords/phrases
                        </p>
                        <ScrollArea className="h-64">
                          <div className="space-y-2">
                            {allKeywords.map((keyword: string) => (
                              <div key={keyword} className="flex items-center gap-2">
                                <Checkbox
                                  id={`keyword-${keyword}`}
                                  checked={selectedKeywords.has(keyword)}
                                  onCheckedChange={() => toggleKeyword(keyword)}
                                  data-testid={`checkbox-keyword-${keyword}`}
                                />
                                <Label 
                                  htmlFor={`keyword-${keyword}`} 
                                  className="text-sm cursor-pointer flex-1"
                                >
                                  {keyword}
                                </Label>
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                      </div>
                    </PopoverContent>
                  </Popover>
                )}

                {allStates.length > 0 && (
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
                      <h4 className="font-medium">Manage Columns</h4>
                      <p className="text-xs text-muted-foreground">Show/hide and reorder columns (doesn't affect Google Sheets)</p>
                      <ScrollArea className="h-72">
                        <div className="space-y-2">
                          {columnOrder.map((header: string, index: number) => (
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
                                  disabled={index === 0}
                                  data-testid={`button-move-left-${header}`}
                                >
                                  <ChevronLeft className="h-3 w-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                  onClick={() => moveColumnRight(header)}
                                  disabled={index === columnOrder.length - 1}
                                  data-testid={`button-move-right-${header}`}
                                >
                                  <ChevronRight className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          )}

          {/* Data Table */}
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-2 text-muted-foreground">Loading data...</p>
            </div>
          ) : storeSheetId && trackerSheetId && data.length > 0 ? (
            <div className="border rounded-md overflow-auto">
              <div className="h-[600px] w-full overflow-auto">
                <Table className="min-w-full" style={{ tableLayout: 'fixed' }}>
                  <TableHeader>
                    <TableRow>
                      {visibleHeaders.map((header: string) => (
                        <TableHead 
                          key={header} 
                          className="whitespace-nowrap relative group"
                          style={{ width: columnWidths[header] || 200 }}
                        >
                          <div className="flex items-center justify-between pr-4">
                            <button
                              onClick={() => handleSort(header)}
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
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredData.map((row: any, rowIdx: number) => {
                      const rowKey = row._storeRowIndex || row._trackerRowIndex || rowIdx;
                      const isDeletedRow = row._deletedFromStore;
                      // Calculate minimum required height based on font size
                      const verticalPadding = Math.max(8, fontSize * 0.5) * 2;
                      const lineHeight = fontSize * 1.4;
                      const minRequiredHeight = lineHeight + verticalPadding;
                      const effectiveHeight = Math.max(rowHeight, minRequiredHeight);
                      
                      return (
                        <TableRow 
                          key={rowKey} 
                          data-testid={`row-data-${rowIdx}`}
                          className={isDeletedRow ? "bg-destructive/10 hover:bg-destructive/20" : ""}
                          title={isDeletedRow ? "This order was deleted from the store sheet" : ""}
                          style={{ fontSize: `${fontSize}px`, height: `${effectiveHeight}px` }}
                        >
                          {visibleHeaders.map((header: string) => {
                            const isEditable = editableColumns.includes(header);
                            const isTrackerColumn = trackerHeaders.includes(header);
                            const sheetId = isTrackerColumn ? trackerSheetId : storeSheetId;
                            const rowIndex = isTrackerColumn ? row._trackerRowIndex : row._storeRowIndex;
                            const cellKey = JSON.stringify({ rowIndex, column: header, sheetId });
                            const cellValue = editedCells[cellKey]?.value ?? row[header] ?? '';

                            const isPhoneColumn = header.toLowerCase().includes('phone');
                            const isEmailColumn = header.toLowerCase().includes('email') || header.toLowerCase().includes('e-mail');
                            const isWebsiteColumn = header.toLowerCase().includes('website') || header.toLowerCase().includes('url') || header.toLowerCase().includes('site');
                            const isLinkColumn = header.toLowerCase() === 'link';
                            const isStateColumn = header.toLowerCase() === 'state';
                            const isStatusColumn = header.toLowerCase().includes('status');
                            const isKeywordColumn = header.toLowerCase().includes('keyword') || header.toLowerCase().includes('phrase');
                            const isTagColumn = header.toLowerCase().includes('tag');
                            const isHoursColumn = header.toLowerCase().includes('hour');
                            const isDateColumn = header.toLowerCase().includes('date') || header.toLowerCase().includes('follow');
                            
                            // Determine if this column should allow text wrapping
                            const isAddressColumn = header.toLowerCase().includes('address') || header.toLowerCase().includes('street');
                            const isNotesColumn = header.toLowerCase().includes('note') || header.toLowerCase().includes('comment');
                            const shouldWrap = isAddressColumn || isNotesColumn || isHoursColumn || isKeywordColumn || isTagColumn;

                            const statusOptions = [
                              '1 – Contacted',
                              '2 – Interested',
                              '3 – Sample Sent',
                              '4 – Follow-Up',
                              '5 – Closed Won',
                              '6 – Closed Lost'
                            ];

                            // Clean display based on column type
                            let cleanedValue = cellValue;
                            if (isKeywordColumn) {
                              cleanedValue = cleanTagDisplay(cellValue, true, selectedKeywords);
                            } else if (isTagColumn) {
                              cleanedValue = cleanTagDisplay(cellValue, true, selectedTags);
                            } else if (isHoursColumn) {
                              cleanedValue = formatHours(cellValue);
                            }

                            const isLongText = cleanedValue.length > 100;
                            const displayValue = isLongText ? cleanedValue.substring(0, 100) + '...' : cleanedValue;

                            const isLeaflyLink = cellValue.toLowerCase().includes('leafly');
                            const hasData = cellValue.length > 0;
                            const comboboxKey = `${rowKey}-${header}`;
                            const uniqueStates = isStateColumn ? getUniqueColumnValues(header) : [];

                            return (
                              <TableCell 
                                key={header} 
                                className={shouldWrap ? "align-top" : "whitespace-nowrap align-middle"}
                                style={{ 
                                  width: columnWidths[header] || 200,
                                  maxWidth: columnWidths[header] || 200,
                                  padding: `${Math.max(8, fontSize * 0.5)}px 16px`,
                                  lineHeight: `${fontSize * 1.4}px`,
                                  height: 'inherit',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  ...(shouldWrap ? { wordBreak: 'break-word' as const, whiteSpace: 'normal' as const, overflow: 'visible' } : {})
                                }}
                              >
                                {isEditable ? (
                                  hasData ? (
                                    // Has data: Show value with edit on double-click
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
                                            selected={cellValue ? parse(cellValue, 'M/d/yyyy', new Date()) : undefined}
                                            onSelect={(date) => {
                                              if (date) {
                                                handleCellEdit(row, header, format(date, 'M/d/yyyy'));
                                              }
                                              setOpenCombobox(null);
                                            }}
                                            initialFocus
                                          />
                                        </PopoverContent>
                                      </Popover>
                                    ) : isStatusColumn ? (
                                      <Popover open={openCombobox === comboboxKey} onOpenChange={(open) => setOpenCombobox(open ? comboboxKey : null)}>
                                        <PopoverTrigger asChild>
                                          <Button
                                            variant="outline"
                                            role="combobox"
                                            aria-expanded={openCombobox === comboboxKey}
                                            className="w-full justify-between"
                                            data-testid={`button-status-${rowKey}-${header}`}
                                          >
                                            {cellValue || "Select status..."}
                                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                          </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-[200px] p-0">
                                          <Command>
                                            <CommandInput placeholder="Search status..." />
                                            <CommandList>
                                              <CommandEmpty>No status found.</CommandEmpty>
                                              <CommandGroup>
                                                {statusOptions.map((status) => (
                                                  <CommandItem
                                                    key={status}
                                                    value={status}
                                                    onSelect={() => {
                                                      handleCellEdit(row, header, status);
                                                      setOpenCombobox(null);
                                                    }}
                                                    data-testid={`option-status-${status}`}
                                                  >
                                                    <Check
                                                      className={`mr-2 h-4 w-4 ${cellValue === status ? "opacity-100" : "opacity-0"}`}
                                                    />
                                                    {status}
                                                  </CommandItem>
                                                ))}
                                              </CommandGroup>
                                            </CommandList>
                                          </Command>
                                        </PopoverContent>
                                      </Popover>
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
                                                    onSelect={() => {
                                                      handleCellEdit(row, header, state);
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
                                      <div className="flex items-center gap-2">
                                        {isPhoneColumn ? (
                                          <a 
                                            href={`tel:${cellValue}`}
                                            className="flex items-center gap-1 text-primary hover:underline"
                                            data-testid={`link-phone-${rowKey}-${header}`}
                                          >
                                            <Phone className="h-4 w-4" />
                                            <span>{displayValue}</span>
                                          </a>
                                        ) : isEmailColumn ? (
                                          <a 
                                            href={`mailto:${cellValue}`}
                                            className="flex items-center gap-1 text-primary hover:underline"
                                            data-testid={`link-email-${rowKey}-${header}`}
                                          >
                                            <Mail className="h-4 w-4" />
                                            <span>{displayValue}</span>
                                          </a>
                                        ) : isWebsiteColumn ? (
                                          <a 
                                            href={cellValue.startsWith('http') ? cellValue : `https://${cellValue}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-1 text-primary hover:underline"
                                            data-testid={`link-website-${rowKey}-${header}`}
                                          >
                                            <ExternalLink className="h-4 w-4" />
                                            <span>{extractDomain(cellValue)}</span>
                                          </a>
                                        ) : isLinkColumn ? (
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
                                            className="cursor-pointer hover:text-primary"
                                            data-testid={`text-cell-${rowKey}-${header}`}
                                          >
                                            {displayValue}
                                          </span>
                                        )}
                                        {!isLinkColumn && (
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 flex-shrink-0"
                                            onDoubleClick={() => openExpandedView(row, header, cellValue, true)}
                                            onClick={() => openExpandedView(row, header, cellValue, true)}
                                            data-testid={`button-edit-${rowKey}-${header}`}
                                            title="Click to edit"
                                          >
                                            <Maximize2 className="h-4 w-4" />
                                          </Button>
                                        )}
                                      </div>
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
                                                handleCellEdit(row, header, format(date, 'M/d/yyyy'));
                                              }
                                              setOpenCombobox(null);
                                            }}
                                            initialFocus
                                          />
                                        </PopoverContent>
                                      </Popover>
                                    ) : isStatusColumn ? (
                                      <Popover open={openCombobox === comboboxKey} onOpenChange={(open) => setOpenCombobox(open ? comboboxKey : null)}>
                                        <PopoverTrigger asChild>
                                          <Button
                                            variant="outline"
                                            role="combobox"
                                            aria-expanded={openCombobox === comboboxKey}
                                            className="w-full justify-between"
                                            data-testid={`button-status-${rowKey}-${header}`}
                                          >
                                            {cellValue || "Select status..."}
                                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                          </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-[200px] p-0">
                                          <Command>
                                            <CommandInput placeholder="Search status..." />
                                            <CommandList>
                                              <CommandEmpty>No status found.</CommandEmpty>
                                              <CommandGroup>
                                                {statusOptions.map((status) => (
                                                  <CommandItem
                                                    key={status}
                                                    value={status}
                                                    onSelect={() => {
                                                      handleCellEdit(row, header, status);
                                                      setOpenCombobox(null);
                                                    }}
                                                    data-testid={`option-status-${status}`}
                                                  >
                                                    <Check
                                                      className={`mr-2 h-4 w-4 ${cellValue === status ? "opacity-100" : "opacity-0"}`}
                                                    />
                                                    {status}
                                                  </CommandItem>
                                                ))}
                                              </CommandGroup>
                                            </CommandList>
                                          </Command>
                                        </PopoverContent>
                                      </Popover>
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
                                                    onSelect={() => {
                                                      handleCellEdit(row, header, state);
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
                                      <a 
                                        href={`tel:${cellValue}`}
                                        className="flex items-center gap-1 text-primary hover:underline"
                                        data-testid={`link-phone-${rowKey}-${header}`}
                                      >
                                        <Phone className="h-4 w-4" />
                                        <span>{displayValue}</span>
                                      </a>
                                    ) : isWebsiteColumn && cellValue ? (
                                      <a 
                                        href={cellValue.startsWith('http') ? cellValue : `https://${cellValue}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-1 text-primary hover:underline"
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
                                    {isLongText && !isPhoneColumn && !isWebsiteColumn && !isLinkColumn && (
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
                              </TableCell>
                            );
                          })}
                        </TableRow>
                      );
                    })}
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
    </div>
  );
}