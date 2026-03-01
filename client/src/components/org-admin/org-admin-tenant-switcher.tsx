import { Building2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function OrgAdminTenantSwitcher(props: any) {
  const p = props;

  if (!p.user?.isSuperAdmin) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 mb-4 flex-wrap">
      <Building2 className="h-4 w-4 text-muted-foreground" />
      <span className="text-sm text-muted-foreground">Viewing:</span>
      {p.tenantsLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading organizations...
        </div>
      ) : (
        <>
          <Select
            value={p.tenantSelectValue}
            onValueChange={(value) => {
              if (value !== "__none__") {
                p.switchTenantMutation.mutate(value);
              }
            }}
            disabled={p.isTenantMutating}
          >
            <SelectTrigger className="w-[200px]" data-testid="org-admin-tenant-switcher">
              {p.isTenantMutating ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Switching...</span>
                </div>
              ) : (
                <SelectValue placeholder="Select organization">
                  {p.currentTenantName || "Select organization"}
                </SelectValue>
              )}
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__" disabled>
                Select organization
              </SelectItem>
              {p.tenantsData?.tenants?.map((tenant: any) => (
                <SelectItem key={tenant.id} value={tenant.id} data-testid={`org-tenant-option-${tenant.id}`}>
                  {tenant.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {(p.user as any).isViewingAsTenant && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => p.clearTenantOverrideMutation.mutate()}
              disabled={p.isTenantMutating}
              data-testid="org-clear-tenant-override"
            >
              {p.clearTenantOverrideMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Clear"
              )}
            </Button>
          )}
        </>
      )}
    </div>
  );
}
