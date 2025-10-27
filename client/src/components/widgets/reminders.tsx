import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Bell, Clock, Download, Store, Globe, User, Mail, Phone, Trash2, Pencil } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import { formatTimezoneDisplay } from "@shared/timezoneUtils";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { QuickReminder } from "@/components/quick-reminder";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { format, parse } from "date-fns";
import { useAgentFilter } from '@/contexts/agent-filter-context';
import { useAuth } from "@/hooks/useAuth";

interface Reminder {
  id: string;
  clientId: string | null;
  title: string;
  description: string | null;
  scheduledDate: string; // YYYY-MM-DD
  scheduledTime: string; // HH:MM
  timezone: string; // IANA timezone identifier
  dueDate?: string; // Deprecated
  scheduledAtUtc?: string; // Deprecated
  reminderTimeZone?: string; // Deprecated
  isCompleted: boolean;
  createdAt: string;
  agentId?: string; // User ID of reminder owner
  agentName?: string; // Name of reminder owner
  storeMetadata?: {
    storeName?: string;
    storeLink?: string;
    uniqueIdentifier?: string;
    sheetId?: string;
    customerTimeZone?: string;
    [key: string]: any;
  };
}

interface RemindersWidgetProps {
  onPhoneClick?: (storeIdentifier: string, phoneNumber?: string) => void;
}

