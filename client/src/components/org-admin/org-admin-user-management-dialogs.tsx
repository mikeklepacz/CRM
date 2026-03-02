import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EditUserForm } from "@/components/org-admin/edit-user-form";
import type { TenantUser } from "@/components/org-admin/org-admin.types";
import { Loader2 } from "lucide-react";

type RoleChangeUser = {
  user: TenantUser;
  newRole: string;
} | null;

type OrgAdminUserManagementDialogsProps = {
  editUserMutationPending: boolean;
  editingUser: TenantUser | null;
  onCloseEditingUser: () => void;
  onCloseRoleChange: () => void;
  onCloseUserRemove: () => void;
  onEditUserSave: (data: Partial<TenantUser>) => void;
  onRoleChangeConfirm: () => void;
  onUserRemoveConfirm: () => void;
  removeUserMutationPending: boolean;
  roleChangeUser: RoleChangeUser;
  updateRoleMutationPending: boolean;
  userToRemove: TenantUser | null;
};

export function OrgAdminUserManagementDialogs({
  editUserMutationPending,
  editingUser,
  onCloseEditingUser,
  onCloseRoleChange,
  onCloseUserRemove,
  onEditUserSave,
  onRoleChangeConfirm,
  onUserRemoveConfirm,
  removeUserMutationPending,
  roleChangeUser,
  updateRoleMutationPending,
  userToRemove,
}: OrgAdminUserManagementDialogsProps) {
  return (
    <>
      <Dialog open={!!roleChangeUser} onOpenChange={(open) => !open && onCloseRoleChange()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change User Role</DialogTitle>
            <DialogDescription>
              Are you sure you want to change{" "}
              {roleChangeUser?.user.firstName || roleChangeUser?.user.email || "this user"}'s role to{" "}
              {roleChangeUser?.newRole === "org_admin" ? "Admin" : "Agent"}?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onCloseRoleChange}
              data-testid="button-cancel-role-change"
            >
              Cancel
            </Button>
            <Button
              onClick={onRoleChangeConfirm}
              disabled={updateRoleMutationPending}
              data-testid="button-confirm-role-change"
              data-primary="true"
            >
              {updateRoleMutationPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!userToRemove} onOpenChange={(open) => !open && onCloseUserRemove()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove User</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove{" "}
              {userToRemove?.firstName || userToRemove?.email || "this user"} from the organization?
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onCloseUserRemove}
              data-testid="button-cancel-remove"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={onUserRemoveConfirm}
              disabled={removeUserMutationPending}
              data-testid="button-confirm-remove"
              data-primary="true"
            >
              {removeUserMutationPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Remove User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {editingUser && (
        <Dialog open={!!editingUser} onOpenChange={(open) => !open && onCloseEditingUser()}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Edit User</DialogTitle>
              <DialogDescription>
                Update details for {editingUser.firstName || editingUser.email || "this user"}
              </DialogDescription>
            </DialogHeader>
            <EditUserForm
              user={editingUser}
              onSave={onEditUserSave}
              onCancel={onCloseEditingUser}
              isPending={editUserMutationPending}
            />
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
