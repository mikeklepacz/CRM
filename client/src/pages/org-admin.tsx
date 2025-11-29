import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { canAccessAdminFeatures } from "@/lib/authUtils";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Users, Settings as SettingsIcon, BarChart3, Plus, Trash2, Loader2, UserPlus, Mail, X } from "lucide-react";

interface TenantUser {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  roleInTenant: string;
  joinedAt: string | null;
}

interface Tenant {
  id: string;
  name: string;
  slug: string;
  status: string;
  settings: {
    companyName?: string;
    timezone?: string;
    enabledModules?: string[];
    primaryColor?: string;
    logoUrl?: string;
  };
  createdAt: string;
}

interface TenantStats {
  userCount: number;
  clientCount: number;
  callCount: number;
}

interface TenantInvite {
  id: string;
  email: string;
  role: string;
  status: string;
  expiresAt: string;
  createdAt: string;
}

const inviteFormSchema = z.object({
  email: z.string().email("Invalid email address"),
  role: z.enum(["org_admin", "agent"]),
});

type InviteFormData = z.infer<typeof inviteFormSchema>;

const settingsFormSchema = z.object({
  companyName: z.string().optional(),
  timezone: z.string().optional(),
  enabledModules: z.array(z.string()).optional(),
});

type SettingsFormData = z.infer<typeof settingsFormSchema>;

const AVAILABLE_MODULES = [
  { id: "voice", label: "Voice AI" },
  { id: "ehub", label: "E-Hub" },
  { id: "crm", label: "CRM" },
  { id: "kb", label: "Knowledge Base" },
];

const TIMEZONES = [
  { value: "America/New_York", label: "Eastern Time (ET)" },
  { value: "America/Chicago", label: "Central Time (CT)" },
  { value: "America/Denver", label: "Mountain Time (MT)" },
  { value: "America/Los_Angeles", label: "Pacific Time (PT)" },
  { value: "America/Anchorage", label: "Alaska Time (AKT)" },
  { value: "Pacific/Honolulu", label: "Hawaii Time (HT)" },
  { value: "UTC", label: "UTC" },
];

