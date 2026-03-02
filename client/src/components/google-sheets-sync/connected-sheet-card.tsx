import { Download, FileSpreadsheet, RefreshCw, Trash2, Upload } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { ConnectedSheet } from "./types";

interface ConnectedSheetCardProps {
  sheet: ConnectedSheet;
  disconnectPending: boolean;
  importPending: boolean;
  exportPending: boolean;
  syncPending: boolean;
  onDisconnect: (id: string) => void;
  onImport: (id: string) => void;
  onExport: (id: string) => void;
  onSync: (id: string) => void;
  formatDate: (dateString: string | null) => string;
}

export function ConnectedSheetCard({
  sheet,
  disconnectPending,
  importPending,
  exportPending,
  syncPending,
  onDisconnect,
  onImport,
  onExport,
  onSync,
  formatDate,
}: ConnectedSheetCardProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <CardTitle className="text-base flex items-center gap-2">
              <FileSpreadsheet className="h-4 w-4" />
              {sheet.spreadsheetName}
            </CardTitle>
            <CardDescription className="mt-1">Tab: {sheet.sheetName} • Purpose: {sheet.sheetPurpose}</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={sheet.syncStatus === "active" ? "default" : "secondary"}>{sheet.syncStatus}</Badge>
            <Button variant="ghost" size="icon" onClick={() => onDisconnect(sheet.id)} disabled={disconnectPending} data-testid={`button-disconnect-${sheet.id}`}>
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
          <Button onClick={() => onImport(sheet.id)} disabled={importPending} variant="outline" size="sm" data-testid={`button-import-${sheet.id}`}>
            <Download className="mr-2 h-4 w-4" />
            {importPending ? "Importing..." : "Import"}
          </Button>
          <Button onClick={() => onExport(sheet.id)} disabled={exportPending} variant="outline" size="sm" data-testid={`button-export-${sheet.id}`}>
            <Upload className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button onClick={() => onSync(sheet.id)} disabled={syncPending} variant="default" size="sm" data-testid={`button-sync-${sheet.id}`}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Sync Both
          </Button>
        </div>

        <p className="text-xs text-muted-foreground">
          <strong>Import:</strong> Google Sheets → CRM • <strong> Export:</strong> CRM → Google Sheets • <strong> Sync Both:</strong> Bidirectional sync (recommended)
        </p>
      </CardContent>
    </Card>
  );
}
