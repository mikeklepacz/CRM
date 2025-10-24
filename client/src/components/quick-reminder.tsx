import { useState, useEffect } from "react";
import { format } from "date-fns";
import { formatInTimeZone, getTimezoneOffset } from "date-fns-tz";
import { Calendar as CalendarIcon, MapPin, User, Mail, Phone, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { detectTimezoneFromAddress, formatTimezoneDisplay } from "@shared/timezoneUtils";
import { TimeSpinner } from "@/components/time-spinner";
import { useQuery } from "@tanstack/react-query";

interface QuickReminderProps {
  onSave: (data: {
    note: string;
    date: Date;
    time: string;
    useCustomerTimezone: boolean;
    customerTimezone: string | null;
    agentTimezone: string;
    calendarReminders: Array<{ method: string; minutes: number }>;
  }) => void;
  isSaving?: boolean;
  defaultNote?: string;
  defaultDate?: Date;
  storeAddress?: string | null;
  storeCity?: string | null;
  storeState?: string | null;
  userTimezone?: string | null;
  defaultTimezoneMode?: string | null;
  timeFormat?: string | null;
  pointOfContact?: string | null;
  pocEmail?: string | null;
  pocPhone?: string | null;
  defaultEmail?: string | null;
  defaultPhone?: string | null;
  defaultCalendarReminders?: Array<{ method: string; minutes: number }>;
}

export function QuickReminder({ 
  onSave, 
  isSaving, 
  defaultNote = "", 
  defaultDate,
  storeAddress,
  storeCity,
  storeState,
  userTimezone,
  defaultTimezoneMode = "agent",
  timeFormat = "12hr",
  pointOfContact,
  pocEmail,
  pocPhone,
  defaultEmail,
  defaultPhone,
  defaultCalendarReminders = [{ method: 'popup', minutes: 10 }]
}: QuickReminderProps) {
  const [note, setNote] = useState(defaultNote);
  const [date, setDate] = useState<Date | undefined>(defaultDate);
  const [time, setTime] = useState("09:00");
  const [useCustomerTimezone, setUseCustomerTimezone] = useState(defaultTimezoneMode === "customer");
  const [calendarReminders, setCalendarReminders] = useState(defaultCalendarReminders);
  
  // Auto-detect customer timezone from address
  const customerTimezone = detectTimezoneFromAddress(storeAddress, storeCity, storeState);
  const agentTimezone = userTimezone || Intl.DateTimeFormat().resolvedOptions().timeZone;

  // Fetch reminders for selected date
  const selectedDateStr = date ? format(date, 'yyyy-MM-dd') : null;
  const { data: dateReminders, isLoading: isLoadingReminders, error: remindersError, refetch: refetchReminders } = useQuery({
    queryKey: ['/api/reminders/by-date', selectedDateStr],
    queryFn: async () => {
      if (!selectedDateStr) return { reminders: [] };
      const response = await fetch(`/api/reminders/by-date/${selectedDateStr}`);
      if (!response.ok) throw new Error('Failed to fetch reminders');
      return response.json();
    },
    enabled: !!selectedDateStr,
  });

  // Update checkbox default when defaultTimezoneMode changes
  useEffect(() => {
    setUseCustomerTimezone(defaultTimezoneMode === "customer");
  }, [defaultTimezoneMode]);

  // Update calendar reminders when defaults change (async load from preferences)
  useEffect(() => {
    if (defaultCalendarReminders) {
      setCalendarReminders(defaultCalendarReminders);
    }
  }, [defaultCalendarReminders]);

  const handleSave = () => {
    if (!note.trim() || !date) return;
    
    // Calculate the actual time to send based on timezone selection
    let finalTime = time;
    let finalDate = date;
    
    if (useCustomerTimezone && customerTimezone) {
      // User picked time in customer's timezone, convert to agent's timezone
      const dateStr = format(date, 'yyyy-MM-dd');
      const [hours, minutes] = time.split(':').map(Number);
      
      // Create a date string in customer's timezone
      const customerDateTimeStr = `${dateStr}T${time}:00`;
      
      // Parse this as a date in the customer's timezone and get UTC timestamp
      const customerDate = new Date(customerDateTimeStr);
      const customerOffset = getTimezoneOffset(customerTimezone, customerDate);
      
      // Get UTC timestamp: take the naive date and subtract customer's offset
      const utcTimestamp = customerDate.getTime() - customerOffset;
      const utcDate = new Date(utcTimestamp);
      
      // Now convert this UTC time to agent's timezone
      const agentOffset = getTimezoneOffset(agentTimezone, utcDate);
      const agentTimestamp = utcTimestamp + agentOffset;
      const agentDate = new Date(agentTimestamp);
      
      // Extract the date and time in agent's timezone
      finalDate = agentDate;
      finalTime = formatInTimeZone(utcDate, agentTimezone, 'HH:mm');
    }
    
    onSave({ 
      note, 
      date: finalDate,
      time: finalTime,
      useCustomerTimezone: false,
      customerTimezone,
      agentTimezone,
      calendarReminders
    });
  };

  // Get friendly timezone name for display
  const getFriendlyTimezoneName = (timezone: string): string => {
    const parts = timezone.split('/');
    if (parts.length >= 2) {
      return parts[parts.length - 1].replace(/_/g, ' ');
    }
    return timezone;
  };

  // Calculate time conversion preview
  const getTimeConversionPreview = () => {
    if (!date || !useCustomerTimezone || !customerTimezone) return null;
    
    try {
      const dateStr = format(date, 'yyyy-MM-dd');
      const customerDateTimeStr = `${dateStr}T${time}:00`;
      
      const customerDate = new Date(customerDateTimeStr);
      const customerOffset = getTimezoneOffset(customerTimezone, customerDate);
      
      const utcTimestamp = customerDate.getTime() - customerOffset;
      const utcDate = new Date(utcTimestamp);
      
      const agentTime = formatInTimeZone(
        utcDate,
        agentTimezone,
        timeFormat === '24hr' ? 'HH:mm' : 'h:mm a'
      );
      
      const customerTzName = getFriendlyTimezoneName(customerTimezone);
      const agentTzName = getFriendlyTimezoneName(agentTimezone);
      
      const customerTimeFormatted = timeFormat === '24hr' ? time : 
        formatInTimeZone(utcDate, customerTimezone, 'h:mm a');
      
      return `${customerTimeFormatted} ${customerTzName} = ${agentTime} ${agentTzName}`;
    } catch (error) {
      console.error('Error calculating timezone preview:', error);
      return null;
    }
  };

  const timePreview = getTimeConversionPreview();

  // Determine which contact info to display
  const displayEmail = pocEmail || defaultEmail;
  const displayPhone = pocPhone || defaultPhone;
  const hasContactInfo = pointOfContact || displayEmail || displayPhone;

  // Format time for display
  const formatReminderTime = (time: string) => {
    if (!time) return '';
    if (timeFormat === '24hr') return time;
    const [hours, minutes] = time.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
  };

  return (
    <div className="space-y-4" data-testid="quick-reminder-form">
      {hasContactInfo && (
        <div className="p-3 rounded-md bg-muted/50 space-y-2" data-testid="contact-info-display">
          <div className="font-medium text-sm text-foreground">Contact Information</div>
          <div className="space-y-1.5 text-sm">
            {pointOfContact && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <User className="h-3.5 w-3.5 shrink-0" />
                <span>{pointOfContact}</span>
              </div>
            )}
            {displayEmail && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Mail className="h-3.5 w-3.5 shrink-0" />
                <a 
                  href={`mailto:${displayEmail}`}
                  className="hover:text-foreground hover:underline"
                  data-testid="link-contact-email"
                >
                  {displayEmail}
                </a>
                {!pocEmail && defaultEmail && (
                  <span className="text-xs opacity-70">(default)</span>
                )}
              </div>
            )}
            {displayPhone && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Phone className="h-3.5 w-3.5 shrink-0" />
                <a 
                  href={`tel:${displayPhone}`}
                  className="hover:text-foreground hover:underline"
                  data-testid="link-contact-phone"
                >
                  {displayPhone}
                </a>
                {!pocPhone && defaultPhone && (
                  <span className="text-xs opacity-70">(default)</span>
                )}
              </div>
            )}
          </div>
        </div>
      )}
      
      {customerTimezone && (
        <div className="flex items-center gap-2 p-2 rounded-md bg-muted text-muted-foreground text-sm" data-testid="timezone-indicator">
          <MapPin className="h-4 w-4" />
          <span>Client timezone: {formatTimezoneDisplay(customerTimezone)}</span>
        </div>
      )}
      
      <div className="space-y-2">
        <Label htmlFor="reminder-note">Note / Next Action</Label>
        <Textarea
          id="reminder-note"
          data-testid="input-reminder-note"
          placeholder="e.g., Follow up on sample shipment, Call to discuss pricing..."
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="min-h-[80px]"
        />
      </div>

      {/* New two-column layout */}
      <div className="grid grid-cols-2 gap-4">
        {/* Left column: Date, Time, Calendar Reminders */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-start text-left font-normal"
                  data-testid="button-select-date"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, "MMMM do, yyyy") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  initialFocus
                  disabled={(date) => {
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    return date < today;
                  }}
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label>Time</Label>
            <TimeSpinner
              value={time}
              onChange={setTime}
              format={timeFormat === '24hr' ? '24hr' : '12hr'}
            />
          </div>

          <div className="space-y-3 pt-2 border-t">
            <Label className="text-sm font-medium">Calendar Reminders</Label>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Reminder Times</Label>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { value: 0, label: 'At event time' },
                  { value: 5, label: '5 mins before' },
                  { value: 10, label: '10 mins before' },
                  { value: 15, label: '15 mins before' },
                  { value: 30, label: '30 mins before' },
                  { value: 60, label: '1 hour before' },
                ].map(({ value, label }) => {
                  const isChecked = calendarReminders.some(r => r.minutes === value);
                  return (
                    <div key={value} className="flex items-center space-x-2">
                      <Checkbox
                        id={`quick-reminder-time-${value}`}
                        checked={isChecked}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            const methods = Array.from(new Set(calendarReminders.map(r => r.method))) as ('popup' | 'email')[];
                            const newReminders = [...calendarReminders];
                            methods.forEach(method => {
                              if (!newReminders.some(r => r.minutes === value && r.method === method)) {
                                newReminders.push({ method, minutes: value });
                              }
                            });
                            setCalendarReminders(newReminders);
                          } else {
                            setCalendarReminders(calendarReminders.filter(r => r.minutes !== value));
                          }
                        }}
                        data-testid={`checkbox-quick-reminder-time-${value}`}
                      />
                      <Label 
                        htmlFor={`quick-reminder-time-${value}`}
                        className="text-xs font-normal cursor-pointer"
                      >
                        {label}
                      </Label>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Right column: Customer timezone, Reminder Type, Day view */}
        <div className="space-y-4">
          {customerTimezone && (
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="use-customer-timezone"
                  checked={useCustomerTimezone}
                  onCheckedChange={(checked) => setUseCustomerTimezone(!!checked)}
                  data-testid="checkbox-customer-timezone"
                />
                <Label
                  htmlFor="use-customer-timezone"
                  className="text-sm font-normal cursor-pointer"
                >
                  Use customer timezone ({formatTimezoneDisplay(customerTimezone)})
                </Label>
              </div>
              {timePreview && useCustomerTimezone && (
                <p className="text-sm text-muted-foreground" data-testid="timezone-preview">
                  {timePreview}
                </p>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label className="text-sm font-medium">Reminder Type</Label>
            <div className="flex gap-4">
              {(['popup', 'email'] as const).map((method) => {
                const isChecked = calendarReminders.some(r => r.method === method);
                return (
                  <div key={method} className="flex items-center space-x-2">
                    <Checkbox
                      id={`quick-reminder-method-${method}`}
                      checked={isChecked}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          const times = Array.from(new Set(calendarReminders.map(r => r.minutes)));
                          const newReminders = [...calendarReminders];
                          times.forEach(minutes => {
                            if (!newReminders.some(r => r.minutes === minutes && r.method === method)) {
                              newReminders.push({ method, minutes });
                            }
                          });
                          setCalendarReminders(newReminders);
                        } else {
                          setCalendarReminders(calendarReminders.filter(r => r.method !== method));
                        }
                      }}
                      data-testid={`checkbox-quick-reminder-${method}`}
                    />
                    <Label 
                      htmlFor={`quick-reminder-method-${method}`}
                      className="text-sm font-normal cursor-pointer"
                    >
                      {method === 'popup' ? 'Popup' : 'Email'}
                    </Label>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Day view panel */}
          <div className="flex-1 p-4 rounded-md bg-primary/10 border border-primary/20 min-h-[180px]" data-testid="day-view-panel">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-primary">
                <Clock className="h-4 w-4" />
                <span>
                  {date ? `Reminders for ${format(date, "MMMM do")}` : 'Select a date'}
                </span>
              </div>
              {date && (
                <div className="space-y-1.5 mt-3">
                  {isLoadingReminders ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="text-sm text-muted-foreground">Loading reminders...</div>
                    </div>
                  ) : remindersError ? (
                    <div className="text-center py-4">
                      <p className="text-sm text-destructive mb-2">Failed to load reminders</p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => refetchReminders()}
                        data-testid="button-retry-reminders"
                      >
                        Retry
                      </Button>
                    </div>
                  ) : dateReminders?.reminders && dateReminders.reminders.length > 0 ? (
                    dateReminders.reminders.map((reminder: any) => (
                      <div 
                        key={reminder.id} 
                        className="flex items-start gap-2 text-sm p-2 rounded bg-background/50"
                        data-testid={`reminder-item-${reminder.id}`}
                      >
                        <Clock className="h-3.5 w-3.5 mt-0.5 shrink-0 text-muted-foreground" />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-foreground">
                            {formatReminderTime(reminder.scheduledTime)}
                          </div>
                          <div className="text-xs text-muted-foreground truncate">
                            {reminder.title}
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No reminders scheduled
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {!customerTimezone && (
        <p className="text-sm text-muted-foreground">
          Customer timezone could not be detected. Reminder will use your timezone ({formatTimezoneDisplay(agentTimezone)})
        </p>
      )}

      <Button
        onClick={handleSave}
        disabled={!note.trim() || !date || isSaving}
        className="w-full"
        data-testid="button-save-reminder"
      >
        {isSaving ? "Saving..." : "Save Reminder"}
      </Button>
    </div>
  );
}
