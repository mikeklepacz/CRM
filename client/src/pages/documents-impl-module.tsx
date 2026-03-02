import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ShieldAlert } from "lucide-react";
import { useLocation } from "wouter";

import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useModuleAccess } from "@/hooks/useModuleAccess";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { canAccessAdminFeatures } from "@/lib/authUtils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DeleteFolderDialog } from "./documents/delete-folder-dialog";
import { FilesPanel } from "./documents/files-panel";
import { FolderManagementDialog } from "./documents/folder-management-dialog";
import { FoldersSidebar } from "./documents/folders-sidebar";
import { sortFiles } from "./documents/utils";
import type { DriveFile, DriveFolder, SortOption } from "./documents/types";

export default function Documents() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { isModuleEnabled, isLoading: moduleAccessLoading } = useModuleAccess();

  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [newFolderName, setNewFolderName] = useState("");
  const [newFolderUrl, setNewFolderUrl] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [folderToDelete, setFolderToDelete] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [sortOption, setSortOption] = useState<SortOption>("name-asc");

  const moduleEnabled = isModuleEnabled("docs");
  const canManage = canAccessAdminFeatures(user);

  const { data: folders, isLoading: foldersLoading } = useQuery<DriveFolder[]>({
    queryKey: ["/api/drive/folders"],
  });

  const selectedFolder = folders?.find((f) => f.id === selectedFolderId);

  const { data: files, isLoading: filesLoading } = useQuery<DriveFile[]>({
    queryKey: [`/api/drive/files/${selectedFolder?.folderId}`],
    enabled: !!selectedFolder?.folderId,
  });

  const sortedFiles = useMemo(() => sortFiles(files, sortOption), [files, sortOption]);

  const addFolderMutation = useMutation({
    mutationFn: async (data: { name: string; folderUrl: string }) => await apiRequest("POST", "/api/drive/folders", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/drive/folders"] });
      toast({ title: "Success", description: "Folder added successfully" });
      setNewFolderName("");
      setNewFolderUrl("");
      setIsAddDialogOpen(false);
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to add folder", variant: "destructive" });
    },
  });

  const deleteFolderMutation = useMutation({
    mutationFn: async (id: string) => await apiRequest("DELETE", `/api/drive/folders/${id}`),
    onSuccess: (_data, deletedId) => {
      queryClient.invalidateQueries({ queryKey: ["/api/drive/folders"] });
      toast({ title: "Success", description: "Folder removed successfully" });
      if (selectedFolderId === deletedId) {
        setSelectedFolderId(null);
      }
      setFolderToDelete(null);
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to remove folder", variant: "destructive" });
    },
  });

  const handleAddFolder = () => {
    if (!newFolderName.trim() || !newFolderUrl.trim()) {
      toast({ title: "Error", description: "Please provide both folder name and URL", variant: "destructive" });
      return;
    }
    addFolderMutation.mutate({ name: newFolderName.trim(), folderUrl: newFolderUrl.trim() });
  };

  if (!moduleAccessLoading && !moduleEnabled) {
    return (
      <div className="h-full overflow-auto p-6">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                <ShieldAlert className="h-12 w-12 mx-auto text-muted-foreground" />
                <h2 className="text-xl font-semibold">Module Not Available</h2>
                <p className="text-muted-foreground">
                  The Documents module is not enabled for your organization. Contact your administrator to enable this feature.
                </p>
                <Button onClick={() => setLocation("/")} data-testid="button-go-home">
                  Return to Dashboard
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 h-[calc(100vh-100px)]">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-semibold text-foreground">Documents</h2>
          <p className="text-muted-foreground">Browse files from your Google Drive folders</p>
        </div>

        <FolderManagementDialog
          canManage={canManage}
          open={isAddDialogOpen}
          folderName={newFolderName}
          folderUrl={newFolderUrl}
          isPending={addFolderMutation.isPending}
          onOpenChange={setIsAddDialogOpen}
          onFolderNameChange={setNewFolderName}
          onFolderUrlChange={setNewFolderUrl}
          onSubmit={handleAddFolder}
        />
      </div>

      <div className="grid grid-cols-12 gap-6 h-full">
        <FoldersSidebar
          folders={folders}
          foldersLoading={foldersLoading}
          selectedFolderId={selectedFolderId}
          canManage={canManage}
          onSelectFolder={setSelectedFolderId}
          onDeleteFolder={setFolderToDelete}
        />

        <FilesPanel
          selectedFolder={selectedFolder}
          files={files}
          filesLoading={filesLoading}
          sortedFiles={sortedFiles}
          viewMode={viewMode}
          sortOption={sortOption}
          onViewModeChange={setViewMode}
          onSortOptionChange={setSortOption}
        />
      </div>

      <DeleteFolderDialog
        folderToDelete={folderToDelete}
        onCancel={() => setFolderToDelete(null)}
        onConfirm={() => folderToDelete && deleteFolderMutation.mutate(folderToDelete)}
      />
    </div>
  );
}
