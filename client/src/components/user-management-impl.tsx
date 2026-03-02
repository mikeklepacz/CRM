import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { UserManagementSummaryCards } from "@/components/user-management/user-management-summary-cards";
import { UserManagementCreateUserDialog } from "@/components/user-management/user-management-create-user-dialog";
import { UserManagementUsersTable } from "@/components/user-management/user-management-users-table";
import { UserManagementDialogs } from "@/components/user-management/user-management-dialogs";
import { useUserManagementData } from "@/components/user-management/use-user-management-data";

interface UserWithMetrics {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  agentName: string | null;
  role: string;
  isActive?: boolean;
  hasVoiceAccess?: boolean;
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
  const [resetPasswordDialog, setResetPasswordDialog] = useState<{ open: boolean; userId: string; userEmail: string; userName: string } | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
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

  const {
    usersQuery,
    categoriesQuery,
    createUserMutation,
    deactivateUserMutation,
    reactivateUserMutation,
    deleteUserMutation,
    toggleVoiceAccessMutation,
    resetPasswordMutation,
  } = useUserManagementData({
    newUser,
    setIsCreateDialogOpen,
    setNewUser,
    setDeactivateDialog,
    setDeleteDialog,
    setResetPasswordDialog,
    setNewPassword,
    setConfirmPassword,
    toast,
  });
  const data = usersQuery.data as { users: UserWithMetrics[] } | undefined;
  const isLoading = usersQuery.isLoading;
  const error = usersQuery.error;
  const categories = categoriesQuery.data?.categories;

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

  const handleResetPasswordClick = (userId: string, userEmail: string, userName: string) => {
    setResetPasswordDialog({ open: true, userId, userEmail, userName });
    setNewPassword("");
    setConfirmPassword("");
  };

  const handleResetPasswordConfirm = () => {
    if (!resetPasswordDialog) return;

    if (!newPassword) {
      toast({
        title: "Validation Error",
        description: "Password is required",
        variant: "destructive",
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: "Validation Error",
        description: "Password must be at least 6 characters",
        variant: "destructive",
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: "Validation Error",
        description: "Passwords do not match",
        variant: "destructive",
      });
      return;
    }

    resetPasswordMutation.mutate({
      userId: resetPasswordDialog.userId,
      newPassword,
    });
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
  const totalGrossIncome = users.reduce((sum, user) => sum + parseFloat(user.grossIncome || "0"), 0);
  const totalSales = users.reduce((sum, user) => sum + user.totalSales, 0);
  const getReferrerName = (referrerId: string) =>
    data?.users.find((u) => u.id === referrerId)?.agentName || data?.users.find((u) => u.id === referrerId)?.email || "-";

  return (
    <div className="space-y-6">
      <UserManagementSummaryCards activeUsers={activeUsers} totalSales={totalSales} totalGrossIncome={totalGrossIncome} />

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Users</CardTitle>
            <CardDescription>Manage user accounts and view sales performance</CardDescription>
          </div>
          <UserManagementCreateUserDialog
            isCreateDialogOpen={isCreateDialogOpen}
            setIsCreateDialogOpen={setIsCreateDialogOpen}
            newUser={newUser}
            setNewUser={setNewUser}
            categories={categories}
            users={data?.users || []}
            createUserMutation={createUserMutation}
            handleCreateUser={handleCreateUser}
          />
        </CardHeader>

        <CardContent>
          <UserManagementUsersTable
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            activeUsers={activeUsers}
            inactiveUsers={inactiveUsers}
            currentUserId={currentUser?.id}
            handleDeactivateClick={handleDeactivateClick}
            handleReactivate={handleReactivate}
            handleDeleteClick={handleDeleteClick}
            handleResetPasswordClick={handleResetPasswordClick}
            deactivateUserMutation={deactivateUserMutation}
            reactivateUserMutation={reactivateUserMutation}
            deleteUserMutation={deleteUserMutation}
            toggleVoiceAccessMutation={toggleVoiceAccessMutation}
            loadingAnalysis={loadingAnalysis}
            getReferrerName={getReferrerName}
          />
        </CardContent>
      </Card>

      <UserManagementDialogs
        deactivateDialog={deactivateDialog}
        setDeactivateDialog={setDeactivateDialog}
        handleDeactivateConfirm={handleDeactivateConfirm}
        deactivateUserMutation={deactivateUserMutation}
        deleteDialog={deleteDialog}
        setDeleteDialog={setDeleteDialog}
        handleDeleteConfirm={handleDeleteConfirm}
        deleteUserMutation={deleteUserMutation}
        resetPasswordDialog={resetPasswordDialog}
        setResetPasswordDialog={setResetPasswordDialog}
        newPassword={newPassword}
        setNewPassword={setNewPassword}
        confirmPassword={confirmPassword}
        setConfirmPassword={setConfirmPassword}
        handleResetPasswordConfirm={handleResetPasswordConfirm}
        resetPasswordMutation={resetPasswordMutation}
      />
    </div>
  );
}
