import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings2, Bell, Clock, Plus, Check, Download } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface Reminder {
  id: string;
  clientId: string | null;
  title: string;
  description: string | null;
  dueDate: string;
  isCompleted: boolean;
  createdAt: string;
}

export function RemindersWidget() {
  const { toast } = useToast();

  const { data, isLoading, error } = useQuery<{ reminders: Reminder[] }>({
    queryKey: ['/api/reminders'],
  });

  const completeMutation = useMutation({
    mutationFn: async (reminderId: string) => {
      await apiRequest("PUT", `/api/reminders/${reminderId}`, { isCompleted: true });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/reminders'] });
      toast({
        title: "Reminder completed",
        description: "The reminder has been marked as complete."
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to complete reminder. Please try again.",
        variant: "destructive"
      });
    }
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

  const activeReminders = data.reminders
    .filter(r => !r.isCompleted)
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

  const overdueCount = activeReminders.filter(r => new Date(r.dueDate) < new Date()).length;

  const isOverdue = (dueDate: string) => new Date(dueDate) < new Date();
  const getDaysUntil = (dueDate: string) => {
    const days = Math.ceil((new Date(dueDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    if (days < 0) return `${Math.abs(days)}d overdue`;
    if (days === 0) return 'Today';
    if (days === 1) return 'Tomorrow';
    return `${days}d`;
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
                    isOverdue(reminder.dueDate)
                      ? 'bg-destructive/10 border-destructive/20'
                      : 'bg-muted/30 border-border hover-elevate'
                  }`}
                  data-testid={`reminder-${reminder.id}`}
                >
                  {/* Icon */}
                  <div className="flex-shrink-0 mt-0.5">
                    <Clock className={`h-4 w-4 ${isOverdue(reminder.dueDate) ? 'text-destructive' : 'text-muted-foreground'}`} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0 space-y-1">
                    <p className="text-sm font-medium leading-snug">
                      {reminder.title}
                    </p>
                    {reminder.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {reminder.description}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-1">
                      <Badge 
                        variant={isOverdue(reminder.dueDate) ? "destructive" : "secondary"}
                        className="text-xs"
                      >
                        {getDaysUntil(reminder.dueDate)}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {new Date(reminder.dueDate).toLocaleDateString('en-US', { 
                          month: 'short', 
                          day: 'numeric'
                        })}
                      </span>
                    </div>
                  </div>

                  {/* Complete Button */}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => completeMutation.mutate(reminder.id)}
                    disabled={completeMutation.isPending}
                    data-testid={`button-complete-${reminder.id}`}
                  >
                    <Check className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
