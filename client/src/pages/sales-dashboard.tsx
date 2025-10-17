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
import { RefreshCw, Settings2, Save, ChevronLeft, ChevronRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

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

  // Initialize visible columns, column order, and widths
  useEffect(() => {
    if (headers.length > 0) {
      const initialVisible: Record<string, boolean> = {};
      const initialWidths: Record<string, number> = {};
      headers.forEach((header: string) => {
        initialVisible[header] = true;
        initialWidths[header] = 200; // Default width 200px
      });
      setVisibleColumns(initialVisible);
      setColumnOrder(headers);
      setColumnWidths(initialWidths);
    }
  }, [headers.length, storeSheetId, trackerSheetId]);


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

  const filteredData = data.filter((row: any) => {
    const searchLower = searchTerm.toLowerCase();
    return headers.some((header: string) => {
      const value = row[header]?.toString().toLowerCase() || '';
      return value.includes(searchLower);
    });
  });

  const visibleHeaders = columnOrder.filter((h: string) => visibleColumns[h]);
  const hasUnsavedChanges = Object.keys(editedCells).length > 0;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Sales Dashboard</CardTitle>
          <CardDescription>
            View and edit data from Store Database and Commission Tracker
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Auto-detected sheets info */}
          {(storeSheetId || trackerSheetId) && (
            <div className="bg-muted/50 p-4 rounded-md space-y-1 text-sm">
              <p className="font-medium mb-2">Connected Sheets:</p>
              {storeSheetId && (
                <p className="flex items-center gap-2">
                  <span className="text-green-600">✓</span>
                  Store Database: {sheets.find(s => s.id === storeSheetId)?.sheetName}
                </p>
              )}
              {trackerSheetId && (
                <p className="flex items-center gap-2">
                  <span className="text-green-600">✓</span>
                  Commission Tracker: {sheets.find(s => s.id === trackerSheetId)?.sheetName}
                </p>
              )}
              <p className="flex items-center gap-2 text-muted-foreground">
                <span className="text-green-600">✓</span>
                Joining by column: <span className="font-medium">link</span>
              </p>
            </div>
          )}
          
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
            <div className="border rounded-md">
              <ScrollArea className="h-[600px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {visibleHeaders.map((header: string) => (
                        <TableHead 
                          key={header} 
                          className="whitespace-nowrap relative group"
                          style={{ width: columnWidths[header] || 200 }}
                        >
                          <div className="flex items-center justify-between">
                            <span>
                              {header}
                              {editableColumns.includes(header) && (
                                <span className="ml-1 text-xs text-muted-foreground">✏️</span>
                              )}
                            </span>
                            <div
                              className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-primary/50 transition-colors"
                              onMouseDown={(e) => {
                                e.preventDefault();
                                const startX = e.clientX;
                                const startWidth = columnWidths[header] || 200;

                                const handleMouseMove = (moveEvent: MouseEvent) => {
                                  const diff = moveEvent.clientX - startX;
                                  handleColumnResize(header, startWidth + diff);
                                };

                                const handleMouseUp = () => {
                                  document.removeEventListener('mousemove', handleMouseMove);
                                  document.removeEventListener('mouseup', handleMouseUp);
                                };

                                document.addEventListener('mousemove', handleMouseMove);
                                document.addEventListener('mouseup', handleMouseUp);
                              }}
                            />
                          </div>
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredData.map((row: any, rowIdx: number) => {
                      const rowKey = row._storeRowIndex || row._trackerRowIndex || rowIdx;
                      return (
                        <TableRow key={rowKey} data-testid={`row-data-${rowIdx}`}>
                          {visibleHeaders.map((header: string) => {
                            const isEditable = editableColumns.includes(header);
                            const isTrackerColumn = trackerHeaders.includes(header);
                            const sheetId = isTrackerColumn ? trackerSheetId : storeSheetId;
                            const rowIndex = isTrackerColumn ? row._trackerRowIndex : row._storeRowIndex;
                            const cellKey = JSON.stringify({ rowIndex, column: header, sheetId });
                            const cellValue = editedCells[cellKey]?.value ?? row[header] ?? '';

                            return (
                              <TableCell 
                                key={header} 
                                className="whitespace-nowrap"
                                style={{ width: columnWidths[header] || 200 }}
                              >
                                {isEditable ? (
                                  <Input
                                    value={cellValue}
                                    onChange={(e) => handleCellEdit(row, header, e.target.value)}
                                    className="w-full"
                                    data-testid={`input-cell-${rowKey}-${header}`}
                                  />
                                ) : (
                                  <span data-testid={`text-cell-${rowKey}-${header}`}>{cellValue}</span>
                                )}
                              </TableCell>
                            );
                          })}
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </ScrollArea>
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
    </div>
  );
}
