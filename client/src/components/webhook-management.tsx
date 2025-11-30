import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { RefreshCw, CheckCircle, XCircle, Clock, AlertTriangle } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface WebhookStatus {
  userId: string;
  userEmail: string;
  agentName: string;
  hasGoogleCalendar: boolean;
  channelId: string | null;
  resourceId: string | null;
  expiry: number | null;
  expiryDate: string | null;
  isExpired: boolean | null;
  registeredUrl: string;
  environment: 'production' | 'development';
}

export function WebhookManagement() {
  const { toast } = useToast();
  const [showBulkDialog, setShowBulkDialog] = useState(false);

  const { data: webhooksData, isLoading } = useQuery<{ webhooks: WebhookStatus[] }>({
    queryKey: ['/api/admin/webhooks'],
  });

  const bulkRegisterMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('POST', '/api/admin/webhooks/bulk-register', {});
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/webhooks'] });
      toast({
        title: 'Bulk Registration Complete',
        description: `Successfully registered ${data.successful} webhooks. Failed: ${data.failed}, Skipped: ${data.skipped}`,
      });
      setShowBulkDialog(false);
    },
    onError: (error: any) => {
      toast({
        title: 'Bulk Registration Failed',
        description: error.message || 'Failed to register webhooks',
        variant: 'destructive',
      });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (userId: string) => {
      return await apiRequest('POST', `/api/admin/webhooks/${userId}/register`, {});
    },
    onSuccess: (data: any, userId: string) => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/webhooks'] });
      const webhook = webhooksData?.webhooks.find(w => w.userId === userId);
      toast({
        title: 'Webhook Registered',
        description: `Successfully registered webhook for ${webhook?.userEmail}`,
      });
    },
    onError: (error: any, userId: string) => {
      const webhook = webhooksData?.webhooks.find(w => w.userId === userId);
      toast({
        title: 'Registration Failed',
        description: `Failed to register webhook for ${webhook?.userEmail}: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  const webhooks = webhooksData?.webhooks || [];
  const connectedWebhooks = webhooks.filter(w => w.hasGoogleCalendar);
  const activeWebhooks = connectedWebhooks.filter(w => w.channelId && !w.isExpired);
  const expiredWebhooks = connectedWebhooks.filter(w => w.channelId && w.isExpired);

  const getStatusBadge = (webhook: WebhookStatus) => {
    if (!webhook.hasGoogleCalendar) {
      return <Badge variant="outline" className="gap-1"><XCircle className="h-3 w-3" />No Calendar</Badge>;
    }
    if (!webhook.channelId) {
      return <Badge variant="outline" className="gap-1"><AlertTriangle className="h-3 w-3" />Not Registered</Badge>;
    }
    if (webhook.isExpired) {
      return <Badge variant="destructive" className="gap-1"><Clock className="h-3 w-3" />Expired</Badge>;
    }
    return <Badge variant="default" className="gap-1 bg-green-600 hover:bg-green-700"><CheckCircle className="h-3 w-3" />Active</Badge>;
  };

  const formatExpiry = (expiryDate: string | null) => {
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

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Webhook Management</CardTitle>
          <CardDescription>Loading webhook statuses...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Google Calendar Webhook Management</CardTitle>
              <CardDescription>
                Manage webhook registrations for Google Calendar synchronization
              </CardDescription>
            </div>
            <Button
              onClick={() => setShowBulkDialog(true)}
              disabled={bulkRegisterMutation.isPending}
              data-testid="button-bulk-register"
            >
              {bulkRegisterMutation.isPending ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Registering...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Bulk Re-register All
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
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

          <div className="mb-4 p-3 bg-muted rounded-md">
            <p className="text-sm font-medium">Current Environment: {webhooks[0]?.environment || 'Unknown'}</p>
            <p className="text-sm text-muted-foreground mt-1">
              Webhook URL: <code className="text-xs bg-background px-1 py-0.5 rounded">{webhooks[0]?.registeredUrl || 'Not configured'}</code>
            </p>
          </div>

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
              {webhooks.map((webhook) => (
                <TableRow key={webhook.userId} data-testid={`webhook-row-${webhook.userId}`}>
                  <TableCell className="font-medium">{webhook.userEmail}</TableCell>
                  <TableCell>{webhook.agentName || 'N/A'}</TableCell>
                  <TableCell>{getStatusBadge(webhook)}</TableCell>
                  <TableCell>
                    {webhook.channelId ? (
                      <code className="text-xs bg-muted px-1 py-0.5 rounded">
                        {webhook.channelId.slice(0, 20)}...
                      </code>
                    ) : (
                      <span className="text-muted-foreground text-sm">Not registered</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className={webhook.isExpired ? 'text-destructive' : ''}>
                      {formatExpiry(webhook.expiryDate)}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => registerMutation.mutate(webhook.userId)}
                      disabled={!webhook.hasGoogleCalendar || registerMutation.isPending}
                      data-testid={`button-register-${webhook.userId}`}
                    >
                      {registerMutation.isPending ? (
                        <RefreshCw className="h-3 w-3 animate-spin" />
                      ) : (
                        'Re-register'
                      )}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
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
            <strong>Troubleshooting:</strong> If calendar sync isn't working for a user, check their webhook status here. Re-register if it shows as "Expired" or "Not Registered".
          </p>
        </CardContent>
      </Card>

      <AlertDialog open={showBulkDialog} onOpenChange={setShowBulkDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Bulk Re-register All Webhooks?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                This will re-register Google Calendar webhooks for all users who have connected their calendars ({connectedWebhooks.length} users).
              </p>
              <p>
                Use this after deploying to production or if multiple webhooks have expired.
              </p>
              <p className="font-medium text-foreground">
                This operation may take a few moments to complete.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-bulk">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => bulkRegisterMutation.mutate()}
              disabled={bulkRegisterMutation.isPending}
              data-testid="button-confirm-bulk"
              data-primary="true"
            >
              {bulkRegisterMutation.isPending ? 'Registering...' : 'Re-register All'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
