import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Check, Edit, KeyRound, Loader2, Lock, UserCheck, UserX } from "lucide-react";

export function SuperAdminUserDialogProfile(props: any) {
  const p = props;

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium">User Details</h4>
          {!p.isEditingUser && (
            <Button size="sm" variant="outline" onClick={() => p.setIsEditingUser(true)} data-testid="button-edit-user-details">
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </Button>
          )}
        </div>

        {p.isEditingUser ? (
          <Form {...p.editUserForm}>
            <form onSubmit={p.editUserForm.handleSubmit(p.handleEditUserSubmit)} className="space-y-4">
              <FormField
                control={p.editUserForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl><Input {...field} data-testid="input-edit-user-email" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={p.editUserForm.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First Name</FormLabel>
                      <FormControl><Input {...field} data-testid="input-edit-user-firstname" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={p.editUserForm.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Last Name</FormLabel>
                      <FormControl><Input {...field} data-testid="input-edit-user-lastname" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={p.editUserForm.control}
                name="agentName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Agent Name</FormLabel>
                    <FormControl><Input {...field} data-testid="input-edit-user-agentname" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => p.setIsEditingUser(false)} data-testid="button-cancel-edit-user">Cancel</Button>
                <Button type="submit" disabled={p.updateUserMutation.isPending} data-testid="button-save-edit-user">
                  {p.updateUserMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Changes
                </Button>
              </div>
            </form>
          </Form>
        ) : (
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Email</p>
              <p className="font-medium">{p.selectedUser?.email || "—"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Name</p>
              <p className="font-medium">
                {p.selectedUser?.firstName || p.selectedUser?.lastName
                  ? `${p.selectedUser?.firstName ?? ""} ${p.selectedUser?.lastName ?? ""}`.trim()
                  : "—"}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Agent Name</p>
              <p className="font-medium">{p.selectedUser?.agentName || "—"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Super Admin</p>
              <p className="font-medium">{p.selectedUser?.isSuperAdmin ? "Yes" : "No"}</p>
            </div>
          </div>
        )}
      </div>

      <Separator />

      <div className="space-y-4">
        <h4 className="text-sm font-medium">Voice Access</h4>
        <div className="flex items-center gap-3">
          <Checkbox
            id="voice-access"
            checked={p.selectedUser?.hasVoiceAccess ?? false}
            onCheckedChange={(checked) => {
              if (p.selectedUser) {
                p.toggleVoiceAccessMutation.mutate({ userId: p.selectedUser.id, hasVoiceAccess: checked as boolean });
              }
            }}
            disabled={p.toggleVoiceAccessMutation.isPending}
            data-testid="checkbox-voice-access"
          />
          <Label htmlFor="voice-access" className="text-sm">Enable voice access for this user</Label>
          {p.toggleVoiceAccessMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
        </div>
      </div>

      <Separator />

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium">Password Reset</h4>
          {!p.isResettingPassword && (
            <Button size="sm" variant="outline" onClick={() => p.setIsResettingPassword(true)} data-testid="button-show-reset-password">
              <KeyRound className="mr-2 h-4 w-4" />
              Reset Password
            </Button>
          )}
        </div>

        {p.isResettingPassword && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">New Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input id="new-password" type="password" placeholder="Minimum 6 characters" className="pl-10" value={p.newPassword} onChange={(e) => p.setNewPassword(e.target.value)} data-testid="input-new-password" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input id="confirm-password" type="password" placeholder="Confirm new password" className="pl-10" value={p.confirmPassword} onChange={(e) => p.setConfirmPassword(e.target.value)} data-testid="input-confirm-password" />
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => { p.setIsResettingPassword(false); p.setNewPassword(""); p.setConfirmPassword(""); }} data-testid="button-cancel-reset-password">Cancel</Button>
              <Button onClick={p.handleResetPasswordSubmit} disabled={p.resetPasswordMutation.isPending} data-testid="button-submit-reset-password">
                {p.resetPasswordMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Reset Password
              </Button>
            </div>
          </div>
        )}
      </div>

      <Separator />

      <div className="space-y-4">
        <h4 className="text-sm font-medium">Account Status</h4>
        <div className="flex items-center gap-2">
          {p.selectedUser?.isActive !== false ? (
            <Button variant="destructive" size="sm" onClick={p.handleDeactivateUser} disabled={p.deactivateUserMutation.isPending} data-testid="button-deactivate-user">
              {p.deactivateUserMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserX className="mr-2 h-4 w-4" />}
              Deactivate User
            </Button>
          ) : (
            <Button variant="default" size="sm" onClick={p.handleReactivateUser} disabled={p.reactivateUserMutation.isPending} data-testid="button-reactivate-user">
              {p.reactivateUserMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserCheck className="mr-2 h-4 w-4" />}
              Reactivate User
            </Button>
          )}
        </div>
      </div>
    </>
  );
}
