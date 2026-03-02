import { AVAILABLE_MODULES } from "@/lib/modules";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import type { Tenant } from "@/components/super-admin/super-admin.types";

interface TenantEditDialogProps {
  editingAllowedModules: string[];
  editingTenant: Tenant | null;
  editForm: any;
  handleEditSubmit: (data: any) => void;
  setEditingAllowedModules: (modules: string[]) => void;
  setEditingTenant: (tenant: Tenant | null) => void;
  updateTenantPending: boolean;
}

export function TenantEditDialog({
  editingAllowedModules,
  editingTenant,
  editForm,
  handleEditSubmit,
  setEditingAllowedModules,
  setEditingTenant,
  updateTenantPending,
}: TenantEditDialogProps) {
  return (
    <Dialog open={!!editingTenant} onOpenChange={(open) => !open && setEditingTenant(null)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Tenant</DialogTitle>
          <DialogDescription>Update tenant information</DialogDescription>
        </DialogHeader>
        <Form {...editForm}>
          <form onSubmit={editForm.handleSubmit(handleEditSubmit)} className="space-y-4">
            <FormField
              control={editForm.control}
              name="name"
              render={({ field }: any) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Tenant name" {...field} data-testid="input-edit-tenant-name" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={editForm.control}
              name="slug"
              render={({ field }: any) => (
                <FormItem>
                  <FormLabel>Slug</FormLabel>
                  <FormControl>
                    <Input placeholder="tenant-slug" {...field} data-testid="input-edit-tenant-slug" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={editForm.control}
              name="status"
              render={({ field }: any) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-edit-tenant-status">
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="trial">Trial</SelectItem>
                      <SelectItem value="suspended">Suspended</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Separator className="my-4" />
            <div className="space-y-3">
              <Label className="text-sm font-medium">Allowed Modules</Label>
              <p className="text-xs text-muted-foreground">
                Select which modules this tenant can enable. The tenant's org admin will only see these options.
              </p>
              <div className="grid grid-cols-2 gap-3 pt-2" data-testid="allowed-modules-container">
                {AVAILABLE_MODULES.map((module) => (
                  <div key={module.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`allowed-module-${module.id}`}
                      checked={editingAllowedModules.includes(module.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setEditingAllowedModules([...editingAllowedModules, module.id]);
                        } else {
                          setEditingAllowedModules(editingAllowedModules.filter((id) => id !== module.id));
                        }
                      }}
                      data-testid={`checkbox-allowed-module-${module.id}`}
                    />
                    <Label htmlFor={`allowed-module-${module.id}`} className="text-sm font-normal cursor-pointer">
                      {module.label}
                    </Label>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {editingAllowedModules.length === AVAILABLE_MODULES.length
                  ? "All modules enabled"
                  : editingAllowedModules.length === 0
                    ? "No modules allowed - tenant cannot access any features"
                    : `${editingAllowedModules.length} of ${AVAILABLE_MODULES.length} modules allowed`}
              </p>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditingTenant(null)} data-testid="button-cancel-edit">
                Cancel
              </Button>
              <Button type="submit" disabled={updateTenantPending} data-testid="button-submit-edit" data-primary="true">
                {updateTenantPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
