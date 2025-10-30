import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Upload, FileIcon, Download, Trash2, FolderOpen, AlertCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useAuth } from "@/hooks/useAuth";

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size: string;
  modifiedTime: string;
  webViewLink: string;
  iconLink?: string;
}

interface DriveFolder {
  id: string;
  category: string;
  folderId: string;
  folderName: string;
}

export default function Documents() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);

  const { data: folders } = useQuery<DriveFolder[]>({
    queryKey: ['/api/drive/folders'],
  });

  const { data: files, isLoading: filesLoading } = useQuery<DriveFile[]>({
    queryKey: ['/api/drive/files', selectedCategory],
    enabled: !!selectedCategory,
  });

  const uploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await fetch('/api/drive/upload', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Upload failed');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/drive/files', selectedCategory] });
      toast({
        title: "Success",
        description: "File uploaded successfully",
      });
      setUploadFile(null);
      const fileInput = document.getElementById('file-upload') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
    },
    onError: (error: any) => {
      toast({
        title: "Upload Failed",
        description: error.message || "Failed to upload file",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (fileId: string) => {
      return await apiRequest('DELETE', `/api/drive/files/${fileId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/drive/files', selectedCategory] });
      toast({
        title: "Success",
        description: "File deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete file",
        variant: "destructive",
      });
    },
  });

  const handleUpload = () => {
    if (!uploadFile || !selectedCategory) {
      toast({
        title: "Error",
        description: "Please select a file and category",
        variant: "destructive",
      });
      return;
    }

    const formData = new FormData();
    formData.append('file', uploadFile);
    formData.append('category', selectedCategory);
    uploadMutation.mutate(formData);
  };

  const handleDownload = async (fileId: string, fileName: string) => {
    try {
      const response = await fetch(`/api/drive/download/${fileId}`, {
        credentials: 'include',
      });
      
      if (!response.ok) throw new Error('Download failed');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      toast({
        title: "Download Failed",
        description: "Failed to download file",
        variant: "destructive",
      });
    }
  };

  const formatFileSize = (bytes: string) => {
    const size = parseInt(bytes);
    if (isNaN(size)) return 'Unknown';
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    if (size < 1024 * 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} MB`;
    return `${(size / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return '🖼️';
    if (mimeType.startsWith('video/')) return '🎥';
    if (mimeType.includes('pdf')) return '📄';
    if (mimeType.includes('word') || mimeType.includes('document')) return '📝';
    if (mimeType.includes('sheet') || mimeType.includes('excel')) return '📊';
    if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return '📽️';
    if (mimeType.includes('zip') || mimeType.includes('compressed')) return '🗜️';
    return '📎';
  };

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-foreground">Documents</h2>
        <p className="text-muted-foreground">Access and manage your files by category</p>
      </div>

      <Card>
        <CardContent className="p-6 space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Select Category</label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger data-testid="select-category">
                  <SelectValue placeholder="Choose a category" />
                </SelectTrigger>
                <SelectContent>
                  {folders?.map((folder) => (
                    <SelectItem key={folder.id} value={folder.category}>
                      <div className="flex items-center gap-2">
                        <FolderOpen className="h-4 w-4" />
                        {folder.category}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedCategory && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Upload File</label>
                <div className="flex gap-2">
                  <Input
                    id="file-upload"
                    type="file"
                    onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                    className="flex-1"
                    data-testid="input-file-upload"
                  />
                  <Button
                    onClick={handleUpload}
                    disabled={uploadMutation.isPending || !uploadFile}
                    data-testid="button-upload"
                  >
                    {uploadMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Upload className="h-4 w-4" />
                    )}
                    Upload
                  </Button>
                </div>
              </div>
            )}
          </div>

          {!selectedCategory ? (
            <div className="text-center p-12 text-muted-foreground">
              <FolderOpen className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">Select a category to view files</p>
              <p className="text-sm">Choose a category from the dropdown above</p>
            </div>
          ) : filesLoading ? (
            <div className="flex items-center justify-center p-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : !files || files.length === 0 ? (
            <div className="text-center p-12 text-muted-foreground">
              <FileIcon className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">No files in this category</p>
              <p className="text-sm">Upload your first file using the form above</p>
            </div>
          ) : (
            <div className="space-y-2">
              <h3 className="text-sm font-medium mb-4">Files in {selectedCategory}</h3>
              <div className="grid gap-2">
                {files.map((file) => (
                  <Card key={file.id} className="hover-elevate">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <span className="text-2xl flex-shrink-0">{getFileIcon(file.mimeType)}</span>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate" data-testid={`file-name-${file.id}`}>
                              {file.name}
                            </p>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                              <span>{formatFileSize(file.size)}</span>
                              <span>•</span>
                              <span>{formatDistanceToNow(new Date(file.modifiedTime), { addSuffix: true })}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2 flex-shrink-0">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => window.open(file.webViewLink, '_blank')}
                            data-testid={`button-view-${file.id}`}
                          >
                            View
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDownload(file.id, file.name)}
                            data-testid={`button-download-${file.id}`}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                size="sm"
                                variant="outline"
                                data-testid={`button-delete-${file.id}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete file?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will permanently delete "{file.name}" from Google Drive. This action cannot be undone.
                                  {user?.role !== 'admin' && (
                                    <div className="mt-2 flex items-start gap-2 text-orange-600 dark:text-orange-400">
                                      <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                                      <span className="text-xs">You can only delete files you uploaded.</span>
                                    </div>
                                  )}
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deleteMutation.mutate(file.id)}
                                  data-testid={`button-confirm-delete-${file.id}`}
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
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
