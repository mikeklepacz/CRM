import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Shield, KeyRound, UserX, UserCheck, Trash2, Loader2 } from "lucide-react";

function UserRows(props: any) {
  if (props.users.length === 0) {
    return (
      <TableRow>
        <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
          {props.emptyText}
        </TableCell>
      </TableRow>
    );
  }

  return props.users.map((user: any) => (
    <TableRow key={user.id} data-testid={`row-user-${user.id}`}>
      <TableCell className="font-medium">
        {user.firstName || user.lastName ? `${user.firstName || ""} ${user.lastName || ""}`.trim() : "-"}
      </TableCell>
      <TableCell>{user.email || "-"}</TableCell>
      <TableCell>{user.agentName || "-"}</TableCell>
      <TableCell>
        <Badge variant={user.role === "admin" ? "default" : "secondary"}>
          {user.role === "admin" && <Shield className="h-3 w-3 mr-1" />}
          {user.role}
        </Badge>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <Checkbox
            checked={user.role === "admin" || user.hasVoiceAccess}
            disabled={user.role === "admin" || props.toggleVoiceAccessMutation.isPending}
            onCheckedChange={(checked) => {
              props.toggleVoiceAccessMutation.mutate({ userId: user.id, hasVoiceAccess: checked as boolean });
            }}
            data-testid={`checkbox-voice-access-${user.id}`}
          />
          <span className="text-sm text-muted-foreground">{user.role === "admin" ? "(Admin)" : ""}</span>
        </div>
      </TableCell>
      <TableCell>{user.referredBy ? props.getReferrerName(user.referredBy) : "-"}</TableCell>
      <TableCell className="text-right" data-testid={`text-sales-${user.id}`}>{user.totalSales}</TableCell>
      <TableCell className="text-right font-medium" data-testid={`text-income-${user.id}`}>
        ${parseFloat(user.grossIncome || "0").toFixed(2)}
      </TableCell>
      <TableCell className="text-right">
        {user.id !== props.currentUserId ? (
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                props.handleResetPasswordClick(
                  user.id,
                  user.email || "",
                  user.agentName || `${user.firstName} ${user.lastName}`.trim() || user.email || "User",
                )
              }
              data-testid={`button-reset-password-${user.id}`}
            >
              <KeyRound className="h-3 w-3 mr-1" />
              Reset Password
            </Button>
            {props.isInactiveTab ? (
              <>
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => props.handleReactivate(user.id)}
                  disabled={props.reactivateUserMutation.isPending || props.deleteUserMutation.isPending}
                  data-testid={`button-reactivate-${user.id}`}
                >
                  {props.reactivateUserMutation.isPending ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <UserCheck className="h-3 w-3 mr-1" />}
                  Reactivate
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => props.handleDeleteClick(user.id, user.email || "")}
                  disabled={props.reactivateUserMutation.isPending || props.deleteUserMutation.isPending}
                  data-testid={`button-delete-${user.id}`}
                >
                  {props.deleteUserMutation.isPending ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Trash2 className="h-3 w-3 mr-1" />}
                  Delete
                </Button>
              </>
            ) : (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => props.handleDeactivateClick(user.id)}
                disabled={props.loadingAnalysis || props.deactivateUserMutation.isPending}
                data-testid={`button-deactivate-${user.id}`}
              >
                {props.loadingAnalysis ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <UserX className="h-3 w-3 mr-1" />}
                Deactivate
              </Button>
            )}
          </div>
        ) : (
          <span className="text-sm text-muted-foreground">You</span>
        )}
      </TableCell>
    </TableRow>
  ));
}

export function UserManagementUsersTable(props: any) {
  return (
    <Tabs value={props.activeTab} onValueChange={props.setActiveTab} className="w-full">
      <TabsList className="mb-4">
        <TabsTrigger value="active" data-testid="tab-active-users">
          Active Users ({props.activeUsers.length})
        </TabsTrigger>
        <TabsTrigger value="inactive" data-testid="tab-inactive-users">
          Inactive Users ({props.inactiveUsers.length})
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
                <TableHead>Voice Access</TableHead>
                <TableHead>Referred By</TableHead>
                <TableHead className="text-right">Total Sales</TableHead>
                <TableHead className="text-right">Gross Income</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <UserRows {...props} users={props.activeUsers} isInactiveTab={false} emptyText="No active users found" />
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
                <TableHead>Voice Access</TableHead>
                <TableHead>Referred By</TableHead>
                <TableHead className="text-right">Total Sales</TableHead>
                <TableHead className="text-right">Gross Income</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <UserRows {...props} users={props.inactiveUsers} isInactiveTab={true} emptyText="No inactive users found" />
            </TableBody>
          </Table>
        </div>
      </TabsContent>
    </Tabs>
  );
}
