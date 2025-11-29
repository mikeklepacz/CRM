import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { format, parseISO } from "date-fns";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { CalendarIcon, Trash2, Loader2, Calendar as CalendarLucide, Building2, ToggleLeft } from "lucide-react";
import { cn } from "@/lib/utils";

interface BlockedDay {
  date: string;
  reason: string;
}

interface NoSendDate {
  id: string;
  date: string;
  reason: string;
  createdBy: string;
  createdAt: string | null;
}

interface HolidayToggle {
  holidayId: string;
  name: string;
  isIgnored: boolean;
}

export function HolidayCalendar() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [reason, setReason] = useState("");
  const [calendarOpen, setCalendarOpen] = useState(false);

  const { data: upcomingBlockedDays = [], isLoading: isLoadingUpcoming } = useQuery<BlockedDay[]>({
    queryKey: ['/api/no-send-dates/upcoming'],
  });

  const { data: customDates = [], isLoading: isLoadingCustom } = useQuery<NoSendDate[]>({
    queryKey: ['/api/no-send-dates'],
  });

  const { data: holidayToggles = [], isLoading: isLoadingToggles } = useQuery<HolidayToggle[]>({
    queryKey: ['/api/holidays/toggles'],
  });

  const toggleHolidayMutation = useMutation({
    mutationFn: async (data: { holidayId: string; holidayName: string; ignore: boolean }) => {
      return await apiRequest("POST", "/api/holidays/toggle", data);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/holidays/toggles'] });
      queryClient.invalidateQueries({ queryKey: ['/api/no-send-dates/upcoming'] });
      toast({
        title: variables.ignore ? "Holiday Ignored" : "Holiday Blocking Enabled",
        description: variables.ignore 
          ? `${variables.holidayName} will now allow outreach`
          : `${variables.holidayName} will now block outreach`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to toggle holiday",
        variant: "destructive",
      });
    },
  });

  const customDateSet = new Set(customDates.map(d => d.date));

  const addDateMutation = useMutation({
    mutationFn: async (data: { date: string; reason: string }) => {
      return await apiRequest("POST", "/api/no-send-dates", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/no-send-dates'] });
      queryClient.invalidateQueries({ queryKey: ['/api/no-send-dates/upcoming'] });
      setSelectedDate(undefined);
      setReason("");
      toast({
        title: "Date Added",
        description: "Custom blocked date has been added successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add blocked date",
        variant: "destructive",
      });
    },
  });

  const deleteDateMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/no-send-dates/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/no-send-dates'] });
      queryClient.invalidateQueries({ queryKey: ['/api/no-send-dates/upcoming'] });
      toast({
        title: "Date Removed",
        description: "Custom blocked date has been removed",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete blocked date",
        variant: "destructive",
      });
    },
  });

  const handleAddDate = () => {
    if (!selectedDate || !reason.trim()) {
      toast({
        title: "Missing Information",
        description: "Please select a date and provide a reason",
        variant: "destructive",
      });
      return;
    }

    const formattedDate = format(selectedDate, "yyyy-MM-dd");
    addDateMutation.mutate({ date: formattedDate, reason: reason.trim() });
  };

  const getCustomDateId = (dateStr: string): string | undefined => {
    const customDate = customDates.find(d => d.date === dateStr);
    return customDate?.id;
  };

  const isCustomDate = (dateStr: string): boolean => {
    return customDateSet.has(dateStr);
  };

  const isLoading = isLoadingUpcoming || isLoadingCustom || isLoadingToggles;

  const federalHolidays = holidayToggles.filter(h => 
    !h.holidayId.includes('eve') && 
    !h.holidayId.includes('weekend') && 
    !h.holidayId.includes('black_friday') && 
    !h.holidayId.includes('cyber_monday') &&
    !h.holidayId.includes('day_after')
  );
  
  const extendedWindows = holidayToggles.filter(h => 
    h.holidayId.includes('eve') || 
    h.holidayId.includes('weekend') || 
    h.holidayId.includes('black_friday') || 
    h.holidayId.includes('cyber_monday') ||
    h.holidayId.includes('day_after')
  );

  const handleToggle = (holiday: HolidayToggle) => {
    toggleHolidayMutation.mutate({
      holidayId: holiday.holidayId,
      holidayName: holiday.name,
      ignore: !holiday.isIgnored,
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarLucide className="h-5 w-5" />
          Holiday Calendar
        </CardTitle>
        <CardDescription>
          Manage blocked dates for email and call outreach. Toggle holidays on/off based on your business needs.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="rounded-md border p-4 bg-muted/30">
          <div className="flex items-center gap-2 mb-4">
            <ToggleLeft className="h-5 w-5" />
            <h3 className="font-medium">Holiday Blocking Controls</h3>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Turn holidays ON to block outreach on those days, or OFF to allow emails/calls. 
            This is useful for retail businesses that operate on "bank holidays."
          </p>
          
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-medium mb-3">Federal Holidays</h4>
              <div className="grid gap-2">
                {federalHolidays.map((holiday) => (
                  <div
                    key={holiday.holidayId}
                    className="flex items-center justify-between p-2 rounded-md border bg-card"
                    data-testid={`toggle-row-${holiday.holidayId}`}
                  >
                    <span className="text-sm">{holiday.name}</span>
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "text-xs",
                        holiday.isIgnored ? "text-muted-foreground" : "text-green-600 dark:text-green-400"
                      )}>
                        {holiday.isIgnored ? "OFF" : "ON"}
                      </span>
                      <Switch
                        checked={!holiday.isIgnored}
                        onCheckedChange={() => handleToggle(holiday)}
                        disabled={toggleHolidayMutation.isPending}
                        data-testid={`switch-${holiday.holidayId}`}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div>
              <h4 className="text-sm font-medium mb-3">Extended Holiday Windows</h4>
              <div className="grid gap-2">
                {extendedWindows.map((holiday) => (
                  <div
                    key={holiday.holidayId}
                    className="flex items-center justify-between p-2 rounded-md border bg-card"
                    data-testid={`toggle-row-${holiday.holidayId}`}
                  >
                    <span className="text-sm">{holiday.name}</span>
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "text-xs",
                        holiday.isIgnored ? "text-muted-foreground" : "text-green-600 dark:text-green-400"
                      )}>
                        {holiday.isIgnored ? "OFF" : "ON"}
                      </span>
                      <Switch
                        checked={!holiday.isIgnored}
                        onCheckedChange={() => handleToggle(holiday)}
                        disabled={toggleHolidayMutation.isPending}
                        data-testid={`switch-${holiday.holidayId}`}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-md border p-4 bg-muted/30">
          <h3 className="font-medium mb-4">Add Custom Blocked Date</h3>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 space-y-2">
              <Label htmlFor="blocked-date">Date</Label>
              <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !selectedDate && "text-muted-foreground"
                    )}
                    data-testid="button-date-picker"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {selectedDate ? format(selectedDate, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => {
                      setSelectedDate(date);
                      setCalendarOpen(false);
                    }}
                    initialFocus
                    disabled={(date) => date < new Date()}
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="flex-1 space-y-2">
              <Label htmlFor="reason">Reason</Label>
              <Input
                id="reason"
                placeholder="e.g., Company Holiday"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                data-testid="input-reason"
              />
            </div>
            <div className="flex items-end">
              <Button
                onClick={handleAddDate}
                disabled={addDateMutation.isPending || !selectedDate || !reason.trim()}
                data-testid="button-add-date"
              >
                {addDateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Add Date
              </Button>
            </div>
          </div>
        </div>

        <div>
          <h3 className="font-medium mb-4">Upcoming Blocked Days (Next 90 Days)</h3>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : upcomingBlockedDays.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-8">
              No blocked days in the next 90 days
            </p>
          ) : (
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-2">
                {upcomingBlockedDays.map((day) => {
                  const isCustom = isCustomDate(day.date);
                  const customId = isCustom ? getCustomDateId(day.date) : undefined;
                  
                  return (
                    <div
                      key={day.date}
                      className="flex items-center justify-between p-3 rounded-md border bg-card"
                      data-testid={`blocked-day-${day.date}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex flex-col">
                          <span className="font-medium" data-testid={`text-date-${day.date}`}>
                            {format(parseISO(day.date), "EEEE, MMMM d, yyyy")}
                          </span>
                          <span className="text-sm text-muted-foreground" data-testid={`text-reason-${day.date}`}>
                            {day.reason}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {isCustom ? (
                          <>
                            <Badge variant="secondary" data-testid={`badge-custom-${day.date}`}>
                              Custom
                            </Badge>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => customId && deleteDateMutation.mutate(customId)}
                              disabled={deleteDateMutation.isPending}
                              data-testid={`button-delete-${day.date}`}
                            >
                              {deleteDateMutation.isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4 text-destructive" />
                              )}
                            </Button>
                          </>
                        ) : (
                          <Badge variant="outline" className="gap-1" data-testid={`badge-federal-${day.date}`}>
                            <Building2 className="h-3 w-3" />
                            Federal
                          </Badge>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </div>

        <div className="text-sm text-muted-foreground border-t pt-4">
          <p className="font-medium mb-2">How Holiday Blocking Works:</p>
          <ul className="list-disc list-inside space-y-1">
            <li><strong>ON</strong> = Outreach blocked on that day (no emails or calls sent)</li>
            <li><strong>OFF</strong> = Outreach allowed on that day (emails and calls proceed normally)</li>
            <li>Custom blocked dates are always enforced and cannot be toggled</li>
            <li>Changes take effect immediately for future scheduled emails</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
