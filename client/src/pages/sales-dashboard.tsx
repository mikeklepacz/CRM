import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { RefreshCw, Settings2, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

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
  const [joinColumn, setJoinColumn] = useState<string>("name");
  const [searchTerm, setSearchTerm] = useState("");
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>({});
  const [editedCells, setEditedCells] = useState<Record<string, { rowIndex: number; column: string; value: string; sheetId: string }>>({});

  // Fetch available sheets
  const { data: sheetsData } = useQuery<{ sheets: GoogleSheet[] }>({
    queryKey: ['/api/sheets'],
  });

  const sheets = sheetsData?.sheets || [];
  const storeSheets = sheets.filter(s => s.sheetPurpose === 'store_database');
  const trackerSheets = sheets.filter(s => s.sheetPurpose === 'commission_tracker');

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

  // Initialize visible columns
  useEffect(() => {
    if (headers.length > 0) {
      const initialVisible: Record<string, boolean> = {};
      headers.forEach((header: string) => {
        initialVisible[header] = true;
      });
      setVisibleColumns(initialVisible);
    }
  }, [headers.length, storeSheetId, trackerSheetId]);


  const toggleColumn = (column: string) => {
    setVisibleColumns(prev => ({
      ...prev,
      [column]: !prev[column],
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

  const visibleHeaders = headers.filter((h: string) => visibleColumns[h]);
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
          {/* Sheet Selection */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="store-sheet">Store Database Sheet</Label>
              <Select value={storeSheetId} onValueChange={setStoreSheetId}>
                <SelectTrigger id="store-sheet" data-testid="select-store-sheet">
                  <SelectValue placeholder="Select store sheet" />
                </SelectTrigger>
                <SelectContent>
                  {storeSheets.map((sheet) => (
                    <SelectItem key={sheet.id} value={sheet.id}>
                      {sheet.spreadsheetName} - {sheet.sheetName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tracker-sheet">Commission Tracker Sheet</Label>
              <Select value={trackerSheetId} onValueChange={setTrackerSheetId}>
                <SelectTrigger id="tracker-sheet" data-testid="select-tracker-sheet">
                  <SelectValue placeholder="Select tracker sheet" />
                </SelectTrigger>
                <SelectContent>
                  {trackerSheets.map((sheet) => (
                    <SelectItem key={sheet.id} value={sheet.id}>
                      {sheet.spreadsheetName} - {sheet.sheetName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="join-column">Join Column</Label>
              <Input
                id="join-column"
                value={joinColumn}
                onChange={(e) => setJoinColumn(e.target.value)}
                placeholder="e.g., name, link"
                data-testid="input-join-column"
              />
            </div>
          </div>

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
                  <PopoverContent className="w-80">
                    <div className="space-y-2">
                      <h4 className="font-medium">Show/Hide Columns</h4>
                      <ScrollArea className="h-72">
                        <div className="space-y-2">
                          {headers.map((header: string) => (
                            <div key={header} className="flex items-center space-x-2">
                              <Checkbox
                                id={`col-${header}`}
                                checked={visibleColumns[header]}
                                onCheckedChange={() => toggleColumn(header)}
                                data-testid={`checkbox-column-${header}`}
                              />
                              <Label 
                                htmlFor={`col-${header}`} 
                                className="text-sm cursor-pointer"
                              >
                                {header}
                                {editableColumns.includes(header) && (
                                  <span className="ml-2 text-xs text-muted-foreground">(editable)</span>
                                )}
                              </Label>
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
                        <TableHead key={header} className="whitespace-nowrap">
                          {header}
                          {editableColumns.includes(header) && (
                            <span className="ml-1 text-xs text-muted-foreground">✏️</span>
                          )}
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
                              <TableCell key={header} className="whitespace-nowrap">
                                {isEditable ? (
                                  <Input
                                    value={cellValue}
                                    onChange={(e) => handleCellEdit(row, header, e.target.value)}
                                    className="min-w-[150px]"
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
