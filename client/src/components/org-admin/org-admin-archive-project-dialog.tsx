import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export function OrgAdminArchiveProjectDialog(props: any) {
  const p = props;

  return (
    <Dialog open={!!p.projectToArchive} onOpenChange={(open) => !open && p.setProjectToArchive(null)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Archive Project</DialogTitle>
          <DialogDescription>
            Are you sure you want to archive "{p.projectToArchive?.name}"? Archived projects can be restored later.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => p.setProjectToArchive(null)}
            data-testid="button-cancel-archive-project"
          >
            Cancel
          </Button>
          <Button
            onClick={() => p.projectToArchive && p.archiveProjectMutation.mutate(p.projectToArchive.id)}
            disabled={p.archiveProjectMutation.isPending}
            data-testid="button-confirm-archive-project"
            data-primary="true"
          >
            {p.archiveProjectMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Archive Project
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
