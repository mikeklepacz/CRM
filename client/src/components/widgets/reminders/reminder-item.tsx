import { Globe, Clock, Mail, Phone, Store, Trash2, User } from "lucide-react";
import { Link } from "wouter";
import { formatTimezoneDisplay } from "@shared/timezoneUtils";
import { Badge } from "@/components/ui/badge";
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from "@/components/ui/context-menu";
import { VoipCallButton } from "@/components/voip-call-button";
import { formatReminderTime, getDaysUntil, isOverdue } from "./date-utils";
import type { Reminder } from "./types";

interface ReminderItemProps {
  deletePending: boolean;
  onDelete: (id: string) => void;
  onPhoneClick?: (storeIdentifier: string, phoneNumber?: string) => void;
  reminder: Reminder;
  userTimezone: string;
}

export function ReminderItem({ deletePending, onDelete, onPhoneClick, reminder, userTimezone }: ReminderItemProps) {
  return (
    <ContextMenu key={reminder.id}>
      <ContextMenuTrigger asChild>
        <div
          className={`flex items-start gap-3 p-3 rounded-md border transition-colors ${
            isOverdue(reminder) ? "bg-destructive/10 border-destructive/20" : "bg-muted/30 border-border hover-elevate"
          }`}
          data-testid={`reminder-${reminder.id}`}
        >
          <div className="flex-shrink-0 mt-0.5">
            <Clock className={`h-4 w-4 ${isOverdue(reminder) ? "text-destructive" : "text-muted-foreground"}`} />
          </div>

          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-medium leading-snug">{reminder.title}</p>
                  {reminder.agentName && (
                    <Badge variant="secondary" className="text-xs" data-testid={`badge-agent-${reminder.id}`}>
                      <User className="h-3 w-3 mr-1" />
                      {reminder.agentName}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            {reminder.storeMetadata?.storeName && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Store className="h-3 w-3" />
                {reminder.storeMetadata.uniqueIdentifier ? (
                  <Link
                    href={`/store/${encodeURIComponent(reminder.storeMetadata.uniqueIdentifier)}`}
                    className="hover:text-primary hover:underline"
                    data-testid={`link-store-${reminder.id}`}
                  >
                    {reminder.storeMetadata.storeName}
                  </Link>
                ) : (
                  <span>{reminder.storeMetadata.storeName}</span>
                )}
              </div>
            )}
            {reminder.description && <p className="text-xs text-muted-foreground line-clamp-2">{reminder.description}</p>}
            {reminder.storeMetadata &&
              (reminder.storeMetadata.pointOfContact || reminder.storeMetadata.pocEmail || reminder.storeMetadata.pocPhone) && (
                <div className="flex flex-col gap-1 mt-1.5 text-xs">
                  {reminder.storeMetadata.pointOfContact && (
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <User className="h-3 w-3 shrink-0" />
                      <span>{reminder.storeMetadata.pointOfContact}</span>
                    </div>
                  )}
                  {reminder.storeMetadata.pocEmail && (
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Mail className="h-3 w-3 shrink-0" />
                      <a
                        href={`mailto:${reminder.storeMetadata.pocEmail}`}
                        className="hover:text-primary hover:underline"
                        data-testid={`link-email-${reminder.id}`}
                      >
                        {reminder.storeMetadata.pocEmail}
                      </a>
                    </div>
                  )}
                  {reminder.storeMetadata.pocPhone && (
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Phone className="h-3 w-3 shrink-0" />
                      <VoipCallButton
                        phoneNumber={reminder.storeMetadata?.pocPhone}
                        storeName={reminder.storeMetadata?.storeName || undefined}
                        storeLink={reminder.storeMetadata?.uniqueIdentifier || undefined}
                        className="hover:text-primary hover:underline cursor-pointer"
                        data-testid={`link-phone-${reminder.id}`}
                        skipCall={!!onPhoneClick}
                        onClick={() => {
                          console.log("[RemindersWidget] Phone clicked:", reminder.storeMetadata?.pocPhone);
                          if (onPhoneClick && reminder.storeMetadata?.uniqueIdentifier) {
                            console.log(
                              "[RemindersWidget] Calling onPhoneClick with store:",
                              reminder.storeMetadata.uniqueIdentifier,
                            );
                            onPhoneClick(reminder.storeMetadata.uniqueIdentifier, reminder.storeMetadata?.pocPhone);
                          }
                        }}
                      >
                        {reminder.storeMetadata?.pocPhone}
                      </VoipCallButton>
                    </div>
                  )}
                </div>
              )}
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <Badge variant={isOverdue(reminder) ? "destructive" : "secondary"} className="text-xs">
                {getDaysUntil(reminder)}
              </Badge>
              <span className="text-xs text-muted-foreground">{formatReminderTime(reminder, userTimezone)}</span>
              {reminder.storeMetadata?.customerTimeZone && (
                <Badge variant="outline" className="text-xs">
                  <Globe className="h-3 w-3 mr-1" />
                  {formatTimezoneDisplay(reminder.storeMetadata.customerTimeZone)}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem
          className="text-destructive focus:text-destructive"
          disabled={deletePending}
          onClick={() => onDelete(reminder.id)}
          data-testid={`context-delete-reminder-${reminder.id}`}
        >
          <Trash2 className="h-4 w-4 mr-2" />
          {deletePending ? "Deleting..." : "Delete Reminder"}
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
