import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export function OrgAdminDeleteProjectDialog(props: any) {
  const p = props;

  return (
    <Dialog open={!!p.projectToDelete} onOpenChange={(open) => !open && p.setProjectToDelete(null)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Project</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete "{p.projectToDelete?.name}"? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => p.setProjectToDelete(null)}
            data-testid="button-cancel-delete-project"
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={() => p.projectToDelete && p.deleteProjectMutation.mutate(p.projectToDelete.id)}
            disabled={p.deleteProjectMutation.isPending}
            data-testid="button-confirm-delete-project"
            data-primary="true"
          >
            {p.deleteProjectMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Delete Project
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
