import type { Dispatch, SetStateAction } from "react";
import { format, parseISO } from "date-fns";
import { CalendarOff, ChevronDown } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { EhubSettings } from "@/components/ehub/ehub.types";

type UpcomingBlockedDay = {
  date: string;
  reason: string;
};

type EhubSettingsClientTimeHolidaySectionProps = {
  setSettingsForm: Dispatch<SetStateAction<EhubSettings>>;
  settingsForm: EhubSettings;
  upcomingBlockedDays?: UpcomingBlockedDay[];
};

export function EhubSettingsClientTimeHolidaySection({
  setSettingsForm,
  settingsForm,
  upcomingBlockedDays,
}: EhubSettingsClientTimeHolidaySectionProps) {
  return (
    <>
      <div className="space-y-3">
        <h3 className="font-semibold">Client Time Range</h3>
        <p className="text-sm text-muted-foreground">
          When emails are delivered in recipient's local timezone
        </p>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="clientStartOffset" className="text-xs">Start Offset After Opening (hours)</Label>
            <Input
              id="clientStartOffset"
              data-testid="input-settings-client-start-offset"
              type="number"
              step="0.25"
              value={settingsForm.clientWindowStartOffset}
              onChange={(e) => {
                const val = e.target.value;
                if (val === "" || val === ".") {
                  setSettingsForm({ ...settingsForm, clientWindowStartOffset: val as any });
                  return;
                }
                const newOffset = parseFloat(val);
                if (isNaN(newOffset)) return;

                setSettingsForm({
                  ...settingsForm,
                  clientWindowStartOffset: newOffset,
                });
              }}
              onBlur={() => {
                if ((settingsForm.clientWindowStartOffset as any) === "" || (settingsForm.clientWindowStartOffset as any) === "." || settingsForm.clientWindowStartOffset === (null as any)) {
                  setSettingsForm({ ...settingsForm, clientWindowStartOffset: 1.0 });
                } else {
                  const val = typeof settingsForm.clientWindowStartOffset === "string"
                    ? parseFloat(settingsForm.clientWindowStartOffset)
                    : settingsForm.clientWindowStartOffset;
                  if (val < 0) {
                    setSettingsForm({ ...settingsForm, clientWindowStartOffset: 0 });
                  } else if (val > 24) {
                    setSettingsForm({ ...settingsForm, clientWindowStartOffset: 24 });
                  }
                }
              }}
              min={0}
              max={24}
            />
            <p className="text-xs text-muted-foreground mt-1">
              e.g., 1.0 = 1 hour after opening
            </p>
          </div>
          <div>
            <Label htmlFor="clientEndHour" className="text-xs">Cutoff Hour (24h local time)</Label>
            <Input
              id="clientEndHour"
              data-testid="input-settings-client-end-hour"
              type="number"
              value={settingsForm.clientWindowEndHour}
              onChange={(e) => {
                const val = e.target.value;
                if (val === "") {
                  setSettingsForm({ ...settingsForm, clientWindowEndHour: "" as any });
                  return;
                }
                const newCutoff = parseInt(val, 10);
                if (isNaN(newCutoff)) return;

                setSettingsForm({
                  ...settingsForm,
                  clientWindowEndHour: newCutoff,
                });
              }}
              onBlur={() => {
                if ((settingsForm.clientWindowEndHour as any) === "" || settingsForm.clientWindowEndHour === (null as any)) {
                  setSettingsForm({ ...settingsForm, clientWindowEndHour: 14 });
                } else if (settingsForm.clientWindowEndHour < 0) {
                  setSettingsForm({ ...settingsForm, clientWindowEndHour: 0 });
                } else if (settingsForm.clientWindowEndHour > 23) {
                  setSettingsForm({ ...settingsForm, clientWindowEndHour: 23 });
                }
              }}
              min={0}
              max={23}
            />
            <p className="text-xs text-muted-foreground mt-1">
              e.g., 16 = 4 PM local time
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Collapsible>
          <CollapsibleTrigger
            className="flex items-center gap-2 text-sm font-medium"
            data-testid="holiday-blackout-trigger"
          >
            <CalendarOff className="w-4 h-4" />
            Holiday Blackout Dates
            <ChevronDown className="w-4 h-4" />
          </CollapsibleTrigger>
          <CollapsibleContent data-testid="holiday-blackout-content">
            <div className="mt-2 p-3 rounded-md bg-muted/50 border">
              <p className="text-xs text-muted-foreground mb-2">
                Emails and calls are automatically paused on these dates:
              </p>
              <div className="space-y-1">
                {upcomingBlockedDays?.slice(0, 7).map((day, index) => (
                  <div
                    key={day.date}
                    className="text-sm flex items-center gap-2"
                    data-testid={`holiday-date-${index}`}
                  >
                    <span className="font-medium">{format(parseISO(day.date), "MMM d")}</span>
                    <span className="text-muted-foreground">-</span>
                    <span>{day.reason}</span>
                  </div>
                ))}
                {(!upcomingBlockedDays || upcomingBlockedDays.length === 0) && (
                  <p className="text-sm text-muted-foreground">No upcoming blackout dates</p>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Manage holidays in Admin Settings → Calendar
              </p>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>
    </>
  );
}
