import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export function OrgAdminProjectDialog(props: any) {
  const p = props;

  return (
    <Dialog open={p.isProjectDialogOpen} onOpenChange={(open) => {
      if (!open) {
        p.setIsProjectDialogOpen(false);
        p.setEditingProject(null);
        p.projectForm.reset();
      }
    }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{p.editingProject ? "Edit Project" : "Create Project"}</DialogTitle>
          <DialogDescription>
            {p.editingProject
              ? "Update the project details below"
              : "Configure a new project for your organization"}
          </DialogDescription>
        </DialogHeader>
        <Form {...p.projectForm}>
          <form onSubmit={p.projectForm.handleSubmit(p.handleProjectSubmit)} className="space-y-4">
            <FormField
              control={p.projectForm.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Q1 Campaign"
                      {...field}
                      onChange={(e) => {
                        field.onChange(e);
                        if (!p.editingProject) {
                          const slug = e.target.value
                            .toLowerCase()
                            .replace(/[^a-z0-9]+/g, '-')
                            .replace(/^-+|-+$/g, '');
                          p.projectForm.setValue('slug', slug);
                        }
                      }}
                      data-testid="input-project-name"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={p.projectForm.control}
              name="slug"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Slug</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="q1-campaign"
                      {...field}
                      data-testid="input-project-slug"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={p.projectForm.control}
              name="projectType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Project Type</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-project-type">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {p.projectTypes.map((type: any) => (
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
              control={p.projectForm.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe the project..."
                      {...field}
                      data-testid="input-project-description"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={p.projectForm.control}
              name="accentColor"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Header Color</FormLabel>
                  <FormControl>
                    <div className="flex flex-wrap gap-2" data-testid="color-picker-project">
                      {p.projectColors.map((color: any) => (
                        <button
                          key={color.value}
                          type="button"
                          onClick={() => field.onChange(color.value)}
                          className={`w-8 h-8 rounded-full border-2 transition-all ${
                            field.value === color.value
                              ? 'border-foreground scale-110'
                              : 'border-transparent hover:scale-105'
                          }`}
                          style={{ backgroundColor: color.value }}
                          title={color.label}
                          data-testid={`color-option-${color.value}`}
                        />
                      ))}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  p.setIsProjectDialogOpen(false);
                  p.setEditingProject(null);
                  p.projectForm.reset();
                }}
                data-testid="button-cancel-project-dialog"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={p.createProjectMutation.isPending || p.updateProjectMutation.isPending}
                data-testid="button-submit-project"
                data-primary="true"
              >
                {(p.createProjectMutation.isPending || p.updateProjectMutation.isPending) && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {p.editingProject ? "Save Changes" : "Create Project"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
