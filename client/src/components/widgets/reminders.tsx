import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings2, Bell, Clock, Plus, Download, Store, Globe, User, Mail, Phone } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { formatInTimeZone } from "date-fns-tz";
import { formatTimezoneDisplay } from "@shared/timezoneUtils";

interface Reminder {
  id: string;
  clientId: string | null;
  title: string;
  description: string | null;
  dueDate: string;
  scheduledAtUtc?: string;
  reminderTimeZone?: string;
  isCompleted: boolean;
  createdAt: string;
  storeMetadata?: {
    storeName?: string;
    storeLink?: string;
    uniqueIdentifier?: string;
    sheetId?: string;
    customerTimeZone?: string;
    [key: string]: any;
  };
}

export function RemindersWidget() {
  const { toast } = useToast();

  const { data, isLoading, error } = useQuery<{ reminders: Reminder[] }>({
    queryKey: ['/api/reminders'],
  });

  // Fetch user preferences for timezone
  const { data: userPreferences } = useQuery<{ timezone?: string }>({
    queryKey: ['/api/user/preferences'],
  });

  const userTimezone = userPreferences?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;

  const handleExportCalendar = async () => {
    try {
      const response = await fetch('/api/reminders/export/calendar', {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to export calendar');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'reminders.ics';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast({
        title: "Calendar exported",
        description: "Your reminders have been exported to a calendar file."
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to export calendar. Please try again.",
        variant: "destructive"
      });
    }
  };

  if (isLoading) {
    return (
      <Card className="h-full">
        <CardHeader className="drag-handle cursor-move">
          <CardTitle className="flex items-center justify-between">
            Reminders
            <Settings2 className="h-4 w-4 text-muted-foreground" />
          </CardTitle>
          <CardDescription>Custom alerts and notifications</CardDescription>
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
          <CardTitle className="flex items-center justify-between">
            Reminders
            <Settings2 className="h-4 w-4 text-muted-foreground" />
          </CardTitle>
          <CardDescription>Custom alerts and notifications</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-destructive" data-testid="error-reminders">
            Failed to load reminders
          </p>
        </CardContent>
      </Card>
    );
  }

  // Helper function to get effective reminder date (prefer scheduledAtUtc, fallback to dueDate)
  const getReminderDate = (reminder: Reminder) => {
    return reminder.scheduledAtUtc ? new Date(reminder.scheduledAtUtc) : new Date(reminder.dueDate);
  };

  const activeReminders = data.reminders
    .filter(r => !r.isCompleted)
    .sort((a, b) => getReminderDate(a).getTime() - getReminderDate(b).getTime());

  const overdueCount = activeReminders.filter(r => getReminderDate(r) < new Date()).length;

  const isOverdue = (reminder: Reminder) => getReminderDate(reminder) < new Date();
  const getDaysUntil = (reminder: Reminder) => {
    const dueDate = getReminderDate(reminder);
    const days = Math.ceil((dueDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    if (days < 0) return `${Math.abs(days)}d overdue`;
    if (days === 0) return 'Today';
    if (days === 1) return 'Tomorrow';
    return `${days}d`;
  };

  const formatReminderTime = (reminder: Reminder) => {
    const date = getReminderDate(reminder);
    try {
      return formatInTimeZone(date, userTimezone, 'MMM d, yyyy h:mm a zzz');
    } catch {
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: 'numeric'
      });
    }
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="drag-handle cursor-move flex-shrink-0">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            Reminders
            {overdueCount > 0 && (
              <Badge variant="destructive" className="ml-2" data-testid="badge-overdue-count">
                {overdueCount}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleExportCalendar}
              className="h-7 w-7"
              data-testid="button-export-calendar"
              title="Export to calendar (.ics)"
            >
              <Download className="h-4 w-4" />
            </Button>
            <Settings2 className="h-4 w-4 text-muted-foreground" />
          </div>
        </CardTitle>
        <CardDescription>Custom alerts and notifications</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 min-h-0 space-y-4">
        {/* Add Reminder Button */}
        <Button variant="outline" className="w-full" size="sm" data-testid="button-add-reminder">
          <Plus className="h-4 w-4 mr-2" />
          Add Reminder
        </Button>

        {/* Reminders List */}
        {activeReminders.length === 0 ? (
          <div className="text-center py-8 text-sm text-muted-foreground">
            No active reminders
          </div>
        ) : (
          <ScrollArea className="flex-1 pr-4">
            <div className="space-y-3">
              {activeReminders.map((reminder) => (
                <div
                  key={reminder.id}
                  className={`flex items-start gap-3 p-3 rounded-md border transition-colors ${
                    isOverdue(reminder)
                      ? 'bg-destructive/10 border-destructive/20'
                      : 'bg-muted/30 border-border hover-elevate'
                  }`}
                  data-testid={`reminder-${reminder.id}`}
                >
                  {/* Icon */}
                  <div className="flex-shrink-0 mt-0.5">
                    <Clock className={`h-4 w-4 ${isOverdue(reminder) ? 'text-destructive' : 'text-muted-foreground'}`} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0 space-y-1">
                    <p className="text-sm font-medium leading-snug">
                      {reminder.title}
                    </p>
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
                    {reminder.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {reminder.description}
                      </p>
                    )}
                    {/* Contact Information */}
                    {reminder.storeMetadata && (reminder.storeMetadata.pointOfContact || reminder.storeMetadata.pocEmail || reminder.storeMetadata.pocPhone) && (
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
                            <a 
                              href={`tel:${reminder.storeMetadata.pocPhone}`}
                              className="hover:text-primary hover:underline"
                              data-testid={`link-phone-${reminder.id}`}
                            >
                              {reminder.storeMetadata.pocPhone}
                            </a>
                          </div>
                        )}
                      </div>
                    )}
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <Badge 
                        variant={isOverdue(reminder) ? "destructive" : "secondary"}
                        className="text-xs"
                      >
                        {getDaysUntil(reminder)}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {formatReminderTime(reminder)}
                      </span>
                      {reminder.storeMetadata?.customerTimeZone && (
                        <Badge variant="outline" className="text-xs">
                          <Globe className="h-3 w-3 mr-1" />
                          {formatTimezoneDisplay(reminder.storeMetadata.customerTimeZone)}
                        </Badge>
                      )}
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
