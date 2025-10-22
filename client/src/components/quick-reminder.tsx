import { useState, useEffect } from "react";
import { format } from "date-fns";
import { formatInTimeZone, getTimezoneOffset } from "date-fns-tz";
import { Calendar as CalendarIcon, MapPin, User, Mail, Phone } from "lucide-react";
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

interface QuickReminderProps {
  onSave: (data: {
    note: string;
    date: Date;
    time: string;
    useCustomerTimezone: boolean;
    customerTimezone: string | null;
    agentTimezone: string;
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
  defaultPhone
}: QuickReminderProps) {
  const [note, setNote] = useState(defaultNote);
  const [date, setDate] = useState<Date | undefined>(defaultDate);
  const [time, setTime] = useState("09:00");
  const [useCustomerTimezone, setUseCustomerTimezone] = useState(defaultTimezoneMode === "customer");
  
  // Auto-detect customer timezone from address
  const customerTimezone = detectTimezoneFromAddress(storeAddress, storeCity, storeState);
  const agentTimezone = userTimezone || Intl.DateTimeFormat().resolvedOptions().timeZone;

  // Debug logging
  useEffect(() => {
    console.log('[QuickReminder] Props received:', {
      defaultTimezoneMode,
      useCustomerTimezone,
      customerTimezone,
      agentTimezone
    });
  }, [defaultTimezoneMode, useCustomerTimezone, customerTimezone, agentTimezone]);

  // Update checkbox default when defaultTimezoneMode changes
  useEffect(() => {
    console.log('[QuickReminder] Setting useCustomerTimezone based on defaultTimezoneMode:', defaultTimezoneMode, '->', defaultTimezoneMode === "customer");
    setUseCustomerTimezone(defaultTimezoneMode === "customer");
  }, [defaultTimezoneMode]);

  const handleSave = () => {
    if (!note.trim() || !date) return;
    onSave({ 
      note, 
      date, 
      time, 
      useCustomerTimezone: useCustomerTimezone && !!customerTimezone,
      customerTimezone,
      agentTimezone 
    });
  };


  // Calculate time conversion preview
  const getTimeConversionPreview = () => {
    if (!date || !useCustomerTimezone || !customerTimezone) return null;
    
    try {
      // Create naive datetime string (wall-clock time in customer's timezone)
      const dateStr = format(date, 'yyyy-MM-dd');
      const naiveDateTimeStr = `${dateStr}T${time}:00`;
      
      // Parse as Date and adjust for timezone offset
      const naiveDate = new Date(naiveDateTimeStr);
      const offset = getTimezoneOffset(customerTimezone, naiveDate);
      const utcTime = new Date(naiveDate.getTime() - offset);
      
      // Format in both timezones for preview
      const customerTime = formatInTimeZone(
        utcTime,
        customerTimezone,
        'h:mm a zzz'
      );
      
      const agentTime = formatInTimeZone(
        utcTime,
        agentTimezone,
        'h:mm a zzz'
      );
      
      return `${customerTime} = ${agentTime}`;
    } catch (error) {
      return null;
    }
  };

  const timePreview = getTimeConversionPreview();

  // Determine which contact info to display
  const displayEmail = pocEmail || defaultEmail;
  const displayPhone = pocPhone || defaultPhone;
  const hasContactInfo = pointOfContact || displayEmail || displayPhone;

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

      <div className="grid grid-cols-2 gap-4">
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
                {date ? format(date, "PPP") : "Pick a date"}
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
      </div>

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
            <p className="text-sm text-muted-foreground ml-6" data-testid="timezone-preview">
              {timePreview}
            </p>
          )}
        </div>
      )}

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
