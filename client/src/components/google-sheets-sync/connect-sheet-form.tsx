import { Link } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { GoogleSheet, SheetInfo } from "./types";

interface ConnectSheetFormProps {
  availableSheets: GoogleSheet[];
  selectedSpreadsheet: string;
  selectedSheetName: string;
  sheetPurpose: string;
  uniqueIdColumn: string;
  sheetInfo: SheetInfo | undefined;
  isPending: boolean;
  onSelectedSpreadsheetChange: (value: string) => void;
  onSelectedSheetNameChange: (value: string) => void;
  onSheetPurposeChange: (value: string) => void;
  onUniqueIdColumnChange: (value: string) => void;
  onConnect: () => void;
  onCancel: () => void;
}

export function ConnectSheetForm({
  availableSheets,
  selectedSpreadsheet,
  selectedSheetName,
  sheetPurpose,
  uniqueIdColumn,
  sheetInfo,
  isPending,
  onSelectedSpreadsheetChange,
  onSelectedSheetNameChange,
  onSheetPurposeChange,
  onUniqueIdColumnChange,
  onConnect,
  onCancel,
}: ConnectSheetFormProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Connect New Sheet</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="spreadsheet-select">Select Spreadsheet</Label>
          <Select value={selectedSpreadsheet} onValueChange={onSelectedSpreadsheetChange}>
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
            <Select value={selectedSheetName} onValueChange={onSelectedSheetNameChange}>
              <SelectTrigger id="sheet-name-select" data-testid="select-sheet-name">
                <SelectValue placeholder="Choose a tab" />
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
          <Label htmlFor="purpose-select">Sheet Purpose</Label>
          <Select value={sheetPurpose} onValueChange={onSheetPurposeChange}>
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
          <Input id="unique-id" value={uniqueIdColumn} onChange={(e) => onUniqueIdColumnChange(e.target.value)} placeholder="e.g., link, email, company" data-testid="input-unique-id" />
          <p className="text-xs text-muted-foreground">Column name to use as unique identifier for matching records</p>
        </div>

        <div className="flex gap-2">
          <Button
            onClick={onConnect}
            disabled={isPending || !selectedSpreadsheet || !selectedSheetName || !uniqueIdColumn}
            data-testid="button-connect-sheet"
            className="flex-1"
          >
            <Link className="mr-2 h-4 w-4" />
            {isPending ? "Connecting..." : "Connect Sheet"}
          </Button>
          <Button variant="outline" onClick={onCancel} data-testid="button-cancel-connect">
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
