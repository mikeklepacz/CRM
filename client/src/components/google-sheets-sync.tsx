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
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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

type ActiveSheet = {
  id: string;
  spreadsheetId: string;
  spreadsheetName: string;
  sheetName: string;
  uniqueIdentifierColumn: string;
  lastSyncedAt: string | null;
  syncStatus: string;
};

export function GoogleSheetsSync() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedSpreadsheet, setSelectedSpreadsheet] = useState("");
  const [selectedSheetName, setSelectedSheetName] = useState("");
  const [uniqueIdColumn, setUniqueIdColumn] = useState("link");

  // Fetch list of user's Google Sheets
  const { data: sheets = [] } = useQuery<GoogleSheet[]>({
    queryKey: ["/api/sheets/list"],
    retry: false,
  });

  // Fetch active sheet connection
  const { data: activeSheet, isLoading: activeSheetLoading } = useQuery<ActiveSheet | null>({
    queryKey: ["/api/sheets/active"],
  });

  // Fetch sheet info (tabs/worksheets)
  const { data: sheetInfo } = useQuery<SheetInfo>({
    queryKey: ["/api/sheets", selectedSpreadsheet, "info"],
    enabled: !!selectedSpreadsheet,
  });

  const connectMutation = useMutation({
    mutationFn: async (data: {
      spreadsheetId: string;
      spreadsheetName: string;
      sheetName: string;
      uniqueIdentifierColumn: string;
    }) => {
      const res = await apiRequest("POST", "/api/sheets/connect", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sheets/active"] });
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
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/sheets/disconnect", {});
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sheets/active"] });
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
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/sheets/sync/import", {});
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      queryClient.invalidateQueries({ queryKey: ["/api/sheets/active"] });
      toast({
        title: "Import Complete",
        description: `Imported ${data.created} new clients, updated ${data.updated} existing clients`,
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

  const exportMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/sheets/sync/export", {});
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/sheets/active"] });
      toast({
        title: "Export Complete",
        description: `Updated ${data.updated} rows in Google Sheet`,
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

  const bidirectionalMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/sheets/sync/bidirectional", {});
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      queryClient.invalidateQueries({ queryKey: ["/api/sheets/active"] });
      toast({
        title: "Bidirectional Sync Complete",
        description: `Imported: ${data.imported.created} new, ${data.imported.updated} updated`,
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
    const sheet = sheets.find(s => s.id === selectedSpreadsheet);
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
      uniqueIdentifierColumn: uniqueIdColumn,
    });
  };

  return (
    <div className="space-y-6">
      {activeSheet ? (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  Connected to Google Sheets
                </CardTitle>
                <CardDescription>Your CRM is synced with Google Sheets</CardDescription>
              </div>
              <Button
                variant="outline"
                onClick={() => disconnectMutation.mutate()}
                disabled={disconnectMutation.isPending}
                data-testid="button-disconnect-sheet"
              >
                <Unlink className="mr-2 h-4 w-4" />
                Disconnect
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium">Spreadsheet</Label>
                <p className="text-sm text-muted-foreground">{activeSheet.spreadsheetName}</p>
              </div>
              <div>
                <Label className="text-sm font-medium">Sheet/Tab</Label>
                <p className="text-sm text-muted-foreground">{activeSheet.sheetName}</p>
              </div>
              <div>
                <Label className="text-sm font-medium">Unique ID Column</Label>
                <p className="text-sm text-muted-foreground">{activeSheet.uniqueIdentifierColumn}</p>
              </div>
              <div>
                <Label className="text-sm font-medium">Last Synced</Label>
                <p className="text-sm text-muted-foreground">
                  {activeSheet.lastSyncedAt
                    ? new Date(activeSheet.lastSyncedAt).toLocaleString()
                    : "Never"}
                </p>
              </div>
            </div>

            <div className="pt-4 border-t">
              <h4 className="text-sm font-medium mb-3">Sync Options</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Button
                  onClick={() => importMutation.mutate()}
                  disabled={importMutation.isPending}
                  data-testid="button-import-from-sheet"
                  className="w-full"
                >
                  <Download className="mr-2 h-4 w-4" />
                  {importMutation.isPending ? "Importing..." : "Import from Sheet"}
                </Button>
                <Button
                  onClick={() => exportMutation.mutate()}
                  disabled={exportMutation.isPending}
                  variant="outline"
                  data-testid="button-export-to-sheet"
                  className="w-full"
                >
                  <Upload className="mr-2 h-4 w-4" />
                  {exportMutation.isPending ? "Exporting..." : "Export to Sheet"}
                </Button>
                <Button
                  onClick={() => bidirectionalMutation.mutate()}
                  disabled={bidirectionalMutation.isPending}
                  variant="outline"
                  data-testid="button-bidirectional-sync"
                  className="w-full"
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  {bidirectionalMutation.isPending ? "Syncing..." : "Bidirectional Sync"}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                <strong>Import:</strong> Bring data from Google Sheets → CRM<br />
                <strong>Export:</strong> Push CRM data → Google Sheets<br />
                <strong>Bidirectional:</strong> Sync both ways (recommended)
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-muted-foreground" />
              <CardTitle>Connect Google Sheets</CardTitle>
            </div>
            <CardDescription>Link your CRM to a Google Sheets spreadsheet for real-time sync</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="spreadsheet">Select Spreadsheet</Label>
              <Select value={selectedSpreadsheet} onValueChange={setSelectedSpreadsheet}>
                <SelectTrigger data-testid="select-spreadsheet">
                  <SelectValue placeholder="Choose a spreadsheet" />
                </SelectTrigger>
                <SelectContent>
                  {sheets.map((sheet) => (
                    <SelectItem key={sheet.id} value={sheet.id}>
                      {sheet.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedSpreadsheet && sheetInfo && (
              <div className="space-y-2">
                <Label htmlFor="sheet-name">Select Sheet/Tab</Label>
                <Select value={selectedSheetName} onValueChange={setSelectedSheetName}>
                  <SelectTrigger data-testid="select-sheet-tab">
                    <SelectValue placeholder="Choose a sheet/tab" />
                  </SelectTrigger>
                  <SelectContent>
                    {sheetInfo.sheets.map((sheet) => (
                      <SelectItem key={sheet.properties.sheetId} value={sheet.properties.title}>
                        {sheet.properties.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="unique-id">Unique Identifier Column</Label>
              <Input
                id="unique-id"
                value={uniqueIdColumn}
                onChange={(e) => setUniqueIdColumn(e.target.value)}
                placeholder="e.g., link, email, id"
                data-testid="input-unique-id-column"
              />
              <p className="text-xs text-muted-foreground">
                Column name used to match records (case-insensitive). For dispensaries, use "link".
              </p>
            </div>

            <Button
              onClick={handleConnect}
              disabled={!selectedSpreadsheet || !selectedSheetName || !uniqueIdColumn || connectMutation.isPending}
              className="w-full"
              data-testid="button-connect-sheet"
            >
              <Link className="mr-2 h-4 w-4" />
              {connectMutation.isPending ? "Connecting..." : "Connect Sheet"}
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>How It Works</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex gap-3">
            <FileSpreadsheet className="h-5 w-5 text-muted-foreground flex-shrink-0" />
            <div>
              <p className="font-medium">Real-Time Sync</p>
              <p className="text-muted-foreground">
                Connect any Google Sheet to your CRM. Data syncs automatically - changes in the sheet appear in the CRM and vice versa.
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <Download className="h-5 w-5 text-muted-foreground flex-shrink-0" />
            <div>
              <p className="font-medium">Unique Identifier</p>
              <p className="text-muted-foreground">
                Choose a column as your unique ID (like "link" for Leafly URLs). This prevents duplicates and ensures records match correctly.
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <RefreshCw className="h-5 w-5 text-muted-foreground flex-shrink-0" />
            <div>
              <p className="font-medium">Flexible Columns</p>
              <p className="text-muted-foreground">
                Your sheet columns become CRM fields automatically. Add new columns anytime - they'll sync on the next update.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
