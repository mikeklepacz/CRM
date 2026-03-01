import { Loader2, Settings } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface FolderManagementDialogProps {
  canManage: boolean;
  open: boolean;
  folderName: string;
  folderUrl: string;
  isPending: boolean;
  onOpenChange: (open: boolean) => void;
  onFolderNameChange: (value: string) => void;
  onFolderUrlChange: (value: string) => void;
  onSubmit: () => void;
}

export function FolderManagementDialog({
  canManage,
  open,
  folderName,
  folderUrl,
  isPending,
  onOpenChange,
  onFolderNameChange,
  onFolderUrlChange,
  onSubmit,
}: FolderManagementDialogProps) {
  if (!canManage) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button data-testid="button-add-folder">
          <Settings className="h-4 w-4 mr-2" />
          Manage Folders
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Drive Folder</DialogTitle>
          <DialogDescription>Paste the full Google Drive folder URL and give it a name</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="folder-name">Folder Name</Label>
            <Input id="folder-name" placeholder="e.g., Cannabis, Pets" value={folderName} onChange={(e) => onFolderNameChange(e.target.value)} data-testid="input-folder-name" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="folder-url">Google Drive Folder URL</Label>
            <Input
              id="folder-url"
              placeholder="https://drive.google.com/drive/folders/..."
              value={folderUrl}
              onChange={(e) => onFolderUrlChange(e.target.value)}
              data-testid="input-folder-url"
            />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={onSubmit} disabled={isPending} data-testid="button-submit-folder">
            {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Add Folder
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
