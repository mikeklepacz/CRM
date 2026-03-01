import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FileSpreadsheet, Plus } from "lucide-react";

import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ConnectSheetForm } from "./google-sheets-sync/connect-sheet-form";
import { ConnectedSheetCard } from "./google-sheets-sync/connected-sheet-card";
import type { ConnectedSheet, GoogleSheet, SheetInfo } from "./google-sheets-sync/types";
import { formatDate } from "./google-sheets-sync/utils";

interface GoogleSheetsSyncProps {
  tenantId?: string;
}

export function GoogleSheetsSync({ tenantId }: GoogleSheetsSyncProps = {}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedSpreadsheet, setSelectedSpreadsheet] = useState("");
  const [selectedSheetName, setSelectedSheetName] = useState("");
  const [sheetPurpose, setSheetPurpose] = useState("clients");
  const [uniqueIdColumn, setUniqueIdColumn] = useState("link");

  const isSuperAdminMode = !!tenantId;
  const apiBase = isSuperAdminMode ? `/api/super-admin/tenants/${tenantId}/sheets` : "/api/sheets";

  const { data: availableSheets = [] } = useQuery<GoogleSheet[]>({
    queryKey: isSuperAdminMode ? [apiBase, "list"] : ["/api/sheets/list"],
    retry: false,
  });

  const { data: connectedSheetsData, isLoading: sheetsLoading } = useQuery<{ sheets: ConnectedSheet[] }>({
    queryKey: isSuperAdminMode ? [apiBase] : ["/api/sheets"],
  });

  const connectedSheets = connectedSheetsData?.sheets || [];

  const { data: sheetInfo } = useQuery<SheetInfo>({
    queryKey: isSuperAdminMode ? [apiBase, selectedSpreadsheet, "info"] : [`/api/sheets/${selectedSpreadsheet}/info`],
    enabled: !!selectedSpreadsheet,
  });

  const connectMutation = useMutation({
    mutationFn: async (data: { spreadsheetId: string; spreadsheetName: string; sheetName: string; sheetPurpose: string; uniqueIdentifierColumn: string }) => {
      const url = isSuperAdminMode ? `${apiBase}/connect` : "/api/sheets/connect";
      return await apiRequest("POST", url, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: isSuperAdminMode ? [apiBase] : ["/api/sheets"] });
      setShowAddForm(false);
      setSelectedSpreadsheet("");
      setSelectedSheetName("");
      setSheetPurpose("clients");
      setUniqueIdColumn("link");
      toast({ title: "Success", description: "Google Sheet connected successfully" });
    },
    onError: (error: Error) => toast({ title: "Error", description: error.message, variant: "destructive" }),
  });

  const disconnectMutation = useMutation({
    mutationFn: async (sheetId: string) => {
      const url = isSuperAdminMode ? `${apiBase}/${sheetId}/disconnect` : `/api/sheets/${sheetId}/disconnect`;
      return await apiRequest("POST", url, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: isSuperAdminMode ? [apiBase] : ["/api/sheets"] });
      toast({ title: "Success", description: "Google Sheet disconnected" });
    },
    onError: (error: Error) => toast({ title: "Error", description: error.message, variant: "destructive" }),
  });

  const importMutation = useMutation({
    mutationFn: async (sheetId: string) => {
      const url = isSuperAdminMode ? `${apiBase}/${sheetId}/sync/import` : `/api/sheets/${sheetId}/sync/import`;
      return await apiRequest("POST", url, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: isSuperAdminMode ? [apiBase] : ["/api/sheets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      toast({ title: "Import Complete", description: "Data imported from Google Sheets successfully" });
    },
    onError: (error: Error) => toast({ title: "Error", description: error.message, variant: "destructive" }),
  });

  const exportMutation = useMutation({
    mutationFn: async (sheetId: string) => {
      const url = isSuperAdminMode ? `${apiBase}/${sheetId}/sync/export` : `/api/sheets/${sheetId}/sync/export`;
      return await apiRequest("POST", url, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: isSuperAdminMode ? [apiBase] : ["/api/sheets"] });
      toast({ title: "Export Complete", description: "Data exported to Google Sheets successfully" });
    },
    onError: (error: Error) => toast({ title: "Error", description: error.message, variant: "destructive" }),
  });

  const bidirectionalSyncMutation = useMutation({
    mutationFn: async (sheetId: string) => {
      const url = isSuperAdminMode ? `${apiBase}/${sheetId}/sync/bidirectional` : `/api/sheets/${sheetId}/sync/bidirectional`;
      return await apiRequest("POST", url, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: isSuperAdminMode ? [apiBase] : ["/api/sheets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      toast({ title: "Sync Complete", description: "Bidirectional sync completed successfully" });
    },
    onError: (error: Error) => toast({ title: "Error", description: error.message, variant: "destructive" }),
  });

  const handleConnect = () => {
    const sheet = availableSheets.find((s) => s.id === selectedSpreadsheet);
    if (!sheet || !selectedSheetName || !uniqueIdColumn) {
      toast({ title: "Error", description: "Please fill in all fields", variant: "destructive" });
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
            <CardDescription>Connect and sync multiple Google Sheets with your CRM</CardDescription>
          </div>
          <Button onClick={() => setShowAddForm(!showAddForm)} size="sm" data-testid="button-add-sheet">
            <Plus className="mr-2 h-4 w-4" />
            Add Sheet
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {showAddForm && (
            <ConnectSheetForm
              availableSheets={availableSheets}
              selectedSpreadsheet={selectedSpreadsheet}
              selectedSheetName={selectedSheetName}
              sheetPurpose={sheetPurpose}
              uniqueIdColumn={uniqueIdColumn}
              sheetInfo={sheetInfo}
              isPending={connectMutation.isPending}
              onSelectedSpreadsheetChange={setSelectedSpreadsheet}
              onSelectedSheetNameChange={setSelectedSheetName}
              onSheetPurposeChange={setSheetPurpose}
              onUniqueIdColumnChange={setUniqueIdColumn}
              onConnect={handleConnect}
              onCancel={() => setShowAddForm(false)}
            />
          )}

          {connectedSheets.length === 0 && !showAddForm && (
            <div className="text-center py-8 text-muted-foreground">
              <FileSpreadsheet className="mx-auto h-12 w-12 mb-4 opacity-50" />
              <p>No Google Sheets connected yet</p>
              <p className="text-sm">Click "Add Sheet" to connect your first sheet</p>
            </div>
          )}

          {connectedSheets.map((sheet) => (
            <ConnectedSheetCard
              key={sheet.id}
              sheet={sheet}
              disconnectPending={disconnectMutation.isPending}
              importPending={importMutation.isPending}
              exportPending={exportMutation.isPending}
              syncPending={bidirectionalSyncMutation.isPending}
              onDisconnect={(id) => disconnectMutation.mutate(id)}
              onImport={(id) => {
                console.log("🔘 Import button clicked for sheet:", sheet.spreadsheetName, sheet.id);
                console.log("📊 importMutation.isPending:", importMutation.isPending);
                console.log("📊 importMutation.isError:", importMutation.isError);
                console.log("📊 importMutation.isSuccess:", importMutation.isSuccess);
                importMutation.mutate(id);
              }}
              onExport={(id) => exportMutation.mutate(id)}
              onSync={(id) => bidirectionalSyncMutation.mutate(id)}
              formatDate={formatDate}
            />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
