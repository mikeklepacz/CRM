import { useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Webhook, RefreshCw } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface WebhookStatus {
  userId: string;
  userEmail: string;
  agentName?: string;
  tenantId?: string;
  tenantName?: string;
  hasGoogleCalendar: boolean;
  channelId?: string | null;
  resourceId?: string | null;
  expiry?: number | null;
  expiryDate?: string | null;
  isExpired?: boolean | null;
  registeredUrl?: string;
  environment?: string;
}

interface WebhookManagerProps {
  tenantId?: string;
}

export function WebhookManager({ tenantId }: WebhookManagerProps = {}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const isSuperAdminMode = !!tenantId;
  const apiBase = isSuperAdminMode 
    ? `/api/super-admin/tenants/${tenantId}/webhooks` 
    : '/api/admin/webhooks';

  const { data: webhooksData, isLoading: webhooksLoading } = useQuery<{ webhooks: WebhookStatus[] }>({
    queryKey: isSuperAdminMode ? ['/api/super-admin/tenants', tenantId, 'webhooks'] : ['/api/admin/webhooks'],
    queryFn: async () => {
      const res = await fetch(apiBase, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch webhooks');
      return res.json();
    },
  });

  const webhooks = webhooksData?.webhooks || [];

  const connectedWebhooks = useMemo(() => 
    webhooks.filter(w => w.hasGoogleCalendar), [webhooks]);
  
  const activeWebhooks = useMemo(() => 
    webhooks.filter(w => w.channelId && !w.isExpired), [webhooks]);

  const bulkRegisterMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('POST', `${apiBase}/bulk-register`, {});
    },
    onSuccess: (data: any) => {
      if (isSuperAdminMode) {
        queryClient.invalidateQueries({ queryKey: ['/api/super-admin/tenants', tenantId, 'webhooks'] });
      } else {
        queryClient.invalidateQueries({ queryKey: ['/api/admin/webhooks'] });
      }
      toast({
        title: "Bulk Registration Complete",
        description: `Successfully registered ${data.successful} webhooks. Failed: ${data.failed}, Skipped: ${data.skipped}`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Bulk Registration Failed",
        description: error.message || "Failed to register webhooks",
        variant: "destructive",
      });
    },
  });

  const registerSingleMutation = useMutation({
    mutationFn: async (userId: string) => {
      return await apiRequest('POST', `${apiBase}/${userId}/register`, {});
    },
    onSuccess: (data: any, userId: string) => {
      if (isSuperAdminMode) {
        queryClient.invalidateQueries({ queryKey: ['/api/super-admin/tenants', tenantId, 'webhooks'] });
      } else {
        queryClient.invalidateQueries({ queryKey: ['/api/admin/webhooks'] });
      }
      const webhook = webhooks.find(w => w.userId === userId);
      toast({
        title: "Webhook Registered",
        description: `Successfully registered webhook for ${webhook?.userEmail}`,
      });
    },
    onError: (error: any, userId: string) => {
      const webhook = webhooks.find(w => w.userId === userId);
      toast({
        title: "Registration Failed",
        description: `Failed to register webhook for ${webhook?.userEmail}: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const getWebhookStatusBadge = (webhook: WebhookStatus) => {
    if (!webhook.hasGoogleCalendar) {
      return <Badge variant="outline">No Calendar</Badge>;
    }
    if (!webhook.channelId) {
      return <Badge variant="secondary">Not Registered</Badge>;
    }
    if (webhook.isExpired) {
      return <Badge variant="destructive">Expired</Badge>;
    }
    return <Badge className="bg-green-600 hover:bg-green-700">Active</Badge>;
  };

  const formatWebhookExpiry = (expiryDate: string | null | undefined) => {
    if (!expiryDate) return 'N/A';
    const date = new Date(expiryDate);
    const now = new Date();
    const hoursUntil = (date.getTime() - now.getTime()) / (1000 * 60 * 60);
    
    if (hoursUntil < 0) {
      return `Expired ${Math.abs(hoursUntil).toFixed(0)}h ago`;
    }
    if (hoursUntil < 24) {
      return `${hoursUntil.toFixed(0)}h remaining`;
    }
    return `${(hoursUntil / 24).toFixed(1)} days`;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <CardTitle>Google Calendar Webhook Management</CardTitle>
              <CardDescription>
                Manage webhook registrations for Google Calendar synchronization
              </CardDescription>
            </div>
            <Button
              onClick={() => bulkRegisterMutation.mutate()}
              disabled={bulkRegisterMutation.isPending}
              data-testid="button-bulk-register"
            >
              {bulkRegisterMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Registering...
                </>
              ) : (
                <>
                  <Webhook className="mr-2 h-4 w-4" />
                  Bulk Re-register All
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Total Users</CardDescription>
                <CardTitle className="text-2xl">{webhooks.length}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Connected Calendars</CardDescription>
                <CardTitle className="text-2xl">{connectedWebhooks.length}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Active Webhooks</CardDescription>
                <CardTitle className="text-2xl text-green-600">{activeWebhooks.length}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Expired/Missing</CardDescription>
                <CardTitle className="text-2xl text-destructive">
                  {connectedWebhooks.length - activeWebhooks.length}
                </CardTitle>
              </CardHeader>
            </Card>
          </div>

          {webhooks.length > 0 && (
            <div className="mb-4 p-3 bg-muted rounded-md">
              <p className="text-sm font-medium">Current Environment: {webhooks[0]?.environment || 'Unknown'}</p>
              <p className="text-sm text-muted-foreground mt-1">
                Webhook URL: <code className="text-xs bg-background px-1 py-0.5 rounded">{webhooks[0]?.registeredUrl || 'Not configured'}</code>
              </p>
            </div>
          )}

          {webhooksLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Agent Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Channel ID</TableHead>
                  <TableHead>Expiry</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {webhooks.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No users found
                    </TableCell>
                  </TableRow>
                ) : (
                  webhooks.map((webhook) => (
                    <TableRow key={webhook.userId} data-testid={`webhook-row-${webhook.userId}`}>
                      <TableCell className="font-medium">{webhook.userEmail}</TableCell>
                      <TableCell>{webhook.agentName || 'N/A'}</TableCell>
                      <TableCell>{getWebhookStatusBadge(webhook)}</TableCell>
                      <TableCell>
                        {webhook.channelId ? (
                          <code className="text-xs bg-muted px-1 py-0.5 rounded">
                            {webhook.channelId.slice(0, 16)}...
                          </code>
                        ) : (
                          <span className="text-muted-foreground text-sm">Not registered</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className={webhook.isExpired ? 'text-destructive' : ''}>
                          {formatWebhookExpiry(webhook.expiryDate)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => registerSingleMutation.mutate(webhook.userId)}
                          disabled={!webhook.hasGoogleCalendar || registerSingleMutation.isPending}
                          data-testid={`button-register-${webhook.userId}`}
                        >
                          {registerSingleMutation.isPending ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <>
                              <RefreshCw className="h-3 w-3 mr-1" />
                              Re-register
                            </>
                          )}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>About Webhook Management</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            <strong>What are webhooks?</strong> Webhooks allow Google Calendar to notify your application when events are created, updated, or deleted, enabling real-time two-way synchronization with reminders.
          </p>
          <p>
            <strong>When to use bulk re-register:</strong> Use this when deploying from development (.replit.dev) to production (.replit.app). Webhooks are tied to specific URLs, so they must be re-registered after deployment.
          </p>
          <p>
            <strong>Webhook expiry:</strong> Google Calendar webhooks expire after approximately 7 days. The system automatically renews them, but you can manually re-register if needed.
          </p>
          <p>
            <strong>Troubleshooting:</strong> If calendar sync is not working for a user, check their webhook status here. Re-register if it shows as "Expired" or "Not Registered".
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
