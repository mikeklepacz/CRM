import { Badge } from "@/components/ui/badge";
import type { WebhookStatus } from "./webhook-manager-types";

export function getWebhookStatusBadge(webhook: WebhookStatus) {
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
}

export function formatWebhookExpiry(expiryDate: string | null | undefined) {
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
}