export function RemindersWidget({ onPhoneClick }: RemindersWidgetProps = {}) {
  const { toast } = useToast();
  const { user } = useAuth();
  const { selectedAgentIds } = useAgentFilter();
  const [editingReminder, setEditingReminder] = useState<Reminder | null>(null);
  const [deletingReminder, setDeletingReminder] = useState<Reminder | null>(null);
  
  const isAdmin = user?.role === 'admin';

  const { data, isLoading, error } = useQuery<{ reminders: Reminder[] }>({
    queryKey: ['/api/reminders', selectedAgentIds],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedAgentIds.length > 0) {
        selectedAgentIds.forEach(id => params.append('agentIds', id));
      }
      const response = await fetch(`/api/reminders?${params}`);
      if (!response.ok) throw new Error('Failed to fetch reminders');
      return response.json();
    }
  });

  // Fetch user preferences for timezone
  const { data: userPreferences } = useQuery<{ timezone?: string }>({
    queryKey: ['/api/user/preferences'],
  });

  const userTimezone = userPreferences?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest('DELETE', `/api/reminders/${id}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/reminders'] });
      toast({
        title: "Reminder deleted",
        description: "The reminder has been removed successfully.",
      });
      setDeletingReminder(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete reminder",
        variant: "destructive",
      });
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: any }) => {
      const response = await apiRequest('PATCH', `/api/reminders/${id}`, updates);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/reminders'] });
      toast({
        title: "Reminder updated",
        description: "Your changes have been saved successfully.",
      });
      setEditingReminder(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update reminder",
        variant: "destructive",
      });
    },
  });

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
          <CardTitle>Reminders</CardTitle>
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
          <CardTitle>Reminders</CardTitle>
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

  // Helper function to get effective reminder date from scheduledDate + scheduledTime + timezone
  const getReminderDate = (reminder: Reminder) => {
    // If using new date format
    if (reminder.scheduledDate && reminder.scheduledTime && reminder.timezone) {
      try {
        // Construct ISO datetime string representing the local time
        const dateTimeStr = `${reminder.scheduledDate}T${reminder.scheduledTime}:00`;
        
        // Convert from the reminder's timezone to UTC
        // This interprets the dateTimeStr as local time in reminder.timezone and returns UTC Date
        const utcDate = fromZonedTime(dateTimeStr, reminder.timezone);
        return utcDate;
      } catch (e) {
        console.error('Error parsing reminder date:', e);
        // Fallback: parse as ISO string (will use browser timezone)
        const dateTimeStr = `${reminder.scheduledDate}T${reminder.scheduledTime}:00`;
        return new Date(dateTimeStr);
      }
    }
    
    // Fallback to deprecated fields for old reminders
    if (reminder.scheduledAtUtc) {
      return new Date(reminder.scheduledAtUtc);
    }
    if (reminder.dueDate) {
      return new Date(reminder.dueDate);
    }
    
    return new Date();
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
    // If using new date format with timezone, format using the reminder's timezone
    if (reminder.scheduledDate && reminder.scheduledTime && reminder.timezone) {
      try {
        const dateTimeStr = `${reminder.scheduledDate}T${reminder.scheduledTime}:00`;
        return formatInTimeZone(dateTimeStr, reminder.timezone, 'MMM d, yyyy h:mm a zzz');
      } catch (e) {
        // Fallback to basic formatting
        return `${reminder.scheduledDate} ${reminder.scheduledTime}`;
      }
    }
    
    // Fallback for deprecated fields
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
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-primary" />
          Reminders
          {overdueCount > 0 && (
            <Badge variant="destructive" className="ml-2" data-testid="badge-overdue-count">
              {overdueCount}
            </Badge>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={handleExportCalendar}
            className="h-7 w-7 ml-auto"
            data-testid="button-export-calendar"
            title="Export to calendar (.ics)"
          >
            <Download className="h-4 w-4" />
          </Button>
        </CardTitle>
        <CardDescription>Custom alerts and notifications</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 min-h-0 flex flex-col space-y-4">
        {/* Reminders List */}
        {activeReminders.length === 0 ? (
          <div className="text-center py-8 text-sm text-muted-foreground">
            No active reminders
          </div>
        ) : (
          <div className="flex-1 min-h-0 overflow-y-auto pr-2">
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
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-medium leading-snug">
                            {reminder.title}
                          </p>
                          {reminder.agentName && (
                            <Badge variant="secondary" className="text-xs" data-testid={`badge-agent-${reminder.id}`}>
                              <User className="h-3 w-3 mr-1" />
                              {reminder.agentName}
                            </Badge>
                          )}
                        </div>
                      </div>
                      {/* Action Buttons - Admin Only */}
                      {isAdmin && (
                        <div className="flex gap-1 flex-shrink-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => setEditingReminder(reminder)}
                            data-testid={`button-edit-reminder-${reminder.id}`}
                            title="Edit reminder"
                          >
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-destructive hover:text-destructive"
                            onClick={() => setDeletingReminder(reminder)}
                            data-testid={`button-delete-reminder-${reminder.id}`}
                            title="Delete reminder"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
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
                              onClick={(e) => {
                                console.log('[RemindersWidget] Phone clicked:', reminder.storeMetadata.pocPhone);
                                // Prevent immediate dial to avoid interrupting navigation
                                e.preventDefault();
                                // Navigate to store details, phone will dial after delay
                                if (onPhoneClick && reminder.storeMetadata.uniqueIdentifier) {
                                  console.log('[RemindersWidget] Calling onPhoneClick with store:', reminder.storeMetadata.uniqueIdentifier);
                                  onPhoneClick(reminder.storeMetadata.uniqueIdentifier, reminder.storeMetadata.pocPhone);
                                }
                              }}
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
          </div>
        )}
      </CardContent>

      {/* Edit Dialog */}
      <Dialog open={!!editingReminder} onOpenChange={(open) => !open && setEditingReminder(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Reminder</DialogTitle>
            <DialogDescription>
              Update the reminder details below
            </DialogDescription>
          </DialogHeader>
          {editingReminder && (
            <QuickReminder
              defaultNote={editingReminder.description || ''}
              defaultDate={editingReminder.scheduledDate ? parse(editingReminder.scheduledDate, 'yyyy-MM-dd', new Date()) : new Date()}
              storeAddress={editingReminder.storeMetadata?.address}
              storeCity={editingReminder.storeMetadata?.city}
              storeState={editingReminder.storeMetadata?.state}
              userTimezone={userTimezone}
              defaultTimezoneMode={editingReminder.storeMetadata?.customerTimeZone ? "customer" : "agent"}
              timeFormat={userPreferences?.timeFormat || "12hr"}
              pointOfContact={editingReminder.storeMetadata?.pointOfContact}
              pocEmail={editingReminder.storeMetadata?.pocEmail}
              pocPhone={editingReminder.storeMetadata?.pocPhone}
              defaultEmail={editingReminder.storeMetadata?.email}
              defaultPhone={editingReminder.storeMetadata?.phone}
              defaultCalendarReminders={userPreferences?.defaultCalendarReminders || [{ method: 'popup', minutes: 10 }]}
              isSaving={updateMutation.isPending}
              onSave={async (reminderData) => {
                // Extract store name from title ("Follow up: StoreName" -> "StoreName")
                const storeName = editingReminder.title.replace(/^Follow up:\s*/, '');
                
                await updateMutation.mutateAsync({
                  id: editingReminder.id,
                  updates: {
                    title: `Follow up: ${storeName}`,
                    description: reminderData.note,
                    scheduledDate: format(reminderData.date, 'yyyy-MM-dd'),
                    scheduledTime: reminderData.time,
                    timezone: reminderData.useCustomerTimezone && reminderData.customerTimezone 
                      ? reminderData.customerTimezone 
                      : reminderData.agentTimezone,
                    storeMetadata: {
                      ...editingReminder.storeMetadata,
                      customerTimeZone: reminderData.customerTimezone,
                    },
                  },
                });
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingReminder} onOpenChange={(open) => !open && setDeletingReminder(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Reminder</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this reminder? This action cannot be undone.
              {deletingReminder && (
                <div className="mt-2 p-2 rounded-md bg-muted text-sm">
                  <strong>{deletingReminder.title}</strong>
                  {deletingReminder.description && (
                    <p className="mt-1 text-muted-foreground">{deletingReminder.description}</p>
                  )}
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingReminder && deleteMutation.mutate(deletingReminder.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
