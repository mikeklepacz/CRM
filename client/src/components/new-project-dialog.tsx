import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

interface NewProjectDialogProps {
  open: boolean;
  projectName: string;
  isPending: boolean;
  onOpenChange: (open: boolean) => void;
  onProjectNameChange: (value: string) => void;
  onCancel: () => void;
  onCreate: () => void;
}

export function NewProjectDialog({
  open,
  projectName,
  isPending,
  onOpenChange,
  onProjectNameChange,
  onCancel,
  onCreate,
}: NewProjectDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="dialog-new-project">
        <DialogHeader>
          <DialogTitle>New Project</DialogTitle>
          <DialogDescription>Create a new folder to organize your conversations</DialogDescription>
        </DialogHeader>
        <Input
          value={projectName}
          onChange={(event) => onProjectNameChange(event.target.value)}
          placeholder="Project name..."
          data-testid="input-project-name"
        />
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            onClick={onCreate}
            disabled={isPending || !projectName.trim()}
            data-testid="button-create-project"
            data-primary="true"
          >
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
