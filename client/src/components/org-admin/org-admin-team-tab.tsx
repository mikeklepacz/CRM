import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TabsContent } from "@/components/ui/tabs";
import { Loader2, Mail, Pencil, Trash2, UserPlus, Users, X } from "lucide-react";

export function OrgAdminTeamTab(props: any) {
  const p = props;

  return (
    <TabsContent value="team">
      <div className="space-y-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-4">
            <div>
              <CardTitle>Team Members</CardTitle>
              <CardDescription>Manage users in your organization</CardDescription>
            </div>
            <Button onClick={() => p.setIsCreateUserDialogOpen(true)} data-testid="button-create-user">
              <UserPlus className="mr-2 h-4 w-4" />
              Create User
            </Button>
          </CardHeader>
          <CardContent>
            {p.usersLoading ? (
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
                    <TableHead>Twilio Number</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {p.usersData?.users?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground">
                        No team members found
                      </TableCell>
                    </TableRow>
                  ) : (
                    p.usersData?.users?.map((u: any) => (
                      <TableRow key={u.id} data-testid={`row-user-${u.id}`}>
                        <TableCell className="font-medium">
                          {u.firstName || u.lastName ? `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() : "—"}
                        </TableCell>
                        <TableCell className="text-muted-foreground">{u.email ?? "—"}</TableCell>
                        <TableCell>
                          <Select
                            value={u.roleInTenant}
                            onValueChange={(newRole) => p.setRoleChangeUser({ user: u, newRole })}
                            disabled={u.id === p.user?.id}
                          >
                            <SelectTrigger className="w-32" data-testid={`select-role-${u.id}`} disabled={u.id === p.user?.id}>
                              <SelectValue>
                                <Badge variant={p.getRoleBadgeVariant(u.roleInTenant)} className="no-default-hover-elevate no-default-active-elevate">
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
                        <TableCell className="text-muted-foreground">{u.twilioPhoneNumber || "—"}</TableCell>
                        <TableCell>{p.formatDate(u.joinedAt)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => p.setEditingUser(u)}
                              data-testid={`button-edit-user-${u.id}`}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => p.setUserToRemove(u)}
                              disabled={u.id === p.user?.id}
                              data-testid={`button-remove-user-${u.id}`}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {p.pendingInvites.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Pending Invitations
              </CardTitle>
              <CardDescription>Invitations that haven't been accepted yet</CardDescription>
            </CardHeader>
            <CardContent>
              {p.invitesLoading ? (
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
                    {p.pendingInvites.map((invite: any) => (
                      <TableRow key={invite.id} data-testid={`row-invite-${invite.id}`}>
                        <TableCell className="font-medium">{invite.email}</TableCell>
                        <TableCell>
                          <Badge variant={p.getRoleBadgeVariant(invite.role)} className="no-default-hover-elevate no-default-active-elevate">
                            {invite.role === "org_admin" ? "Admin" : "Agent"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={p.getInviteStatusBadgeVariant(invite.status)} className="no-default-hover-elevate no-default-active-elevate">
                            {invite.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{p.formatDate(invite.expiresAt)}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => p.cancelInviteMutation.mutate(invite.id)}
                            disabled={p.cancelInviteMutation.isPending}
                            data-testid={`button-cancel-invite-${invite.id}`}
                          >
                            {p.cancelInviteMutation.isPending ? (
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
  );
}
