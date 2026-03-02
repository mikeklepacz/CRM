import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { SuperAdminUserDialogMemberships } from "@/components/super-admin/super-admin-user-dialog-memberships";
import { SuperAdminUserDialogProfile } from "@/components/super-admin/super-admin-user-dialog-profile";

export function SuperAdminUserManagementDialog(props: any) {
  const p = props;

  return (
    <Dialog open={!!p.selectedUser} onOpenChange={(open) => !open && p.handleCloseUserDialog()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Manage User</DialogTitle>
          <DialogDescription>
            {p.selectedUser?.firstName || p.selectedUser?.lastName
              ? `${p.selectedUser?.firstName ?? ""} ${p.selectedUser?.lastName ?? ""}`.trim()
              : p.selectedUser?.email ?? "User"}
            {p.selectedUser?.isActive === false && (
              <Badge variant="destructive" className="ml-2">Inactive</Badge>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <SuperAdminUserDialogProfile
            confirmPassword={p.confirmPassword}
            deactivateUserMutation={p.deactivateUserMutation}
            editUserForm={p.editUserForm}
            handleDeactivateUser={p.handleDeactivateUser}
            handleEditUserSubmit={p.handleEditUserSubmit}
            handleReactivateUser={p.handleReactivateUser}
            handleResetPasswordSubmit={p.handleResetPasswordSubmit}
            isEditingUser={p.isEditingUser}
            isResettingPassword={p.isResettingPassword}
            newPassword={p.newPassword}
            reactivateUserMutation={p.reactivateUserMutation}
            resetPasswordMutation={p.resetPasswordMutation}
            selectedUser={p.selectedUser}
            setConfirmPassword={p.setConfirmPassword}
            setIsEditingUser={p.setIsEditingUser}
            setIsResettingPassword={p.setIsResettingPassword}
            setNewPassword={p.setNewPassword}
            toggleVoiceAccessMutation={p.toggleVoiceAccessMutation}
            updateUserMutation={p.updateUserMutation}
          />

          <Separator />

          <SuperAdminUserDialogMemberships
            addUserToTenantForm={p.addUserToTenantForm}
            addUserToTenantMutation={p.addUserToTenantMutation}
            availableTenants={p.availableTenants}
            handleAddUserToTenantSubmit={p.handleAddUserToTenantSubmit}
            handleRemoveUserFromTenant={p.handleRemoveUserFromTenant}
            isAddToTenantOpen={p.isAddToTenantOpen}
            removeUserFromTenantMutation={p.removeUserFromTenantMutation}
            selectedUser={p.selectedUser}
            setIsAddToTenantOpen={p.setIsAddToTenantOpen}
            updateUserRoleInTenantMutation={p.updateUserRoleInTenantMutation}
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={p.handleCloseUserDialog} data-testid="button-close-user-dialog">
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