export default function OrgAdmin() {
  const { user, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("team");
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [userToRemove, setUserToRemove] = useState<TenantUser | null>(null);
  const [roleChangeUser, setRoleChangeUser] = useState<{ user: TenantUser; newRole: string } | null>(null);

  useEffect(() => {
    if (!authLoading && user && !canAccessAdminFeatures(user)) {
      setLocation('/');
    }
  }, [user, authLoading, setLocation]);

  const { data: usersData, isLoading: usersLoading } = useQuery<{ users: TenantUser[] }>({
    queryKey: ['/api/org-admin/users'],
    enabled: canAccessAdminFeatures(user),
  });

  const { data: settingsData, isLoading: settingsLoading } = useQuery<{ tenant: Tenant }>({
    queryKey: ['/api/org-admin/settings'],
    enabled: canAccessAdminFeatures(user),
  });

  const { data: statsData, isLoading: statsLoading } = useQuery<TenantStats>({
    queryKey: ['/api/org-admin/stats'],
    enabled: canAccessAdminFeatures(user),
  });

  const { data: invitesData, isLoading: invitesLoading } = useQuery<{ invites: TenantInvite[] }>({
    queryKey: ['/api/org-admin/invites'],
    enabled: canAccessAdminFeatures(user),
  });

  const inviteForm = useForm<InviteFormData>({
    resolver: zodResolver(inviteFormSchema),
    defaultValues: {
      email: "",
      role: "agent",
    },
  });

  const settingsForm = useForm<SettingsFormData>({
    resolver: zodResolver(settingsFormSchema),
    defaultValues: {
      companyName: "",
      timezone: "",
      enabledModules: [],
    },
  });

  useEffect(() => {
    if (settingsData?.tenant?.settings) {
      settingsForm.reset({
        companyName: settingsData.tenant.settings.companyName || "",
        timezone: settingsData.tenant.settings.timezone || "",
        enabledModules: settingsData.tenant.settings.enabledModules || [],
      });
    }
  }, [settingsData, settingsForm]);

  const createInviteMutation = useMutation({
    mutationFn: async (data: InviteFormData) => {
      return await apiRequest("POST", "/api/org-admin/invites", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/org-admin/invites'] });
      setIsInviteDialogOpen(false);
      inviteForm.reset();
      toast({
        title: "Success",
        description: "Invitation sent successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send invitation",
        variant: "destructive",
      });
    },
  });

  const cancelInviteMutation = useMutation({
    mutationFn: async (inviteId: string) => {
      return await apiRequest("DELETE", `/api/org-admin/invites/${inviteId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/org-admin/invites'] });
      toast({
        title: "Success",
        description: "Invitation cancelled",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to cancel invitation",
        variant: "destructive",
      });
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      return await apiRequest("PATCH", `/api/org-admin/users/${userId}/role`, { role });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/org-admin/users'] });
      setRoleChangeUser(null);
      toast({
        title: "Success",
        description: "User role updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update user role",
        variant: "destructive",
      });
    },
  });

  const removeUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      return await apiRequest("DELETE", `/api/org-admin/users/${userId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/org-admin/users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/org-admin/stats'] });
      setUserToRemove(null);
      toast({
        title: "Success",
        description: "User removed from organization",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to remove user",
        variant: "destructive",
      });
    },
  });

  const updateSettingsMutation = useMutation({
    mutationFn: async (data: SettingsFormData) => {
      return await apiRequest("PATCH", "/api/org-admin/settings", { settings: data });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/org-admin/settings'] });
      toast({
        title: "Success",
        description: "Settings updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update settings",
        variant: "destructive",
      });
    },
  });

  const handleInviteSubmit = (data: InviteFormData) => {
    createInviteMutation.mutate(data);
  };

  const handleSettingsSubmit = (data: SettingsFormData) => {
    updateSettingsMutation.mutate(data);
  };

  if (authLoading) return null;

  if (!canAccessAdminFeatures(user)) {
    return null;
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "—";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case "org_admin":
        return "default";
      case "agent":
        return "secondary";
      default:
        return "outline";
    }
  };

  const getInviteStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "pending":
        return "secondary";
      case "accepted":
        return "default";
      case "expired":
      case "cancelled":
        return "destructive";
      default:
        return "outline";
    }
  };

  const pendingInvites = invitesData?.invites?.filter(i => i.status === "pending") || [];

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-6">
        <h2 className="text-3xl font-semibold text-foreground" data-testid="text-page-title">
          Organization Admin
        </h2>
        <p className="text-muted-foreground" data-testid="text-page-subtitle">
          {settingsLoading ? (
            <Skeleton className="h-4 w-64 inline-block" />
          ) : (
            <>Manage {settingsData?.tenant?.name || "your organization"}</>
          )}
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="flex flex-wrap h-auto gap-1">
          <TabsTrigger value="team" data-testid="tab-team">
            <Users className="mr-2 h-4 w-4" />
            Team
          </TabsTrigger>
          <TabsTrigger value="settings" data-testid="tab-settings">
            <SettingsIcon className="mr-2 h-4 w-4" />
            Settings
          </TabsTrigger>
          <TabsTrigger value="stats" data-testid="tab-stats">
            <BarChart3 className="mr-2 h-4 w-4" />
            Stats
          </TabsTrigger>
        </TabsList>

        <TabsContent value="team">
          <div className="space-y-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-4">
                <div>
                  <CardTitle>Team Members</CardTitle>
                  <CardDescription>Manage users in your organization</CardDescription>
                </div>
                <Button onClick={() => setIsInviteDialogOpen(true)} data-testid="button-invite-user">
                  <UserPlus className="mr-2 h-4 w-4" />
                  Invite User
                </Button>
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
                        <TableHead>Role</TableHead>
                        <TableHead>Joined</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {usersData?.users?.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-muted-foreground">
                            No team members found
                          </TableCell>
                        </TableRow>
                      ) : (
                        usersData?.users?.map((u) => (
                          <TableRow key={u.id} data-testid={`row-user-${u.id}`}>
                            <TableCell className="font-medium">
                              {u.firstName || u.lastName
                                ? `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim()
                                : "—"}
                            </TableCell>
                            <TableCell className="text-muted-foreground">{u.email ?? "—"}</TableCell>
                            <TableCell>
                              <Select
                                value={u.roleInTenant}
                                onValueChange={(newRole) => setRoleChangeUser({ user: u, newRole })}
                                disabled={u.id === user?.id}
                              >
                                <SelectTrigger 
                                  className="w-32" 
                                  data-testid={`select-role-${u.id}`}
                                  disabled={u.id === user?.id}
                                >
                                  <SelectValue>
                                    <Badge variant={getRoleBadgeVariant(u.roleInTenant)} className="no-default-hover-elevate no-default-active-elevate">
                                      {u.roleInTenant === "org_admin" ? "Admin" : "Agent"}
                                    </Badge>
                                  </SelectValue>
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="org_admin">Admin</SelectItem>
                                  <SelectItem value="agent">Agent</SelectItem>
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell>{formatDate(u.joinedAt)}</TableCell>
                            <TableCell className="text-right">
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => setUserToRemove(u)}
                                disabled={u.id === user?.id}
                                data-testid={`button-remove-user-${u.id}`}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
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

            {pendingInvites.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Mail className="h-5 w-5" />
                    Pending Invitations
                  </CardTitle>
                  <CardDescription>Invitations that haven't been accepted yet</CardDescription>
                </CardHeader>
                <CardContent>
                  {invitesLoading ? (
                    <div className="space-y-3">
                      {[1, 2].map((i) => (
                        <Skeleton key={i} className="h-12 w-full" />
                      ))}
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Email</TableHead>
                          <TableHead>Role</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Expires</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {pendingInvites.map((invite) => (
                          <TableRow key={invite.id} data-testid={`row-invite-${invite.id}`}>
                            <TableCell className="font-medium">{invite.email}</TableCell>
                            <TableCell>
                              <Badge variant={getRoleBadgeVariant(invite.role)} className="no-default-hover-elevate no-default-active-elevate">
                                {invite.role === "org_admin" ? "Admin" : "Agent"}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant={getInviteStatusBadgeVariant(invite.status)} className="no-default-hover-elevate no-default-active-elevate">
                                {invite.status}
                              </Badge>
                            </TableCell>
                            <TableCell>{formatDate(invite.expiresAt)}</TableCell>
                            <TableCell className="text-right">
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => cancelInviteMutation.mutate(invite.id)}
                                disabled={cancelInviteMutation.isPending}
                                data-testid={`button-cancel-invite-${invite.id}`}
                              >
                                {cancelInviteMutation.isPending ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <X className="h-4 w-4 text-destructive" />
                                )}
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>Organization Settings</CardTitle>
              <CardDescription>Configure your organization's settings</CardDescription>
            </CardHeader>
            <CardContent>
              {settingsLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3, 4].map((i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : (
                <Form {...settingsForm}>
                  <form onSubmit={settingsForm.handleSubmit(handleSettingsSubmit)} className="space-y-6">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Organization Name</label>
                        <Input 
                          value={settingsData?.tenant?.name || ""} 
                          disabled 
                          className="bg-muted"
                          data-testid="input-org-name"
                        />
                        <p className="text-xs text-muted-foreground">Contact support to change organization name</p>
                      </div>

                      <FormField
                        control={settingsForm.control}
                        name="companyName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Company Name (Branding)</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="Your Company Name" 
                                {...field} 
                                data-testid="input-company-name"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={settingsForm.control}
                      name="timezone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Default Timezone</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-timezone">
                                <SelectValue placeholder="Select timezone" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {TIMEZONES.map((tz) => (
                                <SelectItem key={tz.value} value={tz.value}>
                                  {tz.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={settingsForm.control}
                      name="enabledModules"
                      render={() => (
                        <FormItem>
                          <FormLabel>Enabled Modules</FormLabel>
                          <div className="grid grid-cols-2 gap-4 pt-2">
                            {AVAILABLE_MODULES.map((module) => (
                              <FormField
                                key={module.id}
                                control={settingsForm.control}
                                name="enabledModules"
                                render={({ field }) => (
                                  <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                                    <FormControl>
                                      <Checkbox
                                        checked={field.value?.includes(module.id)}
                                        onCheckedChange={(checked) => {
                                          const current = field.value || [];
                                          if (checked) {
                                            field.onChange([...current, module.id]);
                                          } else {
                                            field.onChange(current.filter((v) => v !== module.id));
                                          }
                                        }}
                                        data-testid={`checkbox-module-${module.id}`}
                                      />
                                    </FormControl>
                                    <FormLabel className="font-normal cursor-pointer">
                                      {module.label}
                                    </FormLabel>
                                  </FormItem>
                                )}
                              />
                            ))}
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button 
                      type="submit" 
                      disabled={updateSettingsMutation.isPending}
                      data-testid="button-save-settings"
                    >
                      {updateSettingsMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Save Settings
                    </Button>
                  </form>
                </Form>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stats">
          <div className="grid gap-4 md:grid-cols-3">
            <Card data-testid="card-stat-users">
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Team Members</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {statsLoading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <div className="text-2xl font-bold" data-testid="text-stat-users">
                    {statsData?.userCount ?? 0}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card data-testid="card-stat-clients">
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Clients</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {statsLoading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <div className="text-2xl font-bold" data-testid="text-stat-clients">
                    {statsData?.clientCount ?? 0}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card data-testid="card-stat-calls">
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Calls</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {statsLoading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <div className="text-2xl font-bold" data-testid="text-stat-calls">
                    {statsData?.callCount ?? 0}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite User</DialogTitle>
            <DialogDescription>Send an invitation to join your organization</DialogDescription>
          </DialogHeader>
          <Form {...inviteForm}>
            <form onSubmit={inviteForm.handleSubmit(handleInviteSubmit)} className="space-y-4">
              <FormField
                control={inviteForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email Address</FormLabel>
                    <FormControl>
                      <Input 
                        type="email"
                        placeholder="user@example.com" 
                        {...field} 
                        data-testid="input-invite-email" 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={inviteForm.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-invite-role">
                          <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="agent">Agent</SelectItem>
                        <SelectItem value="org_admin">Admin</SelectItem>
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
                  onClick={() => setIsInviteDialogOpen(false)}
                  data-testid="button-cancel-invite-dialog"
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={createInviteMutation.isPending} data-testid="button-submit-invite">
                  {createInviteMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Send Invitation
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!roleChangeUser} onOpenChange={(open) => !open && setRoleChangeUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change User Role</DialogTitle>
            <DialogDescription>
              Are you sure you want to change {roleChangeUser?.user.firstName || roleChangeUser?.user.email || "this user"}'s role to {roleChangeUser?.newRole === "org_admin" ? "Admin" : "Agent"}?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setRoleChangeUser(null)}
              data-testid="button-cancel-role-change"
            >
              Cancel
            </Button>
            <Button 
              onClick={() => roleChangeUser && updateRoleMutation.mutate({ userId: roleChangeUser.user.id, role: roleChangeUser.newRole })}
              disabled={updateRoleMutation.isPending}
              data-testid="button-confirm-role-change"
            >
              {updateRoleMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!userToRemove} onOpenChange={(open) => !open && setUserToRemove(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove User</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove {userToRemove?.firstName || userToRemove?.email || "this user"} from the organization? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setUserToRemove(null)}
              data-testid="button-cancel-remove"
            >
              Cancel
            </Button>
            <Button 
              variant="destructive"
              onClick={() => userToRemove && removeUserMutation.mutate(userToRemove.id)}
              disabled={removeUserMutation.isPending}
              data-testid="button-confirm-remove"
            >
              {removeUserMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Remove User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
