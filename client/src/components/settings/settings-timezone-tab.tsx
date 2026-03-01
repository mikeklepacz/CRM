import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { TimezoneAutocomplete } from '@/components/timezone-autocomplete';
import { CALENDAR_REMINDER_OPTIONS } from '@/components/settings/settings-constants';

type Props = {
  calendarReminderMethods: ('popup' | 'email')[];
  calendarReminderTimes: number[];
  defaultTimezoneMode: string;
  onSaveTimezone: () => void;
  setCalendarReminderMethods: React.Dispatch<React.SetStateAction<('popup' | 'email')[]>>;
  setCalendarReminderTimes: React.Dispatch<React.SetStateAction<number[]>>;
  setDefaultTimezoneMode: (value: string) => void;
  setTimeFormat: (value: string) => void;
  setTimezone: (value: string) => void;
  timeFormat: string;
  timezone: string;
  timezonePending: boolean;
};

export function SettingsTimezoneTab(props: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Timezone Settings</CardTitle>
        <CardDescription>Configure your timezone and default reminder settings</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label>Your Timezone</Label>
          <TimezoneAutocomplete value={props.timezone} onChange={props.setTimezone} placeholder="Select your timezone..." />
          <p className="text-sm text-muted-foreground">This will be used to display times correctly and schedule reminders</p>
        </div>

        <div className="space-y-2">
          <Label>Default Reminder Mode</Label>
          <p className="text-sm text-muted-foreground mb-3">Choose whether new reminders should default to your timezone or the customer's timezone</p>
          <RadioGroup value={props.defaultTimezoneMode} onValueChange={props.setDefaultTimezoneMode}>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="agent" id="agent" data-testid="radio-agent-timezone" />
              <Label htmlFor="agent" className="font-normal cursor-pointer">My timezone - Schedule reminders in my own timezone</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="customer" id="customer" data-testid="radio-customer-timezone" />
              <Label htmlFor="customer" className="font-normal cursor-pointer">Customer timezone - Auto-detect and use customer's timezone when available</Label>
            </div>
          </RadioGroup>
        </div>

        <div className="space-y-2">
          <Label>Time Display Format</Label>
          <p className="text-sm text-muted-foreground mb-3">Choose how you want times displayed throughout the app</p>
          <RadioGroup value={props.timeFormat} onValueChange={props.setTimeFormat}>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="12hr" id="12hr" data-testid="radio-12hr-format" />
              <Label htmlFor="12hr" className="font-normal cursor-pointer">12-hour format (9:00 AM, 3:30 PM)</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="24hr" id="24hr" data-testid="radio-24hr-format" />
              <Label htmlFor="24hr" className="font-normal cursor-pointer">24-hour format (09:00, 15:30)</Label>
            </div>
          </RadioGroup>
        </div>

        <div className="space-y-3 pt-2">
          <Label>Google Calendar Reminder Defaults</Label>
          <p className="text-sm text-muted-foreground">When reminders are synced to Google Calendar, these alert times will be used by default</p>

          <div className="space-y-2">
            <Label className="text-sm font-medium">Reminder Times</Label>
            <div className="grid grid-cols-2 gap-2">
              {CALENDAR_REMINDER_OPTIONS.map(({ value, label }) => (
                <div key={value} className="flex items-center space-x-2">
                  <Checkbox
                    id={`reminder-time-${value}`}
                    checked={props.calendarReminderTimes.includes(value)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        props.setCalendarReminderTimes([...props.calendarReminderTimes, value]);
                      } else {
                        props.setCalendarReminderTimes(props.calendarReminderTimes.filter((t) => t !== value));
                      }
                    }}
                    data-testid={`checkbox-reminder-time-${value}`}
                  />
                  <Label htmlFor={`reminder-time-${value}`} className="text-sm font-normal cursor-pointer">{label}</Label>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">Reminder Type</Label>
            <div className="flex gap-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="reminder-method-popup"
                  checked={props.calendarReminderMethods.includes('popup')}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      props.setCalendarReminderMethods([...props.calendarReminderMethods, 'popup']);
                    } else {
                      props.setCalendarReminderMethods(props.calendarReminderMethods.filter((m) => m !== 'popup'));
                    }
                  }}
                  data-testid="checkbox-reminder-popup"
                />
                <Label htmlFor="reminder-method-popup" className="text-sm font-normal cursor-pointer">Popup notification</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="reminder-method-email"
                  checked={props.calendarReminderMethods.includes('email')}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      props.setCalendarReminderMethods([...props.calendarReminderMethods, 'email']);
                    } else {
                      props.setCalendarReminderMethods(props.calendarReminderMethods.filter((m) => m !== 'email'));
                    }
                  }}
                  data-testid="checkbox-reminder-email"
                />
                <Label htmlFor="reminder-method-email" className="text-sm font-normal cursor-pointer">Email reminder</Label>
              </div>
            </div>
          </div>
        </div>

        <Button onClick={props.onSaveTimezone} disabled={props.timezonePending || !props.timezone} data-testid="button-save-timezone">
          {props.timezonePending ? 'Saving...' : 'Save Timezone Settings'}
        </Button>
      </CardContent>
    </Card>
  );
}
