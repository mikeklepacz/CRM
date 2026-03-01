import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertCircle, FileText, Loader2, Pencil, Trash2, Upload } from "lucide-react";
import { OpenAIFile } from "./types";
import { formatFileSize } from "./utils";
import { StatusBadge } from "./status-badge";

interface KnowledgeBaseCardProps {
  hasApiKey: boolean;
  filesLoading: boolean;
  files: OpenAIFile[];
  deletePending: boolean;
  onOpenUpload: () => void;
  onEditFile: (file: OpenAIFile) => void;
  onDeleteFile: (id: string, name: string) => void;
}

export const KnowledgeBaseCard = ({
  hasApiKey,
  filesLoading,
  files,
  deletePending,
  onOpenUpload,
  onEditFile,
  onDeleteFile,
}: KnowledgeBaseCardProps) => {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Knowledge Base
            </CardTitle>
            <CardDescription>
              Upload sales scripts, objection handlers, and product information
            </CardDescription>
          </div>
          <Button onClick={onOpenUpload} disabled={!hasApiKey} data-testid="button-upload-file">
            <Upload className="h-4 w-4 mr-2" />
            Upload File
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {!hasApiKey ? (
          <div className="flex items-center gap-2 p-4 border rounded-md bg-muted/50">
            <AlertCircle className="h-5 w-5 text-amber-600" />
            <span className="text-sm">Configure your API key first to upload files</span>
          </div>
        ) : filesLoading ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading files...
          </div>
        ) : files.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No files uploaded yet</p>
            <p className="text-sm mt-1">Upload sales scripts and resources to get started</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Filename</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Agent</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Size</TableHead>
                <TableHead>Uploaded</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {files.map((file) => (
                <TableRow key={file.id}>
                  <TableCell className="font-medium">{file.originalName}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{file.category}</Badge>
                  </TableCell>
                  <TableCell>
                    {file.agentName ? (
                      <Badge variant="outline">{file.agentName}</Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">All agents</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={file.processingStatus || "ready"} />
                  </TableCell>
                  <TableCell>{formatFileSize(file.fileSize)}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(file.uploadedAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onEditFile(file)}
                        data-testid={`button-edit-file-${file.id}`}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onDeleteFile(file.id, file.originalName)}
                        disabled={deletePending}
                        data-testid={`button-delete-file-${file.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};
