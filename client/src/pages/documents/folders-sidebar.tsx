import { FolderOpen, Loader2, Trash2 } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { DriveFolder } from "./types";

interface FoldersSidebarProps {
  folders: DriveFolder[] | undefined;
  foldersLoading: boolean;
  selectedFolderId: string | null;
  canManage: boolean;
  onSelectFolder: (id: string) => void;
  onDeleteFolder: (id: string) => void;
}

export function FoldersSidebar({ folders, foldersLoading, selectedFolderId, canManage, onSelectFolder, onDeleteFolder }: FoldersSidebarProps) {
  return (
    <Card className="col-span-3">
      <CardHeader>
        <CardTitle className="text-base">Folders</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {foldersLoading ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !folders || folders.length === 0 ? (
          <div className="p-6 text-center text-muted-foreground">
            <FolderOpen className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No folders configured</p>
            {canManage && <p className="text-xs mt-1">Click "Manage Folders" to add one</p>}
          </div>
        ) : (
          <div className="space-y-1 p-2">
            {folders.map((folder) => (
              <div key={folder.id} className="flex items-center gap-2">
                <Button variant={selectedFolderId === folder.id ? "secondary" : "ghost"} className="flex-1 justify-start" onClick={() => onSelectFolder(folder.id)} data-testid={`button-folder-${folder.name}`}>
                  <FolderOpen className="h-4 w-4 mr-2" />
                  {folder.name}
                </Button>
                {canManage && (
                  <Button size="icon" variant="ghost" onClick={() => onDeleteFolder(folder.id)} data-testid={`button-delete-folder-${folder.id}`}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
