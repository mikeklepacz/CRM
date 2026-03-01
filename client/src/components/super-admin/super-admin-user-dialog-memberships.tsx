import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Loader2, Trash2, UserPlus } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function SuperAdminUserDialogMemberships(props: any) {
  const p = props;

  return (
    <>
      <div className="space-y-4">
        <h4 className="text-sm font-medium">Current Memberships</h4>
        {p.selectedUser?.tenantMemberships?.length === 0 ? (
          <p className="text-sm text-muted-foreground">This user is not a member of any tenant.</p>
        ) : (
          <div className="space-y-2">
            {p.selectedUser?.tenantMemberships?.map((m: any) => {
              const isUpdatingRole = p.updateUserRoleInTenantMutation.isPending && p.updateUserRoleInTenantMutation.variables?.tenantId === m.tenantId;
              return (
                <div key={m.tenantId} className="flex items-center justify-between p-2 rounded-md border" data-testid={`membership-${m.tenantId}`}>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{m.tenantName}</Badge>
                    <Select
                      value={m.roleInTenant}
                      onValueChange={(newRole) => {
                        if (newRole !== m.roleInTenant) {
                          p.updateUserRoleInTenantMutation.mutate({ userId: p.selectedUser.id, tenantId: m.tenantId, roleInTenant: newRole });
                        }
                      }}
                      disabled={isUpdatingRole}
                    >
                      <SelectTrigger className="w-[130px] h-8" data-testid={`select-role-${m.tenantId}`}>
                        {isUpdatingRole ? <Loader2 className="h-4 w-4 animate-spin" /> : <SelectValue />}
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="org_admin">Admin</SelectItem>
                        <SelectItem value="agent">Agent</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => p.handleRemoveUserFromTenant(p.selectedUser.id, m.tenantId)}
                    disabled={p.removeUserFromTenantMutation.isPending}
                    data-testid={`button-remove-from-${m.tenantId}`}
                  >
                    {p.removeUserFromTenantMutation.isPending && p.removeUserFromTenantMutation.variables?.tenantId === m.tenantId ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4 text-destructive" />
                    )}
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="border-t pt-4">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-medium">Add to Tenant</h4>
          {!p.isAddToTenantOpen && p.availableTenants.length > 0 && (
            <Button size="sm" variant="outline" onClick={() => p.setIsAddToTenantOpen(true)} data-testid="button-show-add-form">
              <UserPlus className="mr-2 h-4 w-4" />
              Add to Tenant
            </Button>
          )}
        </div>

        {p.availableTenants.length === 0 && !p.isAddToTenantOpen && (
          <p className="text-sm text-muted-foreground">This user is already a member of all available tenants.</p>
        )}

        {p.isAddToTenantOpen && (
          <Form {...p.addUserToTenantForm}>
            <form onSubmit={p.addUserToTenantForm.handleSubmit(p.handleAddUserToTenantSubmit)} className="space-y-4">
              <FormField
                control={p.addUserToTenantForm.control}
                name="tenantId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tenant</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-add-tenant">
                          <SelectValue placeholder="Select tenant" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {p.availableTenants.map((t: any) => (
                          <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={p.addUserToTenantForm.control}
                name="roleInTenant"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-add-role">
                          <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="org_admin">Admin</SelectItem>
                        <SelectItem value="agent">Agent</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => p.setIsAddToTenantOpen(false)} data-testid="button-cancel-add">Cancel</Button>
                <Button type="submit" disabled={p.addUserToTenantMutation.isPending} data-testid="button-submit-add">
                  {p.addUserToTenantMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Add
                </Button>
              </div>
            </form>
          </Form>
        )}
      </div>
    </>
  );
}
