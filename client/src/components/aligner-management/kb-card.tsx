import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertCircle, FileText, Info, Loader2, Save, Sparkles, Trash2, Upload } from "lucide-react";
import { AlignerAssistant, AlignerFile } from "./types";
import { formatFileSize } from "./utils";

interface KbCardProps {
  settingsHasApiKey: boolean;
  aligner?: AlignerAssistant;
  alignerFiles: AlignerFile[];
  localAssistantId: string;
  syncPending: boolean;
  updateAssistantPending: boolean;
  deletePending: boolean;
  onSyncKb: () => void;
  onOpenUpload: () => void;
  onAssistantIdChange: (value: string) => void;
  onSaveAssistantId: () => void;
  onDeleteFile: (fileId: string, filename: string) => void;
}

export function KbCard({
  settingsHasApiKey,
  aligner,
  alignerFiles,
  localAssistantId,
  syncPending,
  updateAssistantPending,
  deletePending,
  onSyncKb,
  onOpenUpload,
  onAssistantIdChange,
  onSaveAssistantId,
  onDeleteFile,
}: KbCardProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Aligner Knowledge Base
            </CardTitle>
            <CardDescription>
              Reference materials the Aligner uses when analyzing calls and proposing changes
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={onSyncKb}
              disabled={!settingsHasApiKey || !aligner?.assistantId || syncPending}
              variant="outline"
              data-testid="button-sync-kb-to-openai"
            >
              {syncPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Syncing...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Sync to OpenAI
                </>
              )}
            </Button>
            <Button onClick={onOpenUpload} disabled={!settingsHasApiKey} data-testid="button-upload-aligner-file">
              <Upload className="h-4 w-4 mr-2" />
              Upload File
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-4 p-4 border rounded-md bg-muted/30">
          <div className="space-y-2">
            <Label htmlFor="assistant-id">OpenAI Assistant ID</Label>
            <div className="flex items-center gap-2">
              <Input
                id="assistant-id"
                placeholder="asst_xxxxxxxxxxxxxxxx"
                value={localAssistantId}
                onChange={(e) => onAssistantIdChange(e.target.value)}
                className="font-mono"
                data-testid="input-aligner-assistant-id"
              />
              <Button
                onClick={onSaveAssistantId}
                disabled={updateAssistantPending || localAssistantId === (aligner?.assistantId || "")}
                data-testid="button-save-assistant-id"
              >
                {updateAssistantPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">Enter your OpenAI Assistant ID to connect this organization's Aligner</p>
          </div>
        </div>

        {aligner?.assistantId && (
          <div className="flex items-center gap-2 p-3 mb-4 border rounded-md bg-blue-50 dark:bg-blue-900/40 border-blue-200 dark:border-blue-700">
            <Info className="h-5 w-5 text-blue-600 dark:text-blue-300 flex-shrink-0" />
            <div className="text-sm text-blue-900 dark:text-blue-50">
              <strong>Connected to OpenAI:</strong> Click "Sync to OpenAI" to upload KB files to this assistant.
            </div>
          </div>
        )}

        {!settingsHasApiKey ? (
          <div className="flex items-center gap-2 p-4 border rounded-md bg-muted/50">
            <AlertCircle className="h-5 w-5 text-amber-600" />
            <span className="text-sm">Configure your OpenAI API key first in the OpenAI Management section</span>
          </div>
        ) : alignerFiles.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No files uploaded yet</p>
            <p className="text-sm mt-1">Upload call analysis guidelines, objection patterns, or best practices</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Filename</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Size</TableHead>
                <TableHead>Uploaded</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {alignerFiles.map((file) => (
                <TableRow key={file.id} data-testid={`row-aligner-file-${file.id}`}>
                  <TableCell className="font-medium">{file.filename}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{file.category || "general"}</Badge>
                  </TableCell>
                  <TableCell>{formatFileSize(file.fileSize || 0)}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {file.uploadedAt ? new Date(file.uploadedAt).toLocaleDateString() : "N/A"}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDeleteFile(file.id, file.filename)}
                      disabled={deletePending}
                      data-testid={`button-delete-aligner-file-${file.id}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
