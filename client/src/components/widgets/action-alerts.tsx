import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, Bell, RefreshCw } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Notification {
  id: string;
  type: string;
  message: string;
  priority: string;
  isRead: boolean;
  isResolved: boolean;
  createdAt: string;
  metadata?: {
    clientName?: string;
    daysRemaining?: number;
    amount?: number;
  };
}

export function ActionAlertsWidget() {
  const { data, isLoading, error } = useQuery<{ notifications: Notification[] }>({
    queryKey: ['/api/notifications'],
  });

  if (isLoading) {
    return (
      <Card className="h-full">
        <CardHeader className="drag-handle cursor-move">
          <CardTitle>Action Required</CardTitle>
          <CardDescription>Commission warnings and follow-ups</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card className="h-full">
        <CardHeader className="drag-handle cursor-move">
          <CardTitle>Action Required</CardTitle>
          <CardDescription>Commission warnings and follow-ups</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-destructive" data-testid="error-action-alerts">
            Failed to load notifications
          </p>
        </CardContent>
      </Card>
    );
  }

  const unreadNotifications = data.notifications
    .filter(n => !n.isRead && !n.isResolved)
    .sort((a, b) => {
      // Sort by priority (urgent first) then by date
      const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
      const priorityDiff = (priorityOrder[a.priority as keyof typeof priorityOrder] || 3) - 
                          (priorityOrder[b.priority as keyof typeof priorityOrder] || 3);
      if (priorityDiff !== 0) return priorityDiff;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  const urgentCount = unreadNotifications.filter(n => n.priority === 'urgent').length;

  const getNotificationIcon = (type: string, priority: string) => {
    if (priority === 'urgent') {
      return <AlertTriangle className="h-4 w-4 text-destructive" />;
    }
    switch (type) {
      case 'reminder':
        return <Bell className="h-4 w-4 text-primary" />;
      case 'reorder_alert':
        return <RefreshCw className="h-4 w-4 text-primary" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getPriorityVariant = (priority: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (priority) {
      case 'urgent':
        return 'destructive';
      case 'high':
        return 'default';
      default:
        return 'secondary';
    }
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="drag-handle cursor-move flex-shrink-0">
        <CardTitle className="flex items-center gap-2">
          Action Required
          {urgentCount > 0 && (
            <Badge variant="destructive" className="ml-2" data-testid="badge-urgent-count">
              {urgentCount}
            </Badge>
          )}
        </CardTitle>
        <CardDescription>Commission warnings and follow-ups</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 min-h-0">
        {unreadNotifications.length === 0 ? (
          <div className="text-center py-8 text-sm text-muted-foreground">
            No pending actions
          </div>
        ) : (
          <ScrollArea className="h-full pr-4">
            <div className="space-y-3">
              {unreadNotifications.map((notification) => (
                <div
                  key={notification.id}
                  className="flex items-start gap-3 p-3 bg-muted/30 hover-elevate rounded-md transition-colors"
                  data-testid={`notification-${notification.id}`}
                >
                  {/* Icon */}
                  <div className="flex-shrink-0 mt-0.5">
                    {getNotificationIcon(notification.type, notification.priority)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0 space-y-1">
                    <p className="text-sm font-medium leading-snug">
                      {notification.message}
                    </p>
                    {notification.metadata?.clientName && (
                      <p className="text-xs text-muted-foreground">
                        Client: {notification.metadata.clientName}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant={getPriorityVariant(notification.priority)} className="text-xs">
                        {notification.priority}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {new Date(notification.createdAt).toLocaleDateString('en-US', { 
                          month: 'short', 
                          day: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
