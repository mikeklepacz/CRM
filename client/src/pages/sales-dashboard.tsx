import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileSpreadsheet, Settings, Search, RefreshCw } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

type ConnectedSheet = {
  id: string;
  spreadsheetName: string;
  sheetName: string;
  sheetPurpose: string;
};

type SheetData = {
  headers: string[];
  data: Record<string, any>[];
  sheetInfo: {
    id: string;
    spreadsheetName: string;
    sheetName: string;
    sheetPurpose: string;
  };
};

export default function SalesDashboard() {
  const [selectedSheetId, setSelectedSheetId] = useState<string>("");
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>({});
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch all connected sheets
  const { data: connectedSheetsData } = useQuery<{ sheets: ConnectedSheet[] }>({
    queryKey: ["/api/sheets"],
  });

  const connectedSheets = connectedSheetsData?.sheets || [];

  // Fetch sheet data when a sheet is selected
  const { data: sheetData, isLoading, refetch } = useQuery<SheetData>({
    queryKey: [`/api/sheets/${selectedSheetId}/data`],
    enabled: !!selectedSheetId,
  });

  const headers = sheetData?.headers || [];
  const data = sheetData?.data || [];

  // Initialize all columns as visible when headers change
  useEffect(() => {
    if (headers.length > 0) {
      const initialVisible: Record<string, boolean> = {};
      headers.forEach(header => {
        initialVisible[header] = true;
      });
      setVisibleColumns(initialVisible);
    }
  }, [selectedSheetId, headers.length]); // Reset when sheet changes

  const toggleColumn = (column: string) => {
    setVisibleColumns(prev => ({
      ...prev,
      [column]: !prev[column]
    }));
  };

  const filteredData = data.filter(row => {
    if (!searchQuery) return true;
    return Object.values(row).some(value => 
      String(value).toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const visibleHeaders = headers.filter(h => visibleColumns[h] !== false);
  const visibleColumnCount = visibleHeaders.length;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Sales Dashboard</h1>
        <p className="text-muted-foreground">
          View and analyze your Google Sheets data in real-time
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Select Data Source</CardTitle>
          <CardDescription>Choose a connected Google Sheet to view</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="sheet-select">Connected Sheets</Label>
            <Select
              value={selectedSheetId}
              onValueChange={setSelectedSheetId}
            >
              <SelectTrigger id="sheet-select" data-testid="select-data-source">
                <SelectValue placeholder="Select a sheet..." />
              </SelectTrigger>
              <SelectContent>
                {connectedSheets.map((sheet) => (
                  <SelectItem key={sheet.id} value={sheet.id}>
                    <div className="flex items-center gap-2">
                      <FileSpreadsheet className="h-4 w-4" />
                      {sheet.spreadsheetName} - {sheet.sheetName}
                      <Badge variant="secondary" className="ml-2">
                        {sheet.sheetPurpose}
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedSheetId && (
            <div className="flex items-center gap-2">
              <Button
                onClick={() => refetch()}
                variant="outline"
                size="sm"
                data-testid="button-refresh-data"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh Data
              </Button>
              {sheetData && (
                <span className="text-sm text-muted-foreground">
                  {filteredData.length} rows
                </span>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {selectedSheetId && sheetData && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-4">
              <div>
                <CardTitle>
                  {sheetData.sheetInfo.spreadsheetName} - {sheetData.sheetInfo.sheetName}
                </CardTitle>
                <CardDescription>
                  {visibleColumnCount} of {headers.length} columns visible
                </CardDescription>
              </div>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" data-testid="button-column-settings">
                    <Settings className="mr-2 h-4 w-4" />
                    Columns
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80" align="end">
                  <div className="space-y-4">
                    <h4 className="font-medium">Show/Hide Columns</h4>
                    <ScrollArea className="h-[300px]">
                      <div className="space-y-2">
                        {headers.map((header) => (
                          <div key={header} className="flex items-center space-x-2">
                            <Checkbox
                              id={`col-${header}`}
                              checked={visibleColumns[header] !== false}
                              onCheckedChange={() => toggleColumn(header)}
                              data-testid={`checkbox-column-${header}`}
                            />
                            <label
                              htmlFor={`col-${header}`}
                              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                            >
                              {header}
                            </label>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search across all columns..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
                data-testid="input-search"
              />
            </div>

            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                Loading data...
              </div>
            ) : filteredData.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No data found
              </div>
            ) : (
              <ScrollArea className="h-[600px] rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {visibleHeaders.map((header) => (
                        <TableHead key={header} className="whitespace-nowrap">
                          {header}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredData.map((row, index) => (
                      <TableRow key={index} data-testid={`row-data-${index}`}>
                        {visibleHeaders.map((header) => (
                          <TableCell key={header} className="max-w-xs truncate">
                            {row[header]}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      )}

      {!selectedSheetId && (
        <Card>
          <CardContent className="py-12">
            <div className="text-center space-y-4">
              <FileSpreadsheet className="mx-auto h-16 w-16 text-muted-foreground opacity-50" />
              <div>
                <h3 className="font-semibold text-lg">No Sheet Selected</h3>
                <p className="text-muted-foreground">
                  Select a Google Sheet above to view its data
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
