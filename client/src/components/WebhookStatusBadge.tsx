import { useEffect, useState } from "react";
import { useWebhookStatus, formatRemainingTime } from "@/hooks/useWebhookStatus";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { CheckCircle, AlertTriangle, WifiOff, Link as LinkIcon, Clock } from "lucide-react";

const SESSION_STORAGE_KEY = 'webhook-expiry-dismissed';

export function WebhookStatusBadge() {
  const { status, isLoading, reRegister, isReRegistering } = useWebhookStatus();
  const [showExpiredDialog, setShowExpiredDialog] = useState(false);

  // Check for state degradation and show popup
  useEffect(() => {
    if (!status) return;

    const dismissed = sessionStorage.getItem(SESSION_STORAGE_KEY);
    const dismissedTime = dismissed ? parseInt(dismissed) : 0;
    const twelveHoursAgo = Date.now() - (12 * 60 * 60 * 1000);

    // Show popup if webhook expired/missing and not dismissed recently
    if ((status.state === 'expired' || status.state === 'missing') && 
        dismissedTime < twelveHoursAgo) {
      setShowExpiredDialog(true);
    }
  }, [status?.state]);

  const handleDismiss = () => {
    sessionStorage.setItem(SESSION_STORAGE_KEY, Date.now().toString());
    setShowExpiredDialog(false);
  };

  const handleReRegister = () => {
    reRegister();
    setShowExpiredDialog(false);
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
  };

  if (isLoading || !status) {
    return null;
  }

  const getBadgeContent = () => {
    switch (status.state) {
      case 'active':
        return {
          icon: <CheckCircle className="h-3 w-3" data-testid="icon-webhook-active" />,
          text: 'Active',
          variant: 'default' as const,
          className: 'bg-green-600 hover-elevate active-elevate-2 text-white',
        };
      case 'expired':
        return {
          icon: <AlertTriangle className="h-3 w-3" data-testid="icon-webhook-expired" />,
          text: 'Re-register',
          variant: 'destructive' as const,
          className: 'hover-elevate active-elevate-2',
        };
      case 'missing':
        return {
          icon: <AlertTriangle className="h-3 w-3" data-testid="icon-webhook-missing" />,
          text: 'Re-register',
          variant: 'destructive' as const,
          className: 'hover-elevate active-elevate-2',
        };
      case 'disconnected':
        return {
          icon: <WifiOff className="h-3 w-3" data-testid="icon-webhook-disconnected" />,
          text: 'Connect Calendar',
          variant: 'outline' as const,
          className: 'hover-elevate active-elevate-2',
        };
    }
  };

  const getTooltipContent = () => {
    switch (status.state) {
      case 'active':
        return (
          <div className="space-y-1">
            <p className="font-semibold">Calendar Sync Active</p>
            <p className="text-sm flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Expires in: {formatRemainingTime(status.remainingMs)}
            </p>
            {status.reRegisterRecommended && (
              <p className="text-sm text-yellow-400 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                Expiring soon
              </p>
            )}
          </div>
        );
      case 'expired':
        return (
          <div className="space-y-1">
            <p className="font-semibold">Webhook Expired</p>
            <p className="text-sm">Calendar sync is not working</p>
            <p className="text-sm">Click to re-register</p>
          </div>
        );
      case 'missing':
        return (
          <div className="space-y-1">
            <p className="font-semibold">Webhook Not Registered</p>
            <p className="text-sm">Calendar sync is not active</p>
            <p className="text-sm">Click to register</p>
          </div>
        );
      case 'disconnected':
        return (
          <div className="space-y-1">
            <p className="font-semibold">Calendar Not Connected</p>
            <p className="text-sm">Go to Settings to connect</p>
          </div>
        );
    }
  };

  const badgeContent = getBadgeContent();

  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant={badgeContent.variant}
            className={`gap-1 ${badgeContent.className}`}
            data-testid="badge-webhook-status"
          >
            {badgeContent.icon}
            {isReRegistering ? 'Registering...' : badgeContent.text}
          </Badge>
        </TooltipTrigger>
        <TooltipContent data-testid="tooltip-webhook-status">
          {getTooltipContent()}
        </TooltipContent>
      </Tooltip>

      <AlertDialog open={showExpiredDialog} onOpenChange={setShowExpiredDialog}>
        <AlertDialogContent data-testid="dialog-webhook-expired">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Calendar Sync Inactive
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                Your Google Calendar webhook has {status.state === 'expired' ? 'expired' : 'not been registered'}.
                This means your reminders are no longer syncing with Google Calendar.
              </p>
              <p className="font-semibold">
                To restore automatic calendar sync, please re-register your webhook now.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleDismiss} data-testid="button-dismiss-webhook-alert">
              Remind me later
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleReRegister}
              className="bg-green-600 hover:bg-green-700"
              data-testid="button-reregister-webhook"
              data-primary="true"
            >
              <LinkIcon className="h-4 w-4 mr-2" />
              Re-register now
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
