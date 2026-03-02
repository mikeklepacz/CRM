import { formatDistanceToNow, format } from "date-fns";
import { ArrowUpDown, Download, ExternalLink, FileIcon, FolderOpen, LayoutGrid, List, Loader2 } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatFileSize } from "./utils";
import type { DriveFile, DriveFolder, SortOption } from "./types";

interface FilesPanelProps {
  selectedFolder: DriveFolder | undefined;
  files: DriveFile[] | undefined;
  filesLoading: boolean;
  sortedFiles: DriveFile[];
  viewMode: "grid" | "list";
  sortOption: SortOption;
  onViewModeChange: (mode: "grid" | "list") => void;
  onSortOptionChange: (option: SortOption) => void;
}

export function FilesPanel({ selectedFolder, files, filesLoading, sortedFiles, viewMode, sortOption, onViewModeChange, onSortOptionChange }: FilesPanelProps) {
  return (
    <Card className="col-span-9">
      <CardContent className="p-6">
        {!selectedFolder ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <div className="text-center">
              <FolderOpen className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">Select a folder to view files</p>
              <p className="text-sm">Choose a folder from the list on the left</p>
            </div>
          </div>
        ) : filesLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : !files || files.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <div className="text-center">
              <FileIcon className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">No files in this folder</p>
              <p className="text-sm">This folder is currently empty</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">{selectedFolder?.name}</h3>
              <div className="flex items-center gap-2">
                <Select value={sortOption} onValueChange={(value) => onSortOptionChange(value as SortOption)}>
                  <SelectTrigger className="w-[180px]" data-testid="select-sort">
                    <ArrowUpDown className="h-4 w-4 mr-2" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="name-asc">Name (A-Z)</SelectItem>
                    <SelectItem value="name-desc">Name (Z-A)</SelectItem>
                    <SelectItem value="size-asc">Size (Smallest)</SelectItem>
                    <SelectItem value="size-desc">Size (Largest)</SelectItem>
                    <SelectItem value="date-asc">Date (Oldest)</SelectItem>
                    <SelectItem value="date-desc">Date (Newest)</SelectItem>
                  </SelectContent>
                </Select>
                <div className="flex items-center border rounded-md">
                  <Button variant={viewMode === "grid" ? "secondary" : "ghost"} size="sm" onClick={() => onViewModeChange("grid")} className="rounded-r-none" data-testid="button-view-grid">
                    <LayoutGrid className="h-4 w-4" />
                  </Button>
                  <Button variant={viewMode === "list" ? "secondary" : "ghost"} size="sm" onClick={() => onViewModeChange("list")} className="rounded-l-none" data-testid="button-view-list">
                    <List className="h-4 w-4" />
                  </Button>
                </div>
                <Button variant="outline" size="sm" onClick={() => window.open(`https://drive.google.com/drive/folders/${selectedFolder?.folderId}`, "_blank")} data-testid="button-open-drive">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open in Drive
                </Button>
              </div>
            </div>

            {viewMode === "grid" ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {sortedFiles.map((file) => (
                  <Card key={file.id} className="hover-elevate">
                    <CardContent className="p-3 space-y-3">
                      <div className="aspect-square rounded-md bg-muted flex items-center justify-center overflow-hidden cursor-pointer" onClick={() => window.open(file.webViewLink, "_blank")} data-testid={`file-thumbnail-${file.id}`}>
                        {file.thumbnailLink ? <img src={file.thumbnailLink} alt={file.name} className="w-full h-full object-cover" /> : <FileIcon className="h-12 w-12 text-muted-foreground" />}
                      </div>
                      <div className="space-y-1">
                        <p className="font-medium text-sm truncate" title={file.name} data-testid={`file-name-${file.id}`}>
                          {file.name}
                        </p>
                        <div className="text-xs text-muted-foreground space-y-0.5">
                          <div>{formatFileSize(file.size)}</div>
                          <div>{formatDistanceToNow(new Date(file.modifiedTime), { addSuffix: true })}</div>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button size="sm" variant="outline" className="flex-1" onClick={() => window.open(file.webViewLink, "_blank")} data-testid={`button-view-${file.id}`}>
                          <ExternalLink className="h-3 w-3 mr-1" />
                          View
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => window.open(file.webViewLink, "_blank")} title="Download via Drive" data-testid={`button-download-${file.id}`}>
                          <Download className="h-3 w-3" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead>Modified</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedFiles.map((file) => (
                    <TableRow key={file.id} className="hover-elevate">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded bg-muted flex items-center justify-center flex-shrink-0">
                            {file.thumbnailLink ? <img src={file.thumbnailLink} alt={file.name} className="h-10 w-10 rounded object-cover" /> : <FileIcon className="h-5 w-5 text-muted-foreground" />}
                          </div>
                          <span className="font-medium cursor-pointer hover:underline" onClick={() => window.open(file.webViewLink, "_blank")} data-testid={`file-name-${file.id}`}>
                            {file.name}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{formatFileSize(file.size)}</TableCell>
                      <TableCell className="text-muted-foreground">{format(new Date(file.modifiedTime), "MMM d, yyyy")}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button size="sm" variant="outline" onClick={() => window.open(file.webViewLink, "_blank")} data-testid={`button-view-${file.id}`}>
                            <ExternalLink className="h-3 w-3" />
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => window.open(file.webViewLink, "_blank")} title="Download via Drive" data-testid={`button-download-${file.id}`}>
                            <Download className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
