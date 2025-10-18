import { useMemo, useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Mail, Phone, Calendar, DollarSign, Loader2, MoreVertical, UserCheck } from "lucide-react";
import { formatDistanceToNow, differenceInMonths } from "date-fns";
import type { Client, User } from "@shared/schema";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { isUnauthorizedError } from "@/lib/authUtils";
import { ClientNotesDialog } from "./client-notes-dialog";

interface ClientsTableProps {
  clients: Client[];
  currentUser: User;
  isLoading?: boolean;
}

export function ClientsTable({ clients, currentUser, isLoading }: ClientsTableProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [notesClientId, setNotesClientId] = useState<string | null>(null);

  const claimMutation = useMutation({
    mutationFn: async (clientId: string) => {
      return await apiRequest("POST", `/api/clients/${clientId}/claim`, {});
    },
    onSuccess: () => {
      toast({
        title: "Client claimed",
        description: "You have successfully claimed this client",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      queryClient.invalidateQueries({ queryKey: ["/api/clients/my"] });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Failed to claim",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const unclaimMutation = useMutation({
    mutationFn: async (clientId: string) => {
      return await apiRequest("POST", `/api/clients/${clientId}/unclaim`, {});
    },
    onSuccess: () => {
      toast({
        title: "Client unclaimed",
        description: "Client has been unassigned",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      queryClient.invalidateQueries({ queryKey: ["/api/clients/my"] });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Failed to unclaim",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const getCommissionRate = (client: Client) => {
    if (!client.claimDate) return 0;
    const monthsSinceClaim = differenceInMonths(new Date(), new Date(client.claimDate));
    return monthsSinceClaim < 6 ? 25 : 10;
  };

  const getCompanyName = (client: Client) => {
    return client.data?.['Company'] || client.data?.['company'] || client.data?.['Business Name'] || 'Unknown';
  };

  const getEmail = (client: Client) => {
    return client.data?.['Email'] || client.data?.['email'] || client.data?.['Contact Email'] || '';
  };

  const getPhone = (client: Client) => {
    return client.data?.['Phone'] || client.data?.['phone'] || client.data?.['Contact Phone'] || '';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (clients.length === 0) {
    return (
      <div className="text-center p-12 border rounded-lg bg-muted/30">
        <p className="text-muted-foreground">No clients found</p>
      </div>
    );
  }

  return (
    <>
      <div className="border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Company</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Order</TableHead>
                <TableHead className="text-right">Total Sales</TableHead>
                <TableHead className="text-right">Commission</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clients.map((client) => {
                const email = getEmail(client);
                const phone = getPhone(client);
                const canClaim = !client.assignedAgent && currentUser.role === 'agent';
                const canUnclaim = currentUser.role === 'admin';
                const commissionRate = getCommissionRate(client);
                const daysSinceOrder = client.lastOrderDate 
                  ? Math.floor((Date.now() - new Date(client.lastOrderDate).getTime()) / (1000 * 60 * 60 * 24))
                  : null;

                return (
                  <TableRow key={client.id} className="hover-elevate">
                    <TableCell className="font-medium align-middle">
                      <div className="space-y-1">
                        <div data-testid={`text-company-${client.id}`}>{getCompanyName(client)}</div>
                        {client.assignedAgent && (
                          <Badge variant="secondary" className="text-xs" data-testid={`badge-agent-${client.id}`}>
                            <UserCheck className="h-3 w-3 mr-1" />
                            Claimed
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="align-middle">
                      <div className="space-y-1 text-sm">
                        {email && (
                          <a 
                            href={`mailto:${email}`} 
                            className="flex items-center gap-1 text-primary hover:underline"
                            data-testid={`link-email-${client.id}`}
                          >
                            <Mail className="h-3 w-3" />
                            {email}
                          </a>
                        )}
                        {phone && (
                          <a 
                            href={`tel:${phone}`} 
                            className="flex items-center gap-1 text-primary hover:underline"
                            data-testid={`link-phone-${client.id}`}
                          >
                            <Phone className="h-3 w-3" />
                            {phone}
                          </a>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="align-middle">
                      <Badge variant={client.status === 'active' ? 'default' : 'secondary'}>
                        {client.status || 'unassigned'}
                      </Badge>
                    </TableCell>
                    <TableCell className="align-middle">
                      {client.lastOrderDate ? (
                        <div className="space-y-1">
                          <div className="flex items-center gap-1 text-sm">
                            <Calendar className="h-3 w-3" />
                            {formatDistanceToNow(new Date(client.lastOrderDate), { addSuffix: true })}
                          </div>
                          {daysSinceOrder && daysSinceOrder > 90 && (
                            <Badge variant="outline" className="text-xs">
                              {daysSinceOrder}d inactive
                            </Badge>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">No orders</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-medium align-middle" data-testid={`text-sales-${client.id}`}>
                      ${parseFloat(client.totalSales || '0').toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right align-middle">
                      <div className="space-y-1">
                        <div className="font-medium" data-testid={`text-commission-${client.id}`}>
                          ${parseFloat(client.commissionTotal || '0').toFixed(2)}
                        </div>
                        {client.assignedAgent && (
                          <Badge variant="outline" className="text-xs">
                            {commissionRate}%
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right align-middle">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setNotesClientId(client.id)}
                          data-testid={`button-notes-${client.id}`}
                        >
                          Notes
                        </Button>
                        {canClaim && (
                          <Button
                            size="sm"
                            onClick={() => claimMutation.mutate(client.id)}
                            disabled={claimMutation.isPending}
                            data-testid={`button-claim-${client.id}`}
                          >
                            {claimMutation.isPending ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              'Claim'
                            )}
                          </Button>
                        )}
                        {canUnclaim && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" data-testid={`button-actions-${client.id}`}>
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {client.assignedAgent && (
                                <DropdownMenuItem
                                  onClick={() => unclaimMutation.mutate(client.id)}
                                  data-testid={`button-unclaim-${client.id}`}
                                >
                                  Unclaim Client
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>

      {notesClientId && (
        <ClientNotesDialog
          clientId={notesClientId}
          open={!!notesClientId}
          onOpenChange={(open) => !open && setNotesClientId(null)}
        />
      )}
    </>
  );
}
