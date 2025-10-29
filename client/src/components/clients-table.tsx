import { useMemo, useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
}

export function ClientsTable({ clients, currentUser, isLoading, onNotesClick }: ClientsTableProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch Gmail connection status
  const { data: integrationStatus } = useQuery<{
    googleCalendarConnected: boolean;
    googleSheetsConnected: boolean;
  }>({
    queryKey: ["/api/integrations/status"],
  });

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

  const autoClaimMutation = useMutation({
    mutationFn: async (link: string) => {
      return await apiRequest("POST", `/api/stores/auto-claim`, { link });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      queryClient.invalidateQueries({ queryKey: ["/api/clients/my"] });
    },
    onError: (error: Error) => {
      // Silent fail for auto-claim - don't show errors to user
      console.error('Auto-claim failed:', error.message);
    },
  });

  const createGmailDraftMutation = useMutation({
    mutationFn: async ({ to, subject }: { to: string; subject: string }) => {
      return await apiRequest("POST", "/api/gmail/create-draft", {
        to,
        subject,
        body: "",
      });
    },
    onSuccess: (data: any) => {
      if (data?.draftUrl) {
        window.open(data.draftUrl, '_blank');
      }
      toast({
        title: "Draft Created",
        description: "Gmail draft has been created and opened in a new tab",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to Create Draft",
        description: error.message || "Could not create Gmail draft. Using default email client instead.",
        variant: "destructive",
      });
    },
  });

  const logCallMutation = useMutation({
    mutationFn: async ({ storeName, phoneNumber, storeLink }: { storeName: string; phoneNumber: string; storeLink: string | null }) => {
      return await apiRequest("POST", "/api/call-history", {
        storeName,
        phoneNumber,
        storeLink,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/call-history'] });
    },
    onError: (error: Error) => {
      console.error('Failed to log call:', error);
    },
  });

  const handlePhoneClick = (e: React.MouseEvent<HTMLAnchorElement>, link: string, storeName: string, phoneNumber: string) => {
    // Don't prevent default - let the phone link open
    // Just trigger auto-claim silently in the background
    if (link && currentUser.role !== 'admin') {
      autoClaimMutation.mutate(link);
    }

    // Log the call to database
    logCallMutation.mutate({
      storeName,
      phoneNumber,
      storeLink: link || null,
    });
  };

  const handleEmailClick = (e: React.MouseEvent<HTMLAnchorElement>, link: string, email: string, companyName: string) => {
    // Trigger auto-claim
    if (link && currentUser.role !== 'admin') {
      autoClaimMutation.mutate(link);
    }

    // Check if user prefers Gmail drafts and Gmail is connected
    const emailPreference = (currentUser as any).emailPreference || 'mailto';
    const gmailConnected = integrationStatus?.googleCalendarConnected || false;

    if (emailPreference === 'gmail_draft' && gmailConnected) {
      // Prevent default mailto and create Gmail draft instead
      e.preventDefault();
      createGmailDraftMutation.mutate({
        to: email,
        subject: `Re: ${companyName}`,
      });
    }
    // Otherwise, let the default mailto: link work
  };

  const getCommissionRate = (client: Client) => {
    if (!client.claimDate) return 0;
    const monthsSinceClaim = differenceInMonths(new Date(), new Date(client.claimDate));
    return monthsSinceClaim < 6 ? 25 : 10;
  };

  const getCompanyName = (client: Client) => {
    return client.data?.['Name'] || client.data?.['name'] || client.data?.['Company'] || client.data?.['company'] || client.data?.['Business Name'] || 'Unknown';
  };

  const getContact = (client: Client) => {
    return client.data?.['Contact'] || client.data?.['contact'] || client.data?.['Point of Contact'] || client.data?.['POC'] || '';
  };

  const getEmail = (client: Client) => {
    return client.data?.['Email'] || client.data?.['email'] || client.data?.['Contact Email'] || '';
  };

  const getPhone = (client: Client) => {
    return client.data?.['Phone'] || client.data?.['phone'] || client.data?.['Contact Phone'] || '';
  };

  const getLink = (client: Client) => {
    return client.data?.['Link'] || client.data?.['link'] || '';
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
        <div className="overflow-x-auto max-h-full">
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-background">
              <TableRow>
                <TableHead className="bg-background">Company</TableHead>
                <TableHead className="bg-background">Contact</TableHead>
                <TableHead className="bg-background">Status</TableHead>
                <TableHead className="bg-background">Transaction ID</TableHead>
                <TableHead className="bg-background">Last Order</TableHead>
                <TableHead className="text-right bg-background">Commission</TableHead>
                <TableHead className="text-right bg-background">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clients.map((client) => {
                const email = getEmail(client);
                const phone = getPhone(client);
                const link = getLink(client);
                const companyName = getCompanyName(client);
                const contact = getContact(client);
                const canClaim = !client.assignedAgent && currentUser.role === 'agent';
                const canUnclaim = currentUser.role === 'admin';
                const commissionRate = getCommissionRate(client);
                const daysSinceOrder = client.lastOrderDate
                  ? Math.floor((Date.now() - new Date(client.lastOrderDate).getTime()) / (1000 * 60 * 60 * 24))
                  : null;
                const transactionId = client.transactionId || '';
                const status = client.status || '7 – Warm';

                return (
                  <TableRow key={client.id} className="hover-elevate">
                    <TableCell className="font-medium align-middle">
                      <div className="space-y-1">
                        <div data-testid={`text-company-${client.id}`}>{companyName}</div>
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
                        {contact && (
                          <div className="font-medium text-foreground">{contact}</div>
                        )}
                        {email && (
                          <a
                            href={`mailto:${email}`}
                            className="flex items-center gap-1 text-primary hover:underline"
                            data-testid={`link-email-${client.id}`}
                            onClick={(e) => handleEmailClick(e, link, email, companyName)}
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
                            onClick={(e) => handlePhoneClick(e, link, companyName, phone)}
                          >
                            <Phone className="h-3 w-3" />
                            {phone}
                          </a>
                        )}
                      </div>
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
                          onClick={(e) => {
                            console.log('🟡 [NOTES BUTTON] Click event triggered');
                            console.log('🟡 [NOTES BUTTON] Client ID:', client.id);
                            console.log('🟡 [NOTES BUTTON] onNotesClick handler exists:', !!onNotesClick);
                            e.stopPropagation();
                            if (onNotesClick) {
                              console.log('🟡 [NOTES BUTTON] Calling onNotesClick...');
                              onNotesClick(client.id);
                            } else {
                              console.error('🔴 [NOTES BUTTON] onNotesClick handler is undefined!');
                            }
                          }}
                          data-testid={`button-notes-${client.id}`}
                          className={`h-auto py-2 flex flex-col items-center gap-0 ${
                            (client as any).needsFollowUp
                              ? 'bg-red-100 dark:bg-red-950 text-red-800 dark:text-red-200 border-red-300 dark:border-red-800'
                              : ''
                          }`}
                        >
                          <span className="text-xs leading-tight">Notes</span>
                          <span className="text-xs leading-tight">Follow up</span>
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

    </>
  );
}