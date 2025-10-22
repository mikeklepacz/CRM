import { useState } from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

interface QuickReminderProps {
  onSave: (data: {
    note: string;
    date: Date;
    time: string;
  }) => void;
  isSaving?: boolean;
  defaultNote?: string;
  defaultDate?: Date;
}

export function QuickReminder({ onSave, isSaving, defaultNote = "", defaultDate }: QuickReminderProps) {
  const [note, setNote] = useState(defaultNote);
  const [date, setDate] = useState<Date | undefined>(defaultDate);
  const [time, setTime] = useState("09:00");

  const handleSave = () => {
    if (!note.trim() || !date) return;
    onSave({ note, date, time });
  };

  const timeOptions = [];
  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      const h = hour.toString().padStart(2, '0');
      const m = minute.toString().padStart(2, '0');
      timeOptions.push(`${h}:${m}`);
    }
  }

  return (
    <div className="space-y-4" data-testid="quick-reminder-form">
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
              />
            </PopoverContent>
          </Popover>
        </div>

        <div className="space-y-2">
          <Label>Time</Label>
          <Select value={time} onValueChange={setTime}>
            <SelectTrigger data-testid="select-time">
              <Clock className="mr-2 h-4 w-4" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {timeOptions.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

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
