import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type { Category, CategoryFormData } from "./types";

interface CategoryFormDialogProps {
  editingCategory: Category | null;
  formData: CategoryFormData;
  isDialogOpen: boolean;
  isSaving: boolean;
  onClose: () => void;
  onOpenChange: (open: boolean) => void;
  onSubmit: (e: React.FormEvent) => void;
  projects: Array<{ id: string; name: string }>;
  setFormData: (data: CategoryFormData) => void;
}

export function CategoryFormDialog({
  editingCategory,
  formData,
  isDialogOpen,
  isSaving,
  onClose,
  onOpenChange,
  onSubmit,
  projects,
  setFormData,
}: CategoryFormDialogProps) {
  return (
    <Dialog open={isDialogOpen} onOpenChange={onOpenChange}>
      <DialogContent data-testid="dialog-category-form">
        <DialogHeader>
          <DialogTitle>{editingCategory ? "Edit Category" : "Add New Category"}</DialogTitle>
          <DialogDescription>
            {editingCategory ? "Update the category details below." : "Create a new category for business filtering."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Category Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Cannabis, Pets, Restaurants"
                required
                data-testid="input-category-name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="projectId">Assigned Project</Label>
              <Select
                value={formData.projectId || "all"}
                onValueChange={(value) => setFormData({ ...formData, projectId: value === "all" ? null : value })}
              >
                <SelectTrigger data-testid="select-category-project">
                  <SelectValue placeholder="All Projects" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Projects</SelectItem>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                Categories can be scoped to a specific project, or shared across all projects
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Optional description for this category"
                rows={3}
                data-testid="input-category-description"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="displayOrder">Display Order</Label>
              <Input
                id="displayOrder"
                type="number"
                value={formData.displayOrder}
                onChange={(e) => {
                  setFormData({ ...formData, displayOrder: e.target.value as any });
                }}
                onBlur={() => {
                  const val: any = formData.displayOrder;
                  if (val === "" || val === null || val === undefined) {
                    setFormData({ ...formData, displayOrder: 0 });
                  } else {
                    const parsed = typeof val === "string" ? parseInt(val, 10) : val;
                    if (isNaN(parsed) || parsed < 0) {
                      setFormData({ ...formData, displayOrder: 0 });
                    } else {
                      setFormData({ ...formData, displayOrder: parsed });
                    }
                  }
                }}
                min="0"
                data-testid="input-category-order"
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="isActive">Active</Label>
                <div className="text-sm text-muted-foreground">Only active categories appear in Map Search</div>
              </div>
              <Switch
                id="isActive"
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                data-testid="switch-category-active"
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} data-testid="button-cancel">
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving} data-testid="button-save-category" data-primary="true">
              {isSaving ? "Saving..." : editingCategory ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
