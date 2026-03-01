import { format } from "date-fns";
import { CalendarIcon, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface AddCustomDateSectionProps {
  calendarOpen: boolean;
  pending: boolean;
  reason: string;
  selectedDate: Date | undefined;
  setCalendarOpen: (open: boolean) => void;
  setReason: (value: string) => void;
  setSelectedDate: (value: Date | undefined) => void;
  onAddDate: () => void;
}

export function AddCustomDateSection({
  calendarOpen,
  pending,
  reason,
  selectedDate,
  setCalendarOpen,
  setReason,
  setSelectedDate,
  onAddDate,
}: AddCustomDateSectionProps) {
  return (
    <div className="rounded-md border p-4 bg-muted/30">
      <h3 className="font-medium mb-4">Add Custom Blocked Date</h3>
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 space-y-2">
          <Label htmlFor="blocked-date">Date</Label>
          <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn("w-full justify-start text-left font-normal", !selectedDate && "text-muted-foreground")}
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
          <Button onClick={onAddDate} disabled={pending || !selectedDate || !reason.trim()} data-testid="button-add-date">
            {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Add Date
          </Button>
        </div>
      </div>
    </div>
  );
}
