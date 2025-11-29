import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { isSuperAdmin } from "@/lib/authUtils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Building2, Users, BarChart3, Plus, Edit, Eye, Loader2, Check, Trash2, UserPlus } from "lucide-react";

interface Tenant {
  id: string;
  name: string;
  slug: string;
  status: string;
  createdAt: string;
  userCount?: number;
}

interface TenantMembership {
  tenantId: string;
  tenantName: string;
  roleInTenant: string;
}

interface UserWithMemberships {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  isSuperAdmin: boolean;
  tenantMemberships: TenantMembership[];
}

interface Metrics {
  totalTenants: number;
  totalUsers: number;
  totalClients: number;
  activeTenants: number;
}

interface TenantDetails {
  tenant: Tenant;
  stats: {
    userCount: number;
    clientCount: number;
    callCount: number;
  };
}

const tenantFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  slug: z.string().optional(),
  status: z.enum(["active", "trial", "suspended"]),
});

type TenantFormData = z.infer<typeof tenantFormSchema>;

const addUserToTenantSchema = z.object({
  tenantId: z.string().min(1, "Tenant is required"),
  roleInTenant: z.enum(["org_admin", "agent"]),
});

type AddUserToTenantFormData = z.infer<typeof addUserToTenantSchema>;

export default function SuperAdmin() {
  const { user, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("tenants");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const [viewingTenantId, setViewingTenantId] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<UserWithMemberships | null>(null);
  const [isAddToTenantOpen, setIsAddToTenantOpen] = useState(false);

  useEffect(() => {
    if (!authLoading && user && !isSuperAdmin(user)) {
      setLocation('/');
    }
  }, [user, authLoading, setLocation]);

  const { data: tenantsData, isLoading: tenantsLoading } = useQuery<{ tenants: Tenant[] }>({
    queryKey: ['/api/super-admin/tenants'],
    enabled: isSuperAdmin(user),
  });

  const { data: usersData, isLoading: usersLoading } = useQuery<{ users: UserWithMemberships[] }>({
    queryKey: ['/api/super-admin/users'],
    enabled: isSuperAdmin(user),
  });

  const { data: metricsData, isLoading: metricsLoading } = useQuery<Metrics>({
    queryKey: ['/api/super-admin/metrics'],
    enabled: isSuperAdmin(user),
  });

  const { data: tenantDetails, isLoading: detailsLoading } = useQuery<TenantDetails>({
    queryKey: [`/api/super-admin/tenants/${viewingTenantId}`],
    enabled: !!viewingTenantId,
  });

  const createForm = useForm<TenantFormData>({
    resolver: zodResolver(tenantFormSchema),
    defaultValues: {
      name: "",
      slug: "",
      status: "active",
    },
  });

  const editForm = useForm<TenantFormData>({
    resolver: zodResolver(tenantFormSchema),
    defaultValues: {
      name: "",
      slug: "",
      status: "active",
    },
  });

  const addUserToTenantForm = useForm<AddUserToTenantFormData>({
    resolver: zodResolver(addUserToTenantSchema),
    defaultValues: {
      tenantId: "",
      roleInTenant: "agent",
    },
  });

  useEffect(() => {
    if (editingTenant) {
      editForm.reset({
        name: editingTenant.name,
        slug: editingTenant.slug,
        status: editingTenant.status as "active" | "trial" | "suspended",
      });
    }
  }, [editingTenant, editForm]);

  useEffect(() => {
    if (isAddToTenantOpen) {
      addUserToTenantForm.reset({
        tenantId: "",
        roleInTenant: "agent",
      });
    }
  }, [isAddToTenantOpen, addUserToTenantForm]);

  const createTenantMutation = useMutation({
    mutationFn: async (data: TenantFormData) => {
      return await apiRequest("POST", "/api/super-admin/tenants", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/super-admin/tenants'] });
      queryClient.invalidateQueries({ queryKey: ['/api/super-admin/metrics'] });
      setIsCreateDialogOpen(false);
      createForm.reset();
      toast({
        title: "Success",
        description: "Tenant created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create tenant",
        variant: "destructive",
      });
    },
  });

  const updateTenantMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: TenantFormData }) => {
      return await apiRequest("PATCH", `/api/super-admin/tenants/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/super-admin/tenants'] });
      queryClient.invalidateQueries({ queryKey: ['/api/super-admin/metrics'] });
      setEditingTenant(null);
      editForm.reset();
      toast({
        title: "Success",
        description: "Tenant updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update tenant",
        variant: "destructive",
      });
    },
  });

  const addUserToTenantMutation = useMutation({
    mutationFn: async ({ userId, tenantId, roleInTenant }: { userId: string; tenantId: string; roleInTenant: string }) => {
      return await apiRequest("POST", `/api/super-admin/users/${userId}/tenants`, { tenantId, roleInTenant });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/super-admin/users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/super-admin/tenants'] });
      setIsAddToTenantOpen(false);
      addUserToTenantForm.reset();
      toast({
        title: "Success",
        description: "User added to tenant successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add user to tenant",
        variant: "destructive",
      });
    },
  });

  const removeUserFromTenantMutation = useMutation({
    mutationFn: async ({ userId, tenantId }: { userId: string; tenantId: string }) => {
      return await apiRequest("DELETE", `/api/super-admin/users/${userId}/tenants/${tenantId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/super-admin/users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/super-admin/tenants'] });
      if (selectedUser) {
        const updatedMemberships = selectedUser.tenantMemberships.filter(m => m.tenantId !== removeUserFromTenantMutation.variables?.tenantId);
        setSelectedUser({ ...selectedUser, tenantMemberships: updatedMemberships });
      }
      toast({
        title: "Success",
        description: "User removed from tenant",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to remove user from tenant",
        variant: "destructive",
      });
    },
  });

  const handleCreateSubmit = (data: TenantFormData) => {
    createTenantMutation.mutate(data);
  };

  const handleEditSubmit = (data: TenantFormData) => {
    if (editingTenant) {
      updateTenantMutation.mutate({ id: editingTenant.id, data });
    }
  };

  const handleAddUserToTenantSubmit = (data: AddUserToTenantFormData) => {
    if (selectedUser) {
      addUserToTenantMutation.mutate({
        userId: selectedUser.id,
        tenantId: data.tenantId,
        roleInTenant: data.roleInTenant,
      });
    }
  };

  const handleRemoveUserFromTenant = (userId: string, tenantId: string) => {
    removeUserFromTenantMutation.mutate({ userId, tenantId });
  };

  const getAvailableTenants = () => {
    if (!selectedUser || !tenantsData?.tenants) return [];
    const memberTenantIds = new Set(selectedUser.tenantMemberships.map(m => m.tenantId));
    return tenantsData.tenants.filter(t => !memberTenantIds.has(t.id));
  };

  if (authLoading) return null;

  if (!isSuperAdmin(user)) {
    return null;
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "active":
        return "default";
      case "trial":
        return "secondary";
      case "suspended":
        return "destructive";
      default:
        return "outline";
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-6">
        <h2 className="text-3xl font-semibold text-foreground" data-testid="text-page-title">
          Super Admin Dashboard
        </h2>
        <p className="text-muted-foreground" data-testid="text-page-subtitle">
          {metricsLoading ? (
            <Skeleton className="h-4 w-64 inline-block" />
          ) : (
            <>
              {metricsData?.totalTenants ?? 0} tenants, {metricsData?.totalUsers ?? 0} users, {metricsData?.totalClients ?? 0} clients
            </>
          )}
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="flex flex-wrap h-auto gap-1">
          <TabsTrigger value="tenants" data-testid="tab-tenants">
            <Building2 className="mr-2 h-4 w-4" />
            Tenants
          </TabsTrigger>
          <TabsTrigger value="users" data-testid="tab-users">
            <Users className="mr-2 h-4 w-4" />
            Users
          </TabsTrigger>
          <TabsTrigger value="metrics" data-testid="tab-metrics">
            <BarChart3 className="mr-2 h-4 w-4" />
            Metrics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tenants">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-4">
              <div>
                <CardTitle>Tenants</CardTitle>
                <CardDescription>Manage all tenants on the platform</CardDescription>
              </div>
              <Button onClick={() => setIsCreateDialogOpen(true)} data-testid="button-create-tenant">
                <Plus className="mr-2 h-4 w-4" />
                Create Tenant
              </Button>
            </CardHeader>
            <CardContent>
              {tenantsLoading ? (
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
                    {tenantsData?.tenants?.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground">
                          No tenants found
                        </TableCell>
                      </TableRow>
                    ) : (
                      tenantsData?.tenants?.map((tenant) => (
                        <TableRow key={tenant.id} data-testid={`row-tenant-${tenant.id}`}>
                          <TableCell className="font-medium">{tenant.name}</TableCell>
                          <TableCell className="text-muted-foreground">{tenant.slug}</TableCell>
                          <TableCell>
                            <Badge variant={getStatusBadgeVariant(tenant.status)}>
                              {tenant.status}
                            </Badge>
                          </TableCell>
                          <TableCell>{tenant.userCount ?? 0}</TableCell>
                          <TableCell>{formatDate(tenant.createdAt)}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setEditingTenant(tenant)}
                                data-testid={`button-edit-tenant-${tenant.id}`}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setViewingTenantId(tenant.id)}
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

        <TabsContent value="users">
          <Card>
            <CardHeader>
              <CardTitle>Users</CardTitle>
              <CardDescription>View and manage users across all tenants. Click a row to manage memberships.</CardDescription>
            </CardHeader>
            <CardContent>
              {usersLoading ? (
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
                      <TableHead>Email</TableHead>
                      <TableHead>Super Admin</TableHead>
                      <TableHead>Tenant Memberships</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {usersData?.users?.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground">
                          No users found
                        </TableCell>
                      </TableRow>
                    ) : (
                      usersData?.users?.map((u) => (
                        <TableRow 
                          key={u.id} 
                          data-testid={`row-user-${u.id}`}
                          className="cursor-pointer hover-elevate"
                          onClick={() => setSelectedUser(u)}
                        >
                          <TableCell className="font-medium">
                            {u.firstName || u.lastName
                              ? `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim()
                              : "—"}
                          </TableCell>
                          <TableCell className="text-muted-foreground">{u.email ?? "—"}</TableCell>
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
                            <div className="flex flex-wrap gap-1">
                              {u.tenantMemberships?.length > 0 ? (
                                u.tenantMemberships.map((m) => (
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
                                setSelectedUser(u);
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
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="metrics">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card data-testid="card-metric-tenants">
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Tenants</CardTitle>
                <Building2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {metricsLoading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <div className="text-2xl font-bold">{metricsData?.totalTenants ?? 0}</div>
                )}
              </CardContent>
            </Card>

            <Card data-testid="card-metric-users">
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {metricsLoading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <div className="text-2xl font-bold">{metricsData?.totalUsers ?? 0}</div>
                )}
              </CardContent>
            </Card>

            <Card data-testid="card-metric-clients">
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Clients</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {metricsLoading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <div className="text-2xl font-bold">{metricsData?.totalClients ?? 0}</div>
                )}
              </CardContent>
            </Card>

            <Card data-testid="card-metric-active">
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Tenants</CardTitle>
                <Check className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {metricsLoading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <div className="text-2xl font-bold">{metricsData?.activeTenants ?? 0}</div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

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
                render={({ field }) => (
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
                render={({ field }) => (
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
                render={({ field }) => (
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
                <Button type="submit" disabled={createTenantMutation.isPending} data-testid="button-submit-create">
                  {createTenantMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
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
                render={({ field }) => (
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
                render={({ field }) => (
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
                render={({ field }) => (
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
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditingTenant(null)}
                  data-testid="button-cancel-edit"
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={updateTenantMutation.isPending} data-testid="button-submit-edit">
                  {updateTenantMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
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
            <DialogDescription>
              {tenantDetails?.tenant?.name ?? "Loading..."}
            </DialogDescription>
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
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewingTenantId(null)} data-testid="button-close-details">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedUser} onOpenChange={(open) => !open && setSelectedUser(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Manage User Memberships</DialogTitle>
            <DialogDescription>
              {selectedUser?.firstName || selectedUser?.lastName
                ? `${selectedUser?.firstName ?? ""} ${selectedUser?.lastName ?? ""}`.trim()
                : selectedUser?.email ?? "User"}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-medium mb-2">Current Memberships</h4>
              {selectedUser?.tenantMemberships?.length === 0 ? (
                <p className="text-sm text-muted-foreground">This user is not a member of any tenant.</p>
              ) : (
                <div className="space-y-2">
                  {selectedUser?.tenantMemberships?.map((m) => (
                    <div 
                      key={m.tenantId} 
                      className="flex items-center justify-between p-2 rounded-md border"
                      data-testid={`membership-${m.tenantId}`}
                    >
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{m.tenantName}</Badge>
                        <span className="text-sm text-muted-foreground">({m.roleInTenant})</span>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleRemoveUserFromTenant(selectedUser!.id, m.tenantId)}
                        disabled={removeUserFromTenantMutation.isPending}
                        data-testid={`button-remove-from-${m.tenantId}`}
                      >
                        {removeUserFromTenantMutation.isPending && 
                          removeUserFromTenantMutation.variables?.tenantId === m.tenantId ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4 text-destructive" />
                        )}
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="border-t pt-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-medium">Add to Tenant</h4>
                {!isAddToTenantOpen && getAvailableTenants().length > 0 && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setIsAddToTenantOpen(true)}
                    data-testid="button-show-add-form"
                  >
                    <UserPlus className="mr-2 h-4 w-4" />
                    Add to Tenant
                  </Button>
                )}
              </div>

              {getAvailableTenants().length === 0 && !isAddToTenantOpen && (
                <p className="text-sm text-muted-foreground">
                  This user is already a member of all available tenants.
                </p>
              )}

              {isAddToTenantOpen && (
                <Form {...addUserToTenantForm}>
                  <form onSubmit={addUserToTenantForm.handleSubmit(handleAddUserToTenantSubmit)} className="space-y-4">
                    <FormField
                      control={addUserToTenantForm.control}
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
                              {getAvailableTenants().map((t) => (
                                <SelectItem key={t.id} value={t.id}>
                                  {t.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={addUserToTenantForm.control}
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
                              <SelectItem value="org_admin">Org Admin</SelectItem>
                              <SelectItem value="agent">Agent</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsAddToTenantOpen(false)}
                        data-testid="button-cancel-add"
                      >
                        Cancel
                      </Button>
                      <Button 
                        type="submit" 
                        disabled={addUserToTenantMutation.isPending}
                        data-testid="button-submit-add"
                      >
                        {addUserToTenantMutation.isPending && (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        Add
                      </Button>
                    </div>
                  </form>
                </Form>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setSelectedUser(null);
                setIsAddToTenantOpen(false);
              }}
              data-testid="button-close-user-dialog"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
