import { useState, useEffect } from "react";
import { format } from "date-fns";
import { formatInTimeZone, getTimezoneOffset, fromZonedTime } from "date-fns-tz";
import { Calendar as CalendarIcon, MapPin, User, Mail, Phone, Clock, Loader2 } from "lucide-react";
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
    date: string;
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

  // Calculate the converted date if using customer timezone
  const getConvertedDate = () => {
    if (!date || !time || !useCustomerTimezone || !customerTimezone) return null;
    
    try {
      const dateStr = format(date, 'yyyy-MM-dd');
      const customerDateTimeStr = `${dateStr}T${time}:00`;
      const utcDate = fromZonedTime(customerDateTimeStr, customerTimezone);
      const agentDateStr = formatInTimeZone(utcDate, agentTimezone, 'yyyy-MM-dd');
      return agentDateStr;
    } catch (error) {
      return null;
    }
  };

  const convertedDateStr = getConvertedDate();
  
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

  // Fetch reminders for converted date when using customer timezone
  const { data: convertedDateReminders, isLoading: isLoadingConvertedReminders } = useQuery({
    queryKey: ['/api/reminders/by-date', convertedDateStr],
    queryFn: async () => {
      if (!convertedDateStr) return { reminders: [] };
      const response = await fetch(`/api/reminders/by-date/${convertedDateStr}`);
      if (!response.ok) throw new Error('Failed to fetch reminders');
      return response.json();
    },
    enabled: !!convertedDateStr && convertedDateStr !== selectedDateStr,
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
  }, [JSON.stringify(defaultCalendarReminders)]);

  const handleSave = () => {
    if (!note.trim() || !date) return;
    
    // Calculate the actual time to send based on timezone selection
    let finalTime = time;
    let finalDateStr: string;
    
    if (useCustomerTimezone && customerTimezone) {
      // User picked time in customer's timezone, convert to agent's timezone
      const dateStr = format(date, 'yyyy-MM-dd');
      
      // Create a date string in customer's timezone
      const customerDateTimeStr = `${dateStr}T${time}:00`;
      
      // Properly convert the customer's local time to UTC
      const utcDate = fromZonedTime(customerDateTimeStr, customerTimezone);
      
      // Convert UTC to agent's timezone and extract time
      finalTime = formatInTimeZone(utcDate, agentTimezone, 'HH:mm');
      
      // Get the date in agent's timezone as a plain string (prevents UTC conversion)
      finalDateStr = formatInTimeZone(utcDate, agentTimezone, 'yyyy-MM-dd');
    } else {
      // Not using customer timezone - extract local date components to prevent UTC drift
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      finalDateStr = `${year}-${month}-${day}`;
      finalTime = time;
    }
    
    onSave({ 
      note, 
      date: finalDateStr,
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
      
      // Properly convert the customer's local time to UTC
      const utcDate = fromZonedTime(customerDateTimeStr, customerTimezone);
      
      // Convert UTC to agent's timezone
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

  // Check for time conflicts - need to account for timezone conversion and date changes
  const getConflictCheckResult = () => {
    if (!date || !time) return { hasConflict: false, isLoading: false };
    
    // Calculate the actual date and time that will be saved (accounting for timezone conversion)
    let finalTime = time;
    let agentDateStr = format(date, 'yyyy-MM-dd');
    
    if (useCustomerTimezone && customerTimezone) {
      try {
        // User picked time in customer's timezone, convert to agent's timezone
        const dateStr = format(date, 'yyyy-MM-dd');
        const customerDateTimeStr = `${dateStr}T${time}:00`;
        
        // Convert customer's local time to UTC
        const utcDate = fromZonedTime(customerDateTimeStr, customerTimezone);
        
        // Convert UTC to agent's timezone and extract both time and date
        finalTime = formatInTimeZone(utcDate, agentTimezone, 'HH:mm');
        agentDateStr = formatInTimeZone(utcDate, agentTimezone, 'yyyy-MM-dd');
      } catch (error) {
        console.error('Error converting timezone for conflict check:', error);
        // If conversion fails, use original time/date as fallback
      }
    }
    
    // Determine which set of reminders to check
    let remindersToCheck = dateReminders;
    
    // If timezone conversion caused a date change, use the converted date's reminders
    const selectedDateStr = format(date, 'yyyy-MM-dd');
    if (agentDateStr !== selectedDateStr) {
      // If the converted date reminders are still loading, we can't complete the check yet
      if (isLoadingConvertedReminders) {
        return { hasConflict: false, isLoading: true };
      }
      remindersToCheck = convertedDateReminders;
    } else {
      // Same day - check if the base reminders are still loading
      if (isLoadingReminders) {
        return { hasConflict: false, isLoading: true };
      }
    }
    
    if (!remindersToCheck?.reminders) {
      return { hasConflict: false, isLoading: false };
    }
    
    // Get the final time in minutes for comparison
    const [hours, minutes] = finalTime.split(':').map(Number);
    const selectedTimeInMinutes = hours * 60 + minutes;
    
    // Check if any existing reminder has the same time
    const hasConflict = remindersToCheck.reminders.some((reminder: any) => {
      const [reminderHours, reminderMinutes] = reminder.scheduledTime.split(':').map(Number);
      const reminderTimeInMinutes = reminderHours * 60 + reminderMinutes;
      return reminderTimeInMinutes === selectedTimeInMinutes;
    });
    
    return { hasConflict, isLoading: false };
  };

  const { hasConflict: timeConflict, isLoading: isCheckingConflict } = getConflictCheckResult();

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
                            let methods = Array.from(new Set(calendarReminders.map(r => r.method))) as ('popup' | 'email')[];
                            // If no methods exist, default to 'popup'
                            if (methods.length === 0) {
                              methods = ['popup'];
                            }
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
                          let times = Array.from(new Set(calendarReminders.map(r => r.minutes)));
                          // If no times exist, default to 10 minutes before
                          if (times.length === 0) {
                            times = [10];
                          }
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
          <div className="p-4 rounded-md bg-primary/10 border border-primary/20 max-h-[240px] overflow-y-auto" data-testid="day-view-panel">
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

      {timeConflict && (
        <div className="p-3 rounded-md bg-destructive/10 border border-destructive/20" data-testid="conflict-warning">
          <p className="text-sm text-destructive font-medium">
            Scheduling conflict
          </p>
          <p className="text-xs text-destructive/80 mt-1">
            You already have a reminder at {formatReminderTime(time)} on this date
          </p>
        </div>
      )}

      <Button
        onClick={handleSave}
        disabled={!note.trim() || !date || isSaving || timeConflict || isCheckingConflict}
        className="w-full"
        data-testid="button-save-reminder"
      >
        {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {isSaving ? "Saving..." : isCheckingConflict ? "Checking..." : "Save Reminder"}
      </Button>
    </div>
  );
}
