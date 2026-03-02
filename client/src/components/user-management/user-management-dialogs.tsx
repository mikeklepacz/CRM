import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Loader2, Lock } from "lucide-react";

export function UserManagementDialogs(props: any) {
  return (
    <>
      <AlertDialog open={props.deactivateDialog?.open || false} onOpenChange={(open) => !open && props.setDeactivateDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate User</AlertDialogTitle>
            <AlertDialogDescription>
              {props.deactivateDialog?.analysis && (
                <div className="space-y-3">
                  <p>This action will deactivate the user and release their unclosed listings:</p>
                  <div className="bg-muted p-3 rounded-md space-y-2">
                    <div className="flex justify-between">
                      <span className="font-medium">Protected Listings (with Transaction IDs):</span>
                      <span className="font-bold text-green-600">{props.deactivateDialog.analysis.protectedCount}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">These will stay assigned to this agent (10% commission for life)</p>
                  </div>
                  <div className="bg-muted p-3 rounded-md space-y-2">
                    <div className="flex justify-between">
                      <span className="font-medium">Releasable Listings (no Transaction IDs):</span>
                      <span className="font-bold text-orange-600">{props.deactivateDialog.analysis.releasableCount}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">These will be marked as "7 – Warm" and made available for other agents</p>
                  </div>
                  <p className="text-sm font-medium">Are you sure you want to proceed?</p>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => props.setDeactivateDialog(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={props.handleDeactivateConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={props.deactivateUserMutation.isPending}
              data-primary="true"
            >
              {props.deactivateUserMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Deactivate User
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={props.deleteDialog?.open || false} onOpenChange={(open) => !open && props.setDeleteDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive">⚠️ Permanently Delete User</AlertDialogTitle>
            <AlertDialogDescription>
              <div className="space-y-4">
                <div className="bg-destructive/10 border border-destructive/50 p-4 rounded-md">
                  <p className="font-bold text-destructive">This action cannot be undone!</p>
                </div>
                <p className="font-medium">
                  You are about to permanently delete user: <span className="font-bold">{props.deleteDialog?.userEmail}</span>
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
                <p className="text-sm font-medium text-destructive">Are you absolutely sure you want to permanently delete this user?</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => props.setDeleteDialog(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={props.handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={props.deleteUserMutation.isPending}
              data-primary="true"
            >
              {props.deleteUserMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Yes, Permanently Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={props.resetPasswordDialog?.open || false} onOpenChange={(open) => !open && props.setResetPasswordDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
            <DialogDescription>
              Reset password for: <span className="font-medium">{props.resetPasswordDialog?.userName}</span> ({props.resetPasswordDialog?.userEmail})
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="newPassword">New Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="newPassword"
                  type="password"
                  placeholder="Enter new password (min 6 characters)"
                  className="pl-10"
                  value={props.newPassword}
                  onChange={(e) => props.setNewPassword(e.target.value)}
                  data-testid="input-new-password"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Confirm new password"
                  className="pl-10"
                  value={props.confirmPassword}
                  onChange={(e) => props.setConfirmPassword(e.target.value)}
                  data-testid="input-confirm-password"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => props.setResetPasswordDialog(null)}
              disabled={props.resetPasswordMutation.isPending}
              data-testid="button-cancel-reset-password"
            >
              Cancel
            </Button>
            <Button
              onClick={props.handleResetPasswordConfirm}
              disabled={props.resetPasswordMutation.isPending}
              data-testid="button-confirm-reset-password"
              data-primary="true"
            >
              {props.resetPasswordMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Reset Password
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
