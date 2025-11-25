import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
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
import { useToast } from "@/hooks/use-toast";
import {
  FileSpreadsheet,
  Download,
  Upload,
  RefreshCw,
  Link,
  Unlink,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

type GoogleSheet = {
  id: string;
  name: string;
  modifiedTime: string;
};

type SheetInfo = {
  properties: {
    title: string;
  };
  sheets: Array<{
    properties: {
      title: string;
      sheetId: number;
    };
  }>;
};

type ConnectedSheet = {
  id: string;
  spreadsheetId: string;
  spreadsheetName: string;
  sheetName: string;
  sheetPurpose: string;
  uniqueIdentifierColumn: string;
  lastSyncedAt: string | null;
  syncStatus: string;
  createdAt: string;
};

export function GoogleSheetsSync() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedSpreadsheet, setSelectedSpreadsheet] = useState("");
  const [selectedSheetName, setSelectedSheetName] = useState("");
  const [sheetPurpose, setSheetPurpose] = useState("clients");
  const [uniqueIdColumn, setUniqueIdColumn] = useState("link");

  // Fetch list of user's Google Sheets from Drive
  const { data: availableSheets = [] } = useQuery<GoogleSheet[]>({
    queryKey: ["/api/sheets/list"],
    retry: false,
  });

  // Fetch all connected sheets
  const { data: connectedSheetsData, isLoading: sheetsLoading } = useQuery<{ sheets: ConnectedSheet[] }>({
    queryKey: ["/api/sheets"],
  });

  const connectedSheets = connectedSheetsData?.sheets || [];

  // Fetch sheet info (tabs/worksheets) for selected spreadsheet
  const { data: sheetInfo } = useQuery<SheetInfo>({
    queryKey: [`/api/sheets/${selectedSpreadsheet}/info`],
    enabled: !!selectedSpreadsheet,
  });

  const connectMutation = useMutation({
    mutationFn: async (data: {
      spreadsheetId: string;
      spreadsheetName: string;
      sheetName: string;
      sheetPurpose: string;
      uniqueIdentifierColumn: string;
    }) => {
      return await apiRequest("POST", "/api/sheets/connect", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sheets"] });
      setShowAddForm(false);
      setSelectedSpreadsheet("");
      setSelectedSheetName("");
      setSheetPurpose("clients");
      setUniqueIdColumn("link");
      toast({
        title: "Success",
        description: "Google Sheet connected successfully",
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

  const disconnectMutation = useMutation({
    mutationFn: async (sheetId: string) => {
      return await apiRequest("POST", `/api/sheets/${sheetId}/disconnect`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sheets"] });
      toast({
        title: "Success",
        description: "Google Sheet disconnected",
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

  const importMutation = useMutation({
    mutationFn: async (sheetId: string) => {
      const result = await apiRequest("POST", `/api/sheets/${sheetId}/sync/import`, {});
      return result;
    },
    onSuccess: (data) => {
      try {
        queryClient.invalidateQueries({ queryKey: ["/api/sheets"] });
        queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
        toast({
          title: "Import Complete",
          description: "Data imported from Google Sheets successfully",
        });
      } catch (error) {
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const exportMutation = useMutation({
    mutationFn: async (sheetId: string) => {
      return await apiRequest("POST", `/api/sheets/${sheetId}/sync/export`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sheets"] });
      toast({
        title: "Export Complete",
        description: "Data exported to Google Sheets successfully",
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

  const bidirectionalSyncMutation = useMutation({
    mutationFn: async (sheetId: string) => {
      return await apiRequest("POST", `/api/sheets/${sheetId}/sync/bidirectional`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sheets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      toast({
        title: "Sync Complete",
        description: "Bidirectional sync completed successfully",
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

  const handleConnect = () => {
    const sheet = availableSheets.find(s => s.id === selectedSpreadsheet);
    if (!sheet || !selectedSheetName || !uniqueIdColumn) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    connectMutation.mutate({
      spreadsheetId: selectedSpreadsheet,
      spreadsheetName: sheet.name,
      sheetName: selectedSheetName,
      sheetPurpose,
      uniqueIdentifierColumn: uniqueIdColumn,
    });
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Never";
    return new Date(dateString).toLocaleString();
  };

  if (sheetsLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Google Sheets Integration</CardTitle>
          <CardDescription>Loading...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-2">
          <div>
            <CardTitle>Google Sheets Connections</CardTitle>
            <CardDescription>
              Connect and sync multiple Google Sheets with your CRM
            </CardDescription>
          </div>
          <Button
            onClick={() => setShowAddForm(!showAddForm)}
            size="sm"
            data-testid="button-add-sheet"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Sheet
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {showAddForm && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Connect New Sheet</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="spreadsheet-select">Select Spreadsheet</Label>
                  <Select
                    value={selectedSpreadsheet}
                    onValueChange={setSelectedSpreadsheet}
                  >
                    <SelectTrigger id="spreadsheet-select" data-testid="select-spreadsheet">
                      <SelectValue placeholder="Choose a spreadsheet" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableSheets.map((sheet) => (
                        <SelectItem key={sheet.id} value={sheet.id}>
                          {sheet.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedSpreadsheet && sheetInfo && (
                  <div className="space-y-2">
                    <Label htmlFor="sheet-name-select">Select Tab/Worksheet</Label>
                    <Select
                      value={selectedSheetName}
                      onValueChange={setSelectedSheetName}
                    >
                      <SelectTrigger id="sheet-name-select" data-testid="select-sheet-name">
                        <SelectValue placeholder="Choose a tab" />
                      </SelectTrigger>
                      <SelectContent>
                        {sheetInfo.sheets.map((sheet) => (
                          <SelectItem
                            key={sheet.properties.sheetId}
                            value={sheet.properties.title}
                          >
                            {sheet.properties.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="purpose-select">Sheet Purpose</Label>
                  <Select
                    value={sheetPurpose}
                    onValueChange={setSheetPurpose}
                  >
                    <SelectTrigger id="purpose-select" data-testid="select-purpose">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="clients">Client Data</SelectItem>
                      <SelectItem value="commissions">Commission Tracking</SelectItem>
                      <SelectItem value="custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="unique-id">Unique Identifier Column</Label>
                  <Input
                    id="unique-id"
                    value={uniqueIdColumn}
                    onChange={(e) => setUniqueIdColumn(e.target.value)}
                    placeholder="e.g., link, email, company"
                    data-testid="input-unique-id"
                  />
                  <p className="text-xs text-muted-foreground">
                    Column name to use as unique identifier for matching records
                  </p>
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={handleConnect}
                    disabled={
                      connectMutation.isPending ||
                      !selectedSpreadsheet ||
                      !selectedSheetName ||
                      !uniqueIdColumn
                    }
                    data-testid="button-connect-sheet"
                    className="flex-1"
                  >
                    <Link className="mr-2 h-4 w-4" />
                    {connectMutation.isPending ? "Connecting..." : "Connect Sheet"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowAddForm(false)}
                    data-testid="button-cancel-connect"
                  >
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {connectedSheets.length === 0 && !showAddForm && (
            <div className="text-center py-8 text-muted-foreground">
              <FileSpreadsheet className="mx-auto h-12 w-12 mb-4 opacity-50" />
              <p>No Google Sheets connected yet</p>
              <p className="text-sm">Click "Add Sheet" to connect your first sheet</p>
            </div>
          )}

          {connectedSheets.map((sheet) => (
            <Card key={sheet.id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <CardTitle className="text-base flex items-center gap-2">
                      <FileSpreadsheet className="h-4 w-4" />
                      {sheet.spreadsheetName}
                    </CardTitle>
                    <CardDescription className="mt-1">
                      Tab: {sheet.sheetName} • Purpose: {sheet.sheetPurpose}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={sheet.syncStatus === 'active' ? 'default' : 'secondary'}>
                      {sheet.syncStatus}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => disconnectMutation.mutate(sheet.id)}
                      disabled={disconnectMutation.isPending}
                      data-testid={`button-disconnect-${sheet.id}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-sm text-muted-foreground">
                  <p>Unique ID: {sheet.uniqueIdentifierColumn}</p>
                  <p>Last synced: {formatDate(sheet.lastSyncedAt)}</p>
                </div>

                <Separator />

                <div className="grid grid-cols-3 gap-2">
                  <Button
                    onClick={() => {
                      importMutation.mutate(sheet.id);
                    }}
                    disabled={importMutation.isPending}
                    variant="outline"
                    size="sm"
                    data-testid={`button-import-${sheet.id}`}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    {importMutation.isPending ? "Importing..." : "Import"}
                  </Button>
                  <Button
                    onClick={() => exportMutation.mutate(sheet.id)}
                    disabled={exportMutation.isPending}
                    variant="outline"
                    size="sm"
                    data-testid={`button-export-${sheet.id}`}
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    Export
                  </Button>
                  <Button
                    onClick={() => bidirectionalSyncMutation.mutate(sheet.id)}
                    disabled={bidirectionalSyncMutation.isPending}
                    variant="default"
                    size="sm"
                    data-testid={`button-sync-${sheet.id}`}
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Sync Both
                  </Button>
                </div>

                <p className="text-xs text-muted-foreground">
                  <strong>Import:</strong> Google Sheets → CRM • 
                  <strong> Export:</strong> CRM → Google Sheets • 
                  <strong> Sync Both:</strong> Bidirectional sync (recommended)
                </p>
              </CardContent>
            </Card>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
