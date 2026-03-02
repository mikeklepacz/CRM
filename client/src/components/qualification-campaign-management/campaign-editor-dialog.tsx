import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { QualificationFieldEditorCard } from "@/components/qualification-campaign-management/field-editor-card";

export function QualificationCampaignEditorDialog(props: any) {
  return (
    <Dialog
      open={props.isCreateOpen || props.isEditOpen}
      onOpenChange={(open) => {
        if (!open) {
          props.setIsCreateOpen(false);
          props.setIsEditOpen(false);
          props.setSelectedCampaign(null);
          props.resetForm();
        }
      }}
    >
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>{props.isEditOpen ? "Edit Campaign" : "Create Campaign"}</DialogTitle>
          <DialogDescription>Define the qualification questions and scoring for this campaign</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Campaign Name</Label>
              <Input
                id="name"
                value={props.formData.name}
                onChange={(e) => props.setFormData((prev: any) => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Polish Tyre Cartel 2024"
                data-testid="input-campaign-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={props.formData.description}
                onChange={(e) => props.setFormData((prev: any) => ({ ...prev, description: e.target.value }))}
                placeholder="Brief description of this qualification campaign"
                data-testid="input-campaign-description"
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="active"
                checked={props.formData.isActive}
                onCheckedChange={(checked) => props.setFormData((prev: any) => ({ ...prev, isActive: checked }))}
                data-testid="switch-campaign-active"
              />
              <Label htmlFor="active">Campaign Active</Label>
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Qualification Fields</Label>
              <Badge variant="secondary">{props.fieldDefinitions.length} fields</Badge>
            </div>
            <QualificationFieldEditorCard {...props} />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              props.setIsCreateOpen(false);
              props.setIsEditOpen(false);
              props.setSelectedCampaign(null);
              props.resetForm();
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={props.isEditOpen ? props.handleUpdateSubmit : props.handleCreateSubmit}
            disabled={props.createMutation.isPending || props.updateMutation.isPending}
            data-testid="button-save-campaign"
          >
            {(props.createMutation.isPending || props.updateMutation.isPending) && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            {props.isEditOpen ? "Save Changes" : "Create Campaign"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
