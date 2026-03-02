import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

export function OrgAdminStageDialog(props: any) {
  const p = props;

  return (
    <Dialog open={p.isStageDialogOpen} onOpenChange={(open) => {
      if (!open) {
        p.setIsStageDialogOpen(false);
        p.setEditingStage(null);
        p.stageForm.reset();
      }
    }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{p.editingStage ? "Edit Stage" : "Add Stage"}</DialogTitle>
          <DialogDescription>
            {p.editingStage
              ? "Update the stage details below"
              : "Configure a new stage for this pipeline"}
          </DialogDescription>
        </DialogHeader>
        <Form {...p.stageForm}>
          <form onSubmit={p.stageForm.handleSubmit(p.handleStageSubmit)} className="space-y-4">
            <FormField
              control={p.stageForm.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Initial Contact"
                      {...field}
                      data-testid="input-stage-name"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={p.stageForm.control}
              name="stageType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Stage Type</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-stage-type">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {p.stageTypes.map((type: any) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={p.stageForm.control}
              name="isTerminal"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel>Terminal Stage</FormLabel>
                    <div className="text-sm text-muted-foreground">
                      Mark this as the final stage in the pipeline
                    </div>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      data-testid="switch-stage-terminal"
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  p.setIsStageDialogOpen(false);
                  p.setEditingStage(null);
                  p.stageForm.reset();
                }}
                data-testid="button-cancel-stage-dialog"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={p.createStageMutation.isPending || p.updateStageMutation.isPending}
                data-testid="button-submit-stage"
                data-primary="true"
              >
                {(p.createStageMutation.isPending || p.updateStageMutation.isPending) && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {p.editingStage ? "Save Changes" : "Add Stage"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
