import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Mail, Lock, Briefcase, Loader2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Tenant } from "@/components/super-admin/super-admin.types";

type SuperAdminCreateUserDialogProps = {
  createUserForm: any;
  createUserPending: boolean;
  handleCreateUserSubmit: (data: any) => void;
  isCreateUserDialogOpen: boolean;
  setIsCreateUserDialogOpen: (open: boolean) => void;
  tenants: Tenant[] | undefined;
};

export function SuperAdminCreateUserDialog({
  createUserForm,
  createUserPending,
  handleCreateUserSubmit,
  isCreateUserDialogOpen,
  setIsCreateUserDialogOpen,
  tenants,
}: SuperAdminCreateUserDialogProps) {
  return (
    <Dialog open={isCreateUserDialogOpen} onOpenChange={setIsCreateUserDialogOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create New User</DialogTitle>
          <DialogDescription>Add a new user to the platform</DialogDescription>
        </DialogHeader>
        <Form {...createUserForm}>
          <form onSubmit={createUserForm.handleSubmit(handleCreateUserSubmit)} className="space-y-4">
            <FormField
              control={createUserForm.control}
              name="tenantId"
              render={({ field }: any) => (
                <FormItem>
                  <FormLabel>Tenant *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-create-user-tenant">
                        <SelectValue placeholder="Select tenant" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {tenants?.map((tenant) => (
                        <SelectItem key={tenant.id} value={tenant.id}>
                          {tenant.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={createUserForm.control}
              name="email"
              render={({ field }: any) => (
                <FormItem>
                  <FormLabel>Email *</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="user@example.com"
                        className="pl-10"
                        {...field}
                        data-testid="input-create-user-email"
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={createUserForm.control}
                name="firstName"
                render={({ field }: any) => (
                  <FormItem>
                    <FormLabel>First Name</FormLabel>
                    <FormControl>
                      <Input placeholder="John" {...field} data-testid="input-create-user-firstname" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={createUserForm.control}
                name="lastName"
                render={({ field }: any) => (
                  <FormItem>
                    <FormLabel>Last Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Doe" {...field} data-testid="input-create-user-lastname" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={createUserForm.control}
              name="agentName"
              render={({ field }: any) => (
                <FormItem>
                  <FormLabel>Agent Name</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Briefcase className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Agent display name"
                        className="pl-10"
                        {...field}
                        data-testid="input-create-user-agentname"
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={createUserForm.control}
              name="password"
              render={({ field }: any) => (
                <FormItem>
                  <FormLabel>Password *</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="password"
                        placeholder="Minimum 6 characters"
                        className="pl-10"
                        {...field}
                        data-testid="input-create-user-password"
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={createUserForm.control}
              name="roleInTenant"
              render={({ field }: any) => (
                <FormItem>
                  <FormLabel>Role in Tenant</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-create-user-role">
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="org_admin">Admin</SelectItem>
                      <SelectItem value="agent">Agent</SelectItem>
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
                onClick={() => setIsCreateUserDialogOpen(false)}
                data-testid="button-cancel-create-user"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createUserPending}
                data-testid="button-submit-create-user"
                data-primary="true"
              >
                {createUserPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create User
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
