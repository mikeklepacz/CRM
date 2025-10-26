import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { UserPlus, Mail, User as UserIcon, Briefcase, Lock, Shield, DollarSign, TrendingUp, Loader2, UserX, UserCheck, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";

interface UserWithMetrics {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  agentName: string | null;
  role: string;
  isActive?: boolean;
  totalSales: number;
  grossIncome: string;
  createdAt: string;
  referredBy?: string | null;
}

export function UserManagement() {
  const { toast } = useToast();
  const { user: currentUser } = useAuth();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("active");
  const [deactivateDialog, setDeactivateDialog] = useState<{ open: boolean; userId: string; analysis: any } | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; userId: string; userEmail: string } | null>(null);
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);
  const [newUser, setNewUser] = useState({
    email: "",
    firstName: "",
    lastName: "",
    agentName: "",
    password: "",
    role: "agent",
    selectedCategory: "",
    referredBy: null as string | null,
  });

  // Fetch all users with metrics
  const { data, isLoading, error } = useQuery<{ users: UserWithMetrics[] }>({
    queryKey: ['/api/users'],
  });

  // Fetch available categories for user creation
  const { data: categoriesData } = useQuery<{categories: Array<{id: string, name: string}>}>({
    queryKey: ['/api/categories/active'],
  });
  const categories = categoriesData?.categories;

  // Create user mutation
  const createUserMutation = useMutation({
    mutationFn: async (userData: typeof newUser) => {
      return await apiRequest("POST", "/api/users", userData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      setIsCreateDialogOpen(false);
      setNewUser({
        email: "",
        firstName: "",
        lastName: "",
        agentName: "",
        password: "",
        role: "agent",
        selectedCategory: "",
        referredBy: null,
      });
      toast({
        title: "Success",
        description: "User created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create user",
        variant: "destructive",
      });
    },
  });

  // Deactivate user mutation
  const deactivateUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      return await apiRequest("POST", `/api/users/${userId}/deactivate`, {});
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      setDeactivateDialog(null);
      toast({
        title: "Success",
        description: data.message || "User deactivated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to deactivate user",
        variant: "destructive",
      });
    },
  });

  // Reactivate user mutation
  const reactivateUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      return await apiRequest("POST", `/api/users/${userId}/reactivate`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      toast({
        title: "Success",
        description: "User reactivated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to reactivate user",
        variant: "destructive",
      });
    },
  });

  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      return await apiRequest("DELETE", `/api/admin/users/${userId}`, {});
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      setDeleteDialog(null);
      toast({
        title: "Success",
        description: data.message || "User permanently deleted",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete user",
        variant: "destructive",
      });
    },
  });

  const handleCreateUser = () => {
    if (!newUser.email || !newUser.agentName || !newUser.password) {
      toast({
        title: "Validation Error",
        description: "Email, agent name, and password are required",
        variant: "destructive",
      });
      return;
    }
    createUserMutation.mutate(newUser);
  };

  const handleDeactivateClick = async (userId: string) => {
    setLoadingAnalysis(true);
    try {
      const response = await fetch(`/api/users/${userId}/listing-analysis`, {
        method: "GET",
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error(await response.text());
      }
      const analysis = await response.json();
      setDeactivateDialog({ open: true, userId, analysis });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to analyze user listings",
        variant: "destructive",
      });
    } finally {
      setLoadingAnalysis(false);
    }
  };

  const handleDeactivateConfirm = () => {
    if (deactivateDialog) {
      deactivateUserMutation.mutate(deactivateDialog.userId);
    }
  };

  const handleReactivate = (userId: string) => {
    reactivateUserMutation.mutate(userId);
  };

  const handleDeleteClick = (userId: string, userEmail: string) => {
    setDeleteDialog({ open: true, userId, userEmail });
  };

  const handleDeleteConfirm = () => {
    if (deleteDialog) {
      deleteUserMutation.mutate(deleteDialog.userId);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>User Management</CardTitle>
          <CardDescription>Loading users...</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>User Management</CardTitle>
          <CardDescription>Error loading users</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-destructive text-sm">Failed to load users. Please try again.</p>
        </CardContent>
      </Card>
    );
  }

  const users = data?.users || [];
  const activeUsers = users.filter(u => u.isActive !== false);
  const inactiveUsers = users.filter(u => u.isActive === false);
  const displayedUsers = activeTab === "active" ? activeUsers : inactiveUsers;
  const totalGrossIncome = users.reduce((sum, user) => sum + parseFloat(user.grossIncome || "0"), 0);
  const totalSales = users.reduce((sum, user) => sum + user.totalSales, 0);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <UserIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-users">{activeUsers.length}</div>
            <p className="text-xs text-muted-foreground">
              {activeUsers.filter(u => u.role === 'admin').length} admins, {activeUsers.filter(u => u.role === 'agent').length} agents
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-sales">{totalSales}</div>
            <p className="text-xs text-muted-foreground">Across all agents</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gross Income</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-gross-income">${totalGrossIncome.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Total revenue generated</p>
          </CardContent>
        </Card>
      </div>

      {/* Users Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Users</CardTitle>
            <CardDescription>Manage user accounts and view sales performance</CardDescription>
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-create-user">
                <UserPlus className="h-4 w-4 mr-2" />
                Create User
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New User</DialogTitle>
                <DialogDescription>
                  Add a new agent or admin to the system
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="agent@example.com"
                      className="pl-10"
                      value={newUser.email}
                      onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                      data-testid="input-user-email"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name</Label>
                    <Input
                      id="firstName"
                      placeholder="John"
                      value={newUser.firstName}
                      onChange={(e) => setNewUser({ ...newUser, firstName: e.target.value })}
                      data-testid="input-user-firstname"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input
                      id="lastName"
                      placeholder="Doe"
                      value={newUser.lastName}
                      onChange={(e) => setNewUser({ ...newUser, lastName: e.target.value })}
                      data-testid="input-user-lastname"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="agentName">Agent Name *</Label>
                  <div className="relative">
                    <Briefcase className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="agentName"
                      placeholder="John Doe (must match Google Sheets)"
                      className="pl-10"
                      value={newUser.agentName}
                      onChange={(e) => setNewUser({ ...newUser, agentName: e.target.value })}
                      data-testid="input-user-agentname"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    This name must match exactly with the Agent column in your Google Sheets
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password *</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type="password"
                      placeholder="Enter password for login"
                      className="pl-10"
                      value={newUser.password}
                      onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                      data-testid="input-user-password"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <Select value={newUser.role} onValueChange={(value) => setNewUser({ ...newUser, role: value })}>
                    <SelectTrigger id="role" data-testid="select-user-role">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="agent">Agent</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category">CRM Category Filter</Label>
                  <Select value={newUser.selectedCategory} onValueChange={(value) => setNewUser({ ...newUser, selectedCategory: value })}>
                    <SelectTrigger id="category" data-testid="select-user-category">
                      <SelectValue placeholder="Select category..." />
                    </SelectTrigger>
                    <SelectContent>
                      {categories?.map((category) => (
                        <SelectItem key={category.id} value={category.name}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-muted-foreground">
                    User will only see stores from this category in their CRM
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="referredBy">Referred By (Optional)</Label>
                  <Select value={newUser.referredBy || "none"} onValueChange={(value) => setNewUser({ ...newUser, referredBy: value === "none" ? null : value })}>
                    <SelectTrigger id="referredBy" data-testid="select-user-referredby">
                      <SelectValue placeholder="Select referring agent..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {data?.users?.filter(u => u.role === 'agent' && u.isActive !== false).map((agent) => (
                        <SelectItem key={agent.id} value={agent.id}>
                          {agent.agentName || `${agent.firstName} ${agent.lastName}`.trim() || agent.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-muted-foreground">
                    If this agent was referred by another agent, select who referred them
                  </p>
                </div>
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsCreateDialogOpen(false)}
                  disabled={createUserMutation.isPending}
                  data-testid="button-cancel-create-user"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateUser}
                  disabled={createUserMutation.isPending}
                  data-testid="button-save-user"
                >
                  {createUserMutation.isPending && (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  )}
                  Create User
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>

        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="mb-4">
              <TabsTrigger value="active" data-testid="tab-active-users">
                Active Users ({activeUsers.length})
              </TabsTrigger>
              <TabsTrigger value="inactive" data-testid="tab-inactive-users">
                Inactive Users ({inactiveUsers.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="active">
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Agent Name</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Referred By</TableHead>
                      <TableHead className="text-right">Total Sales</TableHead>
                      <TableHead className="text-right">Gross Income</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {displayedUsers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                          No active users found
                        </TableCell>
                      </TableRow>
                    ) : (
                      displayedUsers.map((user) => (
                        <TableRow key={user.id} data-testid={`row-user-${user.id}`}>
                          <TableCell className="font-medium">
                            {user.firstName || user.lastName
                              ? `${user.firstName || ''} ${user.lastName || ''}`.trim()
                              : '-'}
                          </TableCell>
                          <TableCell>{user.email || '-'}</TableCell>
                          <TableCell>{user.agentName || '-'}</TableCell>
                          <TableCell>
                            <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                              {user.role === 'admin' && <Shield className="h-3 w-3 mr-1" />}
                              {user.role}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {user.referredBy ? (
                              data?.users.find(u => u.id === user.referredBy)?.agentName || 
                              data?.users.find(u => u.id === user.referredBy)?.email || 
                              '-'
                            ) : '-'}
                          </TableCell>
                          <TableCell className="text-right" data-testid={`text-sales-${user.id}`}>
                            {user.totalSales}
                          </TableCell>
                          <TableCell className="text-right font-medium" data-testid={`text-income-${user.id}`}>
                            ${parseFloat(user.grossIncome || "0").toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right">
                            {user.id !== currentUser?.id ? (
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => handleDeactivateClick(user.id)}
                                disabled={loadingAnalysis || deactivateUserMutation.isPending}
                                data-testid={`button-deactivate-${user.id}`}
                              >
                                {loadingAnalysis ? (
                                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                ) : (
                                  <UserX className="h-3 w-3 mr-1" />
                                )}
                                Deactivate
                              </Button>
                            ) : (
                              <span className="text-sm text-muted-foreground">You</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            <TabsContent value="inactive">
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Agent Name</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Referred By</TableHead>
                      <TableHead className="text-right">Total Sales</TableHead>
                      <TableHead className="text-right">Gross Income</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {displayedUsers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                          No inactive users found
                        </TableCell>
                      </TableRow>
                    ) : (
                      displayedUsers.map((user) => (
                        <TableRow key={user.id} data-testid={`row-user-${user.id}`}>
                          <TableCell className="font-medium">
                            {user.firstName || user.lastName
                              ? `${user.firstName || ''} ${user.lastName || ''}`.trim()
                              : '-'}
                          </TableCell>
                          <TableCell>{user.email || '-'}</TableCell>
                          <TableCell>{user.agentName || '-'}</TableCell>
                          <TableCell>
                            <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                              {user.role === 'admin' && <Shield className="h-3 w-3 mr-1" />}
                              {user.role}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {user.referredBy ? (
                              data?.users.find(u => u.id === user.referredBy)?.agentName || 
                              data?.users.find(u => u.id === user.referredBy)?.email || 
                              '-'
                            ) : '-'}
                          </TableCell>
                          <TableCell className="text-right" data-testid={`text-sales-${user.id}`}>
                            {user.totalSales}
                          </TableCell>
                          <TableCell className="text-right font-medium" data-testid={`text-income-${user.id}`}>
                            ${parseFloat(user.grossIncome || "0").toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right">
                            {user.id !== currentUser?.id ? (
                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="default"
                                  size="sm"
                                  onClick={() => handleReactivate(user.id)}
                                  disabled={reactivateUserMutation.isPending || deleteUserMutation.isPending}
                                  data-testid={`button-reactivate-${user.id}`}
                                >
                                  {reactivateUserMutation.isPending ? (
                                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                  ) : (
                                    <UserCheck className="h-3 w-3 mr-1" />
                                  )}
                                  Reactivate
                                </Button>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => handleDeleteClick(user.id, user.email || '')}
                                  disabled={reactivateUserMutation.isPending || deleteUserMutation.isPending}
                                  data-testid={`button-delete-${user.id}`}
                                >
                                  {deleteUserMutation.isPending ? (
                                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                  ) : (
                                    <Trash2 className="h-3 w-3 mr-1" />
                                  )}
                                  Delete
                                </Button>
                              </div>
                            ) : (
                              <span className="text-sm text-muted-foreground">You</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Deactivation Confirmation Dialog */}
      <AlertDialog open={deactivateDialog?.open || false} onOpenChange={(open) => !open && setDeactivateDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate User</AlertDialogTitle>
            <AlertDialogDescription>
              {deactivateDialog?.analysis && (
                <div className="space-y-3">
                  <p>This action will deactivate the user and release their unclosed listings:</p>

                  <div className="bg-muted p-3 rounded-md space-y-2">
                    <div className="flex justify-between">
                      <span className="font-medium">Protected Listings (with Transaction IDs):</span>
                      <span className="font-bold text-green-600">{deactivateDialog.analysis.protectedCount}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      These will stay assigned to this agent (10% commission for life)
                    </p>
                  </div>

                  <div className="bg-muted p-3 rounded-md space-y-2">
                    <div className="flex justify-between">
                      <span className="font-medium">Releasable Listings (no Transaction IDs):</span>
                      <span className="font-bold text-orange-600">{deactivateDialog.analysis.releasableCount}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      These will be marked as "7 – Warm" and made available for other agents
                    </p>
                  </div>

                  <p className="text-sm font-medium">Are you sure you want to proceed?</p>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeactivateDialog(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeactivateConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deactivateUserMutation.isPending}
            >
              {deactivateUserMutation.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Deactivate User
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialog?.open || false} onOpenChange={(open) => !open && setDeleteDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive">⚠️ Permanently Delete User</AlertDialogTitle>
            <AlertDialogDescription>
              <div className="space-y-4">
                <div className="bg-destructive/10 border border-destructive/50 p-4 rounded-md">
                  <p className="font-bold text-destructive">This action cannot be undone!</p>
                </div>

                <p className="font-medium">
                  You are about to permanently delete user: <span className="font-bold">{deleteDialog?.userEmail}</span>
                </p>

                <div className="space-y-2">
                  <p className="text-sm font-medium">This will permanently delete:</p>
                  <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                    <li>All user data and preferences</li>
                    <li>All reminders and calendar integrations</li>
                    <li>All AI conversations and chat history</li>
                    <li>All templates and knowledge base files</li>
                    <li>All support tickets and messages</li>
                  </ul>
                </div>

                <p className="text-sm font-medium text-destructive">
                  Are you absolutely sure you want to permanently delete this user?
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteDialog(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteUserMutation.isPending}
            >
              {deleteUserMutation.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Yes, Permanently Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}