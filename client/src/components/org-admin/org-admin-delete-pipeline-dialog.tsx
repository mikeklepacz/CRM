import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export function OrgAdminDeletePipelineDialog(props: any) {
  const p = props;

  return (
    <Dialog open={!!p.pipelineToDelete} onOpenChange={(open) => !open && p.setPipelineToDelete(null)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Pipeline</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete "{p.pipelineToDelete?.name}"? This will also delete all stages in this pipeline. This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => p.setPipelineToDelete(null)}
            data-testid="button-cancel-delete-pipeline"
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={() => p.pipelineToDelete && p.deletePipelineMutation.mutate(p.pipelineToDelete.id)}
            disabled={p.deletePipelineMutation.isPending}
            data-testid="button-confirm-delete-pipeline"
            data-primary="true"
          >
            {p.deletePipelineMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Delete Pipeline
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
