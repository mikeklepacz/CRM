import { ToggleLeft } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import type { HolidayToggle } from "./types";

interface HolidayToggleSectionsProps {
  extendedWindows: HolidayToggle[];
  federalHolidays: HolidayToggle[];
  onToggle: (holiday: HolidayToggle) => void;
  pending: boolean;
}

function ToggleList({ holidays, onToggle, pending }: { holidays: HolidayToggle[]; onToggle: (holiday: HolidayToggle) => void; pending: boolean }) {
  return (
    <div className="grid gap-2">
      {holidays.map((holiday) => (
        <div
          key={holiday.holidayId}
          className="flex items-center justify-between p-2 rounded-md border bg-card"
          data-testid={`toggle-row-${holiday.holidayId}`}
        >
          <span className="text-sm">{holiday.name}</span>
          <div className="flex items-center gap-2">
            <span className={cn("text-xs", holiday.isIgnored ? "text-muted-foreground" : "text-green-600 dark:text-green-400")}>
              {holiday.isIgnored ? "OFF" : "ON"}
            </span>
            <Switch
              checked={!holiday.isIgnored}
              onCheckedChange={() => onToggle(holiday)}
              disabled={pending}
              data-testid={`switch-${holiday.holidayId}`}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export function HolidayToggleSections({ extendedWindows, federalHolidays, onToggle, pending }: HolidayToggleSectionsProps) {
  return (
    <div className="rounded-md border p-4 bg-muted/30">
      <div className="flex items-center gap-2 mb-4">
        <ToggleLeft className="h-5 w-5" />
        <h3 className="font-medium">Holiday Blocking Controls</h3>
      </div>
      <p className="text-sm text-muted-foreground mb-4">
        Turn holidays ON to block outreach on those days, or OFF to allow emails/calls. This is useful for retail
        businesses that operate on "bank holidays."
      </p>

      <div className="space-y-4">
        <div>
          <h4 className="text-sm font-medium mb-3">Federal Holidays</h4>
          <ToggleList holidays={federalHolidays} onToggle={onToggle} pending={pending} />
        </div>
        <div>
          <h4 className="text-sm font-medium mb-3">Extended Holiday Windows</h4>
          <ToggleList holidays={extendedWindows} onToggle={onToggle} pending={pending} />
        </div>
      </div>
    </div>
  );
}
