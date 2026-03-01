import { useMutation, useQuery } from "@tanstack/react-query";
import { Bell, Download } from "lucide-react";
import { useAgentFilter } from "@/contexts/agent-filter-context";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getReminderDate } from "@/components/widgets/reminders/date-utils";
import { ReminderItem } from "@/components/widgets/reminders/reminder-item";
import { RemindersErrorState, RemindersLoadingState } from "@/components/widgets/reminders/widget-shell-states";
import type { Reminder } from "@/components/widgets/reminders/types";

interface RemindersWidgetProps {
  onPhoneClick?: (storeIdentifier: string, phoneNumber?: string) => void;
}

export function RemindersWidget({ onPhoneClick }: RemindersWidgetProps = {}) {
  const { toast } = useToast();
  const { selectedAgentIds } = useAgentFilter();

  const deleteReminderMutation = useMutation({
    mutationFn: async (reminderId: string) => {
      await apiRequest("DELETE", `/api/reminders/${reminderId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reminders"] });
      toast({
        title: "Reminder deleted",
        description: "The reminder has been removed from the CRM and your Google Calendar.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to delete",
        description: error.message || "Could not delete the reminder. Please try again.",
        variant: "destructive",
      });
    },
  });

  const { data, isLoading, error } = useQuery<{ reminders: Reminder[] }>({
    queryKey: ["/api/reminders", selectedAgentIds],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedAgentIds.length > 0) {
        selectedAgentIds.forEach((id) => params.append("agentIds", id));
      }
      const response = await fetch(`/api/reminders?${params}`);
      if (!response.ok) throw new Error("Failed to fetch reminders");
      return response.json();
    },
  });

  const { data: userPreferences } = useQuery<{ timezone?: string }>({
    queryKey: ["/api/user/preferences"],
  });

  const userTimezone = userPreferences?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;

  const handleExportCalendar = async () => {
    try {
      const response = await fetch("/api/reminders/export/calendar", {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to export calendar");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "reminders.ics";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast({
        title: "Calendar exported",
        description: "Your reminders have been exported to a calendar file.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to export calendar. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return <RemindersLoadingState />;
  }

  if (error || !data) {
    return <RemindersErrorState />;
  }

  const activeReminders = data.reminders
    .filter((r) => !r.isCompleted)
    .sort((a, b) => getReminderDate(a).getTime() - getReminderDate(b).getTime());

  const overdueCount = activeReminders.filter((r) => getReminderDate(r) < new Date()).length;

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
            className="ml-auto"
            data-testid="button-export-calendar"
            title="Export to calendar (.ics)"
          >
            <Download className="h-4 w-4" />
          </Button>
        </CardTitle>
        <CardDescription>Custom alerts and notifications</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 min-h-0 flex flex-col space-y-4">
        {activeReminders.length === 0 ? (
          <div className="text-center py-8 text-sm text-muted-foreground">No active reminders</div>
        ) : (
          <div className="flex-1 min-h-0 overflow-y-auto pr-2">
            <div className="space-y-3">
              {activeReminders.map((reminder) => (
                <ReminderItem
                  key={reminder.id}
                  deletePending={deleteReminderMutation.isPending}
                  onDelete={(id) => deleteReminderMutation.mutate(id)}
                  onPhoneClick={onPhoneClick}
                  reminder={reminder}
                  userTimezone={userTimezone}
                />
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
