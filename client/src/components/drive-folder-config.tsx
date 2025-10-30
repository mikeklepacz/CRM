import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Trash2, FolderOpen, Plus } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

interface DriveFolder {
  id: string;
  category: string;
  folderId: string;
  folderName: string;
  createdAt: string;
  updatedAt: string;
}

export function DriveFolderConfig() {
  const { toast } = useToast();
  const [newCategory, setNewCategory] = useState("");
  const [newFolderId, setNewFolderId] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFolderId, setEditFolderId] = useState("");

  const { data: folders, isLoading } = useQuery<DriveFolder[]>({
    queryKey: ['/api/drive/folders'],
  });

  const createMutation = useMutation({
    mutationFn: async ({ category, folderId }: { category: string; folderId: string }) => {
      return await apiRequest('POST', '/api/drive/folders', { category, folderId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/drive/folders'] });
      toast({
        title: "Success",
        description: "Drive folder configured successfully",
      });
      setNewCategory("");
      setNewFolderId("");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to configure folder",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, folderId }: { id: string; folderId: string }) => {
      return await apiRequest('PUT', `/api/drive/folders/${id}`, { folderId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/drive/folders'] });
      toast({
        title: "Success",
        description: "Folder updated successfully",
      });
      setEditingId(null);
      setEditFolderId("");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update folder",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest('DELETE', `/api/drive/folders/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/drive/folders'] });
      toast({
        title: "Success",
        description: "Folder configuration deleted",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete folder",
        variant: "destructive",
      });
    },
  });

  const handleCreate = () => {
    if (!newCategory || !newFolderId) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }
    createMutation.mutate({ category: newCategory, folderId: newFolderId });
  };

  const handleUpdate = (id: string) => {
    if (!editFolderId) {
      toast({
        title: "Error",
        description: "Please enter a folder ID",
        variant: "destructive",
      });
      return;
    }
    updateMutation.mutate({ id, folderId: editFolderId });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Google Drive Assets Configuration</CardTitle>
          <CardDescription>
            Configure Google Drive folders for each category. Files will be organized by category (e.g., Pets, Cannabis).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="rounded-lg border p-4 space-y-4">
            <h3 className="font-medium text-sm">Add New Folder Configuration</h3>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select value={newCategory} onValueChange={setNewCategory}>
                  <SelectTrigger id="category" data-testid="select-category">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Pets">Pets</SelectItem>
                    <SelectItem value="Cannabis">Cannabis</SelectItem>
                    <SelectItem value="General">General</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="folderId">Google Drive Folder ID</Label>
                <Input
                  id="folderId"
                  placeholder="Enter folder ID from Drive URL"
                  value={newFolderId}
                  onChange={(e) => setNewFolderId(e.target.value)}
                  data-testid="input-folder-id"
                />
              </div>
              <div className="flex items-end">
                <Button
                  onClick={handleCreate}
                  disabled={createMutation.isPending}
                  className="w-full"
                  data-testid="button-add-folder"
                >
                  {createMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                  Add Folder
                </Button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              To get the folder ID: Open the folder in Google Drive, copy the ID from the URL (e.g., https://drive.google.com/drive/folders/<strong>FOLDER_ID_HERE</strong>)
            </p>
          </div>

          <div className="space-y-4">
            <h3 className="font-medium text-sm">Configured Folders</h3>
            {isLoading ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : !folders || folders.length === 0 ? (
              <div className="text-center p-8 text-muted-foreground">
                <FolderOpen className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No folders configured yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {folders.map((folder) => (
                  <Card key={folder.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center gap-2">
                            <FolderOpen className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{folder.category}</span>
                          </div>
                          <p className="text-sm text-muted-foreground">{folder.folderName}</p>
                          {editingId === folder.id ? (
                            <div className="flex gap-2 mt-2">
                              <Input
                                placeholder="New folder ID"
                                value={editFolderId}
                                onChange={(e) => setEditFolderId(e.target.value)}
                                className="max-w-xs"
                                data-testid={`input-edit-${folder.id}`}
                              />
                              <Button
                                size="sm"
                                onClick={() => handleUpdate(folder.id)}
                                disabled={updateMutation.isPending}
                                data-testid={`button-save-${folder.id}`}
                              >
                                {updateMutation.isPending ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  "Save"
                                )}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setEditingId(null);
                                  setEditFolderId("");
                                }}
                                data-testid={`button-cancel-${folder.id}`}
                              >
                                Cancel
                              </Button>
                            </div>
                          ) : (
                            <p className="text-xs font-mono text-muted-foreground">ID: {folder.folderId}</p>
                          )}
                        </div>
                        <div className="flex gap-2">
                          {editingId !== folder.id && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setEditingId(folder.id);
                                setEditFolderId(folder.folderId);
                              }}
                              data-testid={`button-edit-${folder.id}`}
                            >
                              Edit
                            </Button>
                          )}
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                size="sm"
                                variant="outline"
                                data-testid={`button-delete-${folder.id}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete folder configuration?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will only remove the configuration. The actual Google Drive folder and its files will not be affected.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deleteMutation.mutate(folder.id)}
                                  data-testid={`button-confirm-delete-${folder.id}`}
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
