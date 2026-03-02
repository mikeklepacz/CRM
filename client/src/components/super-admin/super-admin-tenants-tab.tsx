import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TabsContent } from "@/components/ui/tabs";
import { Edit, Eye, Plus } from "lucide-react";

export function SuperAdminTenantsTab(props: any) {
  const p = props;

  return (
    <TabsContent value="tenants">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-4">
          <div>
            <CardTitle>Tenants</CardTitle>
            <CardDescription>Manage all tenants on the platform</CardDescription>
          </div>
          <Button onClick={() => p.setIsCreateDialogOpen(true)} data-testid="button-create-tenant">
            <Plus className="mr-2 h-4 w-4" />
            Create Tenant
          </Button>
        </CardHeader>
        <CardContent>
          {p.tenantsLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>User Count</TableHead>
                  <TableHead>Created Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {p.tenantsData?.tenants?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      No tenants found
                    </TableCell>
                  </TableRow>
                ) : (
                  p.tenantsData?.tenants?.map((tenant: any) => (
                    <TableRow key={tenant.id} data-testid={`row-tenant-${tenant.id}`}>
                      <TableCell className="font-medium">{tenant.name}</TableCell>
                      <TableCell className="text-muted-foreground">{tenant.slug}</TableCell>
                      <TableCell>
                        <Badge variant={p.getStatusBadgeVariant(tenant.status)}>
                          {tenant.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{tenant.userCount ?? 0}</TableCell>
                      <TableCell>{p.formatDate(tenant.createdAt)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => p.setEditingTenant(tenant)}
                            data-testid={`button-edit-tenant-${tenant.id}`}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => p.setViewingTenantId(tenant.id)}
                            data-testid={`button-view-tenant-${tenant.id}`}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </TabsContent>
  );
}
