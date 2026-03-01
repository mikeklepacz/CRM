import { AVAILABLE_MODULES } from "@/lib/modules";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/components/super-admin/super-admin-utils";
import type { TenantDetails } from "@/components/super-admin/super-admin.types";

interface TenantDetailsDialogProps {
  detailsLoading: boolean;
  getStatusBadgeVariant: (status: string) => "default" | "secondary" | "destructive" | "outline";
  setViewingTenantId: (id: string | null) => void;
  tenantDetails: TenantDetails | undefined;
  viewingTenantId: string | null;
}

export function TenantDetailsDialog({
  detailsLoading,
  getStatusBadgeVariant,
  setViewingTenantId,
  tenantDetails,
  viewingTenantId,
}: TenantDetailsDialogProps) {
  return (
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
                <Badge variant={getStatusBadgeVariant(tenantDetails.tenant.status)}>{tenantDetails.tenant.status}</Badge>
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
                {tenantDetails.tenant.settings?.allowedModules && tenantDetails.tenant.settings.allowedModules.length > 0 ? (
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
                  <p className="text-sm text-muted-foreground italic">All modules available (no restrictions)</p>
                )}
              </div>
            </div>
          </div>
        ) : null}
        <DialogFooter>
          <Button variant="outline" onClick={() => setViewingTenantId(null)} data-testid="button-close-details">
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
