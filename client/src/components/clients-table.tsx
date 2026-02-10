import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Calendar, Loader2, MoreVertical } from "lucide-react";
import { formatDistanceToNow, differenceInMonths } from "date-fns";
import type { Client, User } from "@shared/schema";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { isUnauthorizedError, canAccessAdminFeatures } from "@/lib/authUtils";

// Extended client type with API-enriched fields
interface EnrichedClient extends Client {
  transactionId?: string;
  orderId?: string;
}

interface ClientsTableProps {
  clients: EnrichedClient[];
  currentUser: User;
  isLoading?: boolean;
  onNotesClick: (clientId: string) => void;
  loadingClientId?: string | null;
}

export function ClientsTable({ clients, currentUser, isLoading, onNotesClick, loadingClientId }: ClientsTableProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();


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
    return client.data?.['Name'] || client.data?.['name'] || client.data?.['Company'] || client.data?.['company'] || client.data?.['Business Name'] || 'Unknown';
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
      <div className="border rounded-lg flex-1 overflow-auto">
        <Table>
          <TableHeader className="sticky top-0 z-10 bg-background border-b">
            <TableRow>
              <TableHead className="bg-background">Company</TableHead>
              <TableHead className="bg-background">Status</TableHead>
              <TableHead className="bg-background">Transaction ID</TableHead>
              <TableHead className="bg-background">Last Order</TableHead>
              <TableHead className="text-right bg-background">Commission</TableHead>
              <TableHead className="text-right bg-background">Actions</TableHead>
            </TableRow>
          </TableHeader>
            <TableBody>
              {clients.map((client) => {
                const companyName = getCompanyName(client);
                const canClaim = !client.assignedAgent && currentUser.role === 'agent';
                const canUnclaim = canAccessAdminFeatures(currentUser);
                const commissionRate = getCommissionRate(client);
                const daysSinceOrder = client.lastOrderDate
                  ? Math.floor((Date.now() - new Date(client.lastOrderDate).getTime()) / (1000 * 60 * 60 * 24))
                  : null;
                const transactionId = client.transactionId || '';
                const status = client.status || '7 – Warm';

                return (
                  <TableRow key={client.id} className="hover-elevate">
                    <TableCell className="font-medium align-middle">
                      <div data-testid={`text-company-${client.id}`}>{companyName}</div>
                    </TableCell>
                    <TableCell className="align-middle">
                      <Badge variant="outline">
                        {status}
                      </Badge>
                    </TableCell>
                    <TableCell className="align-middle text-sm text-muted-foreground">
                      {transactionId || 'No orders'}
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
                          disabled={loadingClientId === client.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onNotesClick) {
                              onNotesClick(client.id);
                            }
                          }}
                          data-testid={`button-notes-${client.id}`}
                          className={`h-auto py-2 flex flex-col items-center gap-0 ${
                            (client as any).needsFollowUp
                              ? 'bg-red-100 dark:bg-red-950 text-red-800 dark:text-red-200 border-red-300 dark:border-red-800'
                              : ''
                          }`}
                        >
                          {loadingClientId === client.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <span className="text-xs leading-tight">Notes</span>
                              <span className="text-xs leading-tight">Follow up</span>
                            </>
                          )}
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
    </>
  );
}