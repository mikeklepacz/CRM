import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserPlus, Mail, Briefcase, Lock, Loader2 } from "lucide-react";

export function UserManagementCreateUserDialog(props: any) {
  return (
    <Dialog open={props.isCreateDialogOpen} onOpenChange={props.setIsCreateDialogOpen}>
      <DialogTrigger asChild>
        <Button data-testid="button-create-user">
          <UserPlus className="h-4 w-4 mr-2" />
          Create User
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New User</DialogTitle>
          <DialogDescription>Add a new agent or admin to the system</DialogDescription>
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
                value={props.newUser.email}
                onChange={(e) => props.setNewUser({ ...props.newUser, email: e.target.value })}
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
                value={props.newUser.firstName}
                onChange={(e) => props.setNewUser({ ...props.newUser, firstName: e.target.value })}
                data-testid="input-user-firstname"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name</Label>
              <Input
                id="lastName"
                placeholder="Doe"
                value={props.newUser.lastName}
                onChange={(e) => props.setNewUser({ ...props.newUser, lastName: e.target.value })}
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
                value={props.newUser.agentName}
                onChange={(e) => props.setNewUser({ ...props.newUser, agentName: e.target.value })}
                data-testid="input-user-agentname"
              />
            </div>
            <p className="text-xs text-muted-foreground">This name must match exactly with the Agent column in your Google Sheets</p>
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
                value={props.newUser.password}
                onChange={(e) => props.setNewUser({ ...props.newUser, password: e.target.value })}
                data-testid="input-user-password"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Role</Label>
            <Select value={props.newUser.role} onValueChange={(value) => props.setNewUser({ ...props.newUser, role: value })}>
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
            <Select value={props.newUser.selectedCategory} onValueChange={(value) => props.setNewUser({ ...props.newUser, selectedCategory: value })}>
              <SelectTrigger id="category" data-testid="select-user-category">
                <SelectValue placeholder="Select category..." />
              </SelectTrigger>
              <SelectContent>
                {props.categories?.map((category: any) => (
                  <SelectItem key={category.id} value={category.name}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">User will only see stores from this category in their CRM</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="referredBy">Referred By (Optional)</Label>
            <Select
              value={props.newUser.referredBy || "none"}
              onValueChange={(value) => props.setNewUser({ ...props.newUser, referredBy: value === "none" ? null : value })}
            >
              <SelectTrigger id="referredBy" data-testid="select-user-referredby">
                <SelectValue placeholder="Select referring agent..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {props.users?.filter((u: any) => u.role === "agent" && u.isActive !== false).map((agent: any) => (
                  <SelectItem key={agent.id} value={agent.id}>
                    {agent.agentName || `${agent.firstName} ${agent.lastName}`.trim() || agent.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">If this agent was referred by another agent, select who referred them</p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => props.setIsCreateDialogOpen(false)}
            disabled={props.createUserMutation.isPending}
            data-testid="button-cancel-create-user"
          >
            Cancel
          </Button>
          <Button onClick={props.handleCreateUser} disabled={props.createUserMutation.isPending} data-testid="button-save-user">
            {props.createUserMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Create User
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
