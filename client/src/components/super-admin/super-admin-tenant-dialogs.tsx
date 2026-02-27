import { AVAILABLE_MODULES } from "@/lib/modules";
import { Badge } from "@/components/ui/badge";
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
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/components/super-admin/super-admin-utils";
import type { Tenant, TenantDetails } from "@/components/super-admin/super-admin.types";
import { Loader2 } from "lucide-react";

type SuperAdminTenantDialogsProps = {
  createForm: any;
  createTenantPending: boolean;
  detailsLoading: boolean;
  editingAllowedModules: string[];
  editingTenant: Tenant | null;
  editForm: any;
  getStatusBadgeVariant: (status: string) => "default" | "secondary" | "destructive" | "outline";
  handleCreateSubmit: (data: any) => void;
  handleEditSubmit: (data: any) => void;
  isCreateDialogOpen: boolean;
  setEditingAllowedModules: (modules: string[]) => void;
  setEditingTenant: (tenant: Tenant | null) => void;
  setIsCreateDialogOpen: (open: boolean) => void;
  setViewingTenantId: (id: string | null) => void;
  tenantDetails: TenantDetails | undefined;
  updateTenantPending: boolean;
  viewingTenantId: string | null;
};

export function SuperAdminTenantDialogs({
  createForm,
  createTenantPending,
  detailsLoading,
  editingAllowedModules,
  editingTenant,
  editForm,
  getStatusBadgeVariant,
  handleCreateSubmit,
  handleEditSubmit,
  isCreateDialogOpen,
  setEditingAllowedModules,
  setEditingTenant,
  setIsCreateDialogOpen,
  setViewingTenantId,
  tenantDetails,
  updateTenantPending,
  viewingTenantId,
}: SuperAdminTenantDialogsProps) {
  return (
    <>
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Tenant</DialogTitle>
            <DialogDescription>Add a new tenant to the platform</DialogDescription>
          </DialogHeader>
          <Form {...createForm}>
            <form onSubmit={createForm.handleSubmit(handleCreateSubmit)} className="space-y-4">
              <FormField
                control={createForm.control}
                name="name"
                render={({ field }: any) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Tenant name" {...field} data-testid="input-tenant-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={createForm.control}
                name="slug"
                render={({ field }: any) => (
                  <FormItem>
                    <FormLabel>Slug (optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="tenant-slug" {...field} data-testid="input-tenant-slug" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={createForm.control}
                name="status"
                render={({ field }: any) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-tenant-status">
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
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreateDialogOpen(false)}
                  data-testid="button-cancel-create"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createTenantPending}
                  data-testid="button-submit-create"
                  data-primary="true"
                >
                  {createTenantPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

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
                  Select which modules this tenant can enable. The tenant's org admin will only
                  see these options.
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
                            setEditingAllowedModules(
                              editingAllowedModules.filter((id) => id !== module.id),
                            );
                          }
                        }}
                        data-testid={`checkbox-allowed-module-${module.id}`}
                      />
                      <Label
                        htmlFor={`allowed-module-${module.id}`}
                        className="text-sm font-normal cursor-pointer"
                      >
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
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditingTenant(null)}
                  data-testid="button-cancel-edit"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={updateTenantPending}
                  data-testid="button-submit-edit"
                  data-primary="true"
                >
                  {updateTenantPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Changes
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewingTenantId} onOpenChange={(open) => !open && setViewingTenantId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tenant Details</DialogTitle>
            <DialogDescription>{tenantDetails?.tenant?.name ?? "Loading..."}</DialogDescription>
          </DialogHeader>
          {detailsLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-6 w-full" />
            </div>
          ) : tenantDetails ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Slug</p>
                  <p className="font-medium">{tenantDetails.tenant.slug}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <Badge variant={getStatusBadgeVariant(tenantDetails.tenant.status)}>
                    {tenantDetails.tenant.status}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Users</p>
                  <p className="font-medium">{tenantDetails.stats.userCount}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Clients</p>
                  <p className="font-medium">{tenantDetails.stats.clientCount}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Calls</p>
                  <p className="font-medium">{tenantDetails.stats.callCount}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Created</p>
                  <p className="font-medium">{formatDate(tenantDetails.tenant.createdAt)}</p>
                </div>
              </div>
              <Separator />
              <div>
                <p className="text-sm text-muted-foreground mb-2">Allowed Modules</p>
                <div className="flex flex-wrap gap-1.5" data-testid="details-allowed-modules">
                  {tenantDetails.tenant.settings?.allowedModules &&
                  tenantDetails.tenant.settings.allowedModules.length > 0 ? (
                    tenantDetails.tenant.settings.allowedModules.map((moduleId) => {
                      const module = AVAILABLE_MODULES.find((item) => item.id === moduleId);
                      return module ? (
                        <Badge
                          key={moduleId}
                          variant="secondary"
                          className="no-default-hover-elevate no-default-active-elevate"
                        >
                          {module.label}
                        </Badge>
                      ) : null;
                    })
                  ) : (
                    <p className="text-sm text-muted-foreground italic">
                      All modules available (no restrictions)
                    </p>
                  )}
                </div>
              </div>
            </div>
          ) : null}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setViewingTenantId(null)}
              data-testid="button-close-details"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
