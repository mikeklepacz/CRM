import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle, Clock, XCircle } from "lucide-react";
import type { WebhookStatus } from "./webhook-management-types";

export const getStatusBadge = (webhook: WebhookStatus) => {
  if (!webhook.hasGoogleCalendar) {
    return (
      <Badge variant="outline" className="gap-1">
        <XCircle className="h-3 w-3" />
        No Calendar
      </Badge>
    );
  }
  if (!webhook.channelId) {
    return (
      <Badge variant="outline" className="gap-1">
        <AlertTriangle className="h-3 w-3" />
        Not Registered
      </Badge>
    );
  }
  if (webhook.isExpired) {
    return (
      <Badge variant="destructive" className="gap-1">
        <Clock className="h-3 w-3" />
        Expired
      </Badge>
    );
  }
  return (
    <Badge variant="default" className="gap-1 bg-green-600 hover:bg-green-700">
      <CheckCircle className="h-3 w-3" />
      Active
    </Badge>
  );
};

export const formatExpiry = (expiryDate: string | null) => {
  if (!expiryDate) return "N/A";
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
