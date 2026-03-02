import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Edit, Check, Phone, Search, UserPlus } from "lucide-react";

export function SuperAdminUsersTab(props: any) {
  const p = props;

  const renderUsersTable = (sortTestSuffix: string, emptyText: string) => (
    p.usersLoading ? (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    ) : (
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="cursor-pointer select-none" onClick={() => p.handleSort("name")}>
                <div className="flex items-center" data-testid={`sort-name${sortTestSuffix}`}>
                  Name {p.getSortIcon(p.sortField, p.sortDirection, "name")}
                </div>
              </TableHead>
              <TableHead className="cursor-pointer select-none" onClick={() => p.handleSort("email")}>
                <div className="flex items-center" data-testid={`sort-email${sortTestSuffix}`}>
                  Email {p.getSortIcon(p.sortField, p.sortDirection, "email")}
                </div>
              </TableHead>
              <TableHead>Agent Name</TableHead>
              <TableHead>Super Admin</TableHead>
              <TableHead>Voice Access</TableHead>
              <TableHead className="cursor-pointer select-none" onClick={() => p.handleSort("tenants")}>
                <div className="flex items-center" data-testid={`sort-tenants${sortTestSuffix}`}>
                  Tenant Memberships {p.getSortIcon(p.sortField, p.sortDirection, "tenants")}
                </div>
              </TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {p.filteredAndSortedUsers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  {emptyText}
                </TableCell>
              </TableRow>
            ) : (
              p.filteredAndSortedUsers.map((u: any) => (
                <TableRow
                  key={u.id}
                  data-testid={`row-user-${u.id}`}
                  className="cursor-pointer hover-elevate"
                  onClick={() => p.setSelectedUser(u)}
                >
                  <TableCell className="font-medium">
                    {u.firstName || u.lastName ? `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() : "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{u.email ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{u.agentName ?? "—"}</TableCell>
                  <TableCell>
                    {u.isSuperAdmin ? (
                      <Badge variant="default">
                        <Check className="mr-1 h-3 w-3" />
                        Yes
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">No</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {u.hasVoiceAccess ? (
                      <Badge variant="secondary">
                        <Phone className="mr-1 h-3 w-3" />
                        Yes
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">No</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {u.tenantMemberships?.length > 0 ? (
                        u.tenantMemberships.map((m: any) => (
                          <Badge key={m.tenantId} variant="outline">
                            {m.tenantName} ({m.roleInTenant})
                          </Badge>
                        ))
                      ) : (
                        <span className="text-muted-foreground">None</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        p.setSelectedUser(u);
                      }}
                      data-testid={`button-manage-user-${u.id}`}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    )
  );

  return (
    <TabsContent value="users">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-4">
          <div>
            <CardTitle>Users</CardTitle>
            <CardDescription>View and manage users across all tenants</CardDescription>
          </div>
          <Button onClick={() => p.setIsCreateUserDialogOpen(true)} data-testid="button-create-user">
            <UserPlus className="mr-2 h-4 w-4" />
            Create User
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, email, or agent name..."
                  value={p.searchQuery}
                  onChange={(e) => p.setSearchQuery(e.target.value)}
                  className="pl-10"
                  data-testid="input-user-search"
                />
              </div>
            </div>
            <Select value={p.tenantFilter} onValueChange={p.setTenantFilter}>
              <SelectTrigger className="w-[200px]" data-testid="select-tenant-filter">
                <SelectValue placeholder="Filter by tenant" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Tenants</SelectItem>
                {p.tenantsData?.tenants?.map((t: any) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Tabs value={p.userStatusFilter} onValueChange={(v) => p.setUserStatusFilter(v as "active" | "inactive")} className="w-full">
            <TabsList className="mb-4">
              <TabsTrigger value="active" data-testid="tab-active-users">
                Active Users ({p.activeUsersCount})
              </TabsTrigger>
              <TabsTrigger value="inactive" data-testid="tab-inactive-users">
                Inactive Users ({p.inactiveUsersCount})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="active" className="mt-0">
              {renderUsersTable("", "No active users found")}
            </TabsContent>

            <TabsContent value="inactive" className="mt-0">
              {renderUsersTable("-inactive", "No inactive users found")}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </TabsContent>
  );
}
