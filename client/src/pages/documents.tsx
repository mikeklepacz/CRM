import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, FileIcon, Download, FolderOpen, Trash2, ExternalLink, Settings, List, LayoutGrid, ArrowUpDown } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { useAuth } from "@/hooks/useAuth";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size: string;
  modifiedTime: string;
  webViewLink: string;
  iconLink?: string;
  thumbnailLink?: string;
}

interface DriveFolder {
  id: string;
  name: string;
  folderId: string;
  createdBy: string;
}

type SortOption = 'name-asc' | 'name-desc' | 'size-asc' | 'size-desc' | 'date-asc' | 'date-desc';

export default function Documents() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [newFolderName, setNewFolderName] = useState("");
  const [newFolderUrl, setNewFolderUrl] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [folderToDelete, setFolderToDelete] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortOption, setSortOption] = useState<SortOption>('name-asc');

  const { data: folders, isLoading: foldersLoading } = useQuery<DriveFolder[]>({
    queryKey: ['/api/drive/folders'],
  });

  const selectedFolder = folders?.find(f => f.id === selectedFolderId);

  const { data: files, isLoading: filesLoading } = useQuery<DriveFile[]>({
    queryKey: [`/api/drive/files/${selectedFolder?.folderId}`],
    enabled: !!selectedFolder?.folderId,
  });

  const sortedFiles = useMemo(() => {
    if (!files) return [];
    
    const sorted = [...files];
    
    switch (sortOption) {
      case 'name-asc':
        return sorted.sort((a, b) => a.name.localeCompare(b.name));
      case 'name-desc':
        return sorted.sort((a, b) => b.name.localeCompare(a.name));
      case 'size-asc':
        return sorted.sort((a, b) => parseInt(a.size || '0') - parseInt(b.size || '0'));
      case 'size-desc':
        return sorted.sort((a, b) => parseInt(b.size || '0') - parseInt(a.size || '0'));
      case 'date-asc':
        return sorted.sort((a, b) => new Date(a.modifiedTime).getTime() - new Date(b.modifiedTime).getTime());
      case 'date-desc':
        return sorted.sort((a, b) => new Date(b.modifiedTime).getTime() - new Date(a.modifiedTime).getTime());
      default:
        return sorted;
    }
  }, [files, sortOption]);

  const addFolderMutation = useMutation({
    mutationFn: async (data: { name: string; folderUrl: string }) => {
      return await apiRequest('POST', '/api/drive/folders', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/drive/folders'] });
      toast({
        title: "Success",
        description: "Folder added successfully",
      });
      setNewFolderName("");
      setNewFolderUrl("");
      setIsAddDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add folder",
        variant: "destructive",
      });
    },
  });

  const deleteFolderMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest('DELETE', `/api/drive/folders/${id}`);
    },
    onSuccess: (_data, deletedId) => {
      queryClient.invalidateQueries({ queryKey: ['/api/drive/folders'] });
      toast({
        title: "Success",
        description: "Folder removed successfully",
      });
      if (selectedFolderId === deletedId) {
        setSelectedFolderId(null);
      }
      setFolderToDelete(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to remove folder",
        variant: "destructive",
      });
    },
  });

  const handleAddFolder = () => {
    if (!newFolderName.trim() || !newFolderUrl.trim()) {
      toast({
        title: "Error",
        description: "Please provide both folder name and URL",
        variant: "destructive",
      });
      return;
    }
    addFolderMutation.mutate({ name: newFolderName.trim(), folderUrl: newFolderUrl.trim() });
  };

  const formatFileSize = (bytes: string) => {
    const size = parseInt(bytes);
    if (isNaN(size)) return 'Unknown';
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    if (size < 1024 * 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} MB`;
    return `${(size / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  };

  return (
    <div className="container mx-auto px-4 py-6 h-[calc(100vh-100px)]">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-semibold text-foreground">Documents</h2>
          <p className="text-muted-foreground">Browse files from your Google Drive folders</p>
        </div>
        {user?.role === 'admin' && (
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-folder">
                <Settings className="h-4 w-4 mr-2" />
                Manage Folders
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Drive Folder</DialogTitle>
                <DialogDescription>
                  Paste the full Google Drive folder URL and give it a name
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="folder-name">Folder Name</Label>
                  <Input
                    id="folder-name"
                    placeholder="e.g., Cannabis, Pets"
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    data-testid="input-folder-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="folder-url">Google Drive Folder URL</Label>
                  <Input
                    id="folder-url"
                    placeholder="https://drive.google.com/drive/folders/..."
                    value={newFolderUrl}
                    onChange={(e) => setNewFolderUrl(e.target.value)}
                    data-testid="input-folder-url"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  onClick={handleAddFolder}
                  disabled={addFolderMutation.isPending}
                  data-testid="button-submit-folder"
                >
                  {addFolderMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Add Folder
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="grid grid-cols-12 gap-6 h-full">
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
                {user?.role === 'admin' && (
                  <p className="text-xs mt-1">Click "Manage Folders" to add one</p>
                )}
              </div>
            ) : (
              <div className="space-y-1 p-2">
                {folders.map((folder) => (
                  <div key={folder.id} className="flex items-center gap-2">
                    <Button
                      variant={selectedFolderId === folder.id ? "secondary" : "ghost"}
                      className="flex-1 justify-start"
                      onClick={() => setSelectedFolderId(folder.id)}
                      data-testid={`button-folder-${folder.name}`}
                    >
                      <FolderOpen className="h-4 w-4 mr-2" />
                      {folder.name}
                    </Button>
                    {user?.role === 'admin' && (
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setFolderToDelete(folder.id)}
                        data-testid={`button-delete-folder-${folder.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

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
                    <Select value={sortOption} onValueChange={(value) => setSortOption(value as SortOption)}>
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
                      <Button
                        variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                        size="sm"
                        onClick={() => setViewMode('grid')}
                        className="rounded-r-none"
                        data-testid="button-view-grid"
                      >
                        <LayoutGrid className="h-4 w-4" />
                      </Button>
                      <Button
                        variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                        size="sm"
                        onClick={() => setViewMode('list')}
                        className="rounded-l-none"
                        data-testid="button-view-list"
                      >
                        <List className="h-4 w-4" />
                      </Button>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(`https://drive.google.com/drive/folders/${selectedFolder?.folderId}`, '_blank')}
                      data-testid="button-open-drive"
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Open in Drive
                    </Button>
                  </div>
                </div>

                {viewMode === 'grid' ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {sortedFiles.map((file) => (
                      <Card key={file.id} className="hover-elevate">
                        <CardContent className="p-3 space-y-3">
                          <div
                            className="aspect-square rounded-md bg-muted flex items-center justify-center overflow-hidden cursor-pointer"
                            onClick={() => window.open(file.webViewLink, '_blank')}
                            data-testid={`file-thumbnail-${file.id}`}
                          >
                            {file.thumbnailLink ? (
                              <img
                                src={file.thumbnailLink}
                                alt={file.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <FileIcon className="h-12 w-12 text-muted-foreground" />
                            )}
                          </div>
                          <div className="space-y-1">
                            <p
                              className="font-medium text-sm truncate"
                              title={file.name}
                              data-testid={`file-name-${file.id}`}
                            >
                              {file.name}
                            </p>
                            <div className="text-xs text-muted-foreground space-y-0.5">
                              <div>{formatFileSize(file.size)}</div>
                              <div>{formatDistanceToNow(new Date(file.modifiedTime), { addSuffix: true })}</div>
                            </div>
                          </div>
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              className="flex-1"
                              onClick={() => window.open(file.webViewLink, '_blank')}
                              data-testid={`button-view-${file.id}`}
                            >
                              <ExternalLink className="h-3 w-3 mr-1" />
                              View
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => window.open(file.webViewLink, '_blank')}
                              title="Download via Drive"
                              data-testid={`button-download-${file.id}`}
                            >
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
                                {file.thumbnailLink ? (
                                  <img
                                    src={file.thumbnailLink}
                                    alt={file.name}
                                    className="h-10 w-10 rounded object-cover"
                                  />
                                ) : (
                                  <FileIcon className="h-5 w-5 text-muted-foreground" />
                                )}
                              </div>
                              <span
                                className="font-medium cursor-pointer hover:underline"
                                onClick={() => window.open(file.webViewLink, '_blank')}
                                data-testid={`file-name-${file.id}`}
                              >
                                {file.name}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {formatFileSize(file.size)}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {format(new Date(file.modifiedTime), 'MMM d, yyyy')}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => window.open(file.webViewLink, '_blank')}
                                data-testid={`button-view-${file.id}`}
                              >
                                <ExternalLink className="h-3 w-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => window.open(file.webViewLink, '_blank')}
                                title="Download via Drive"
                                data-testid={`button-download-${file.id}`}
                              >
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
      </div>

      <AlertDialog open={!!folderToDelete} onOpenChange={() => setFolderToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Folder?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the folder from your document browser. Files in Google Drive will not be affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => folderToDelete && deleteFolderMutation.mutate(folderToDelete)}
              data-testid="button-confirm-delete-folder"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
