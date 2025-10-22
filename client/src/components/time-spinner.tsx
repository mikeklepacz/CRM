import { useState, useEffect } from "react";
import { ChevronUp, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface TimeSpinnerProps {
  value: string; // "09:00" or "21:30"
  onChange: (value: string) => void;
  format?: '12hr' | '24hr';
  className?: string;
}

export function TimeSpinner({ value, onChange, format = '12hr', className }: TimeSpinnerProps) {
  const [hours, setHours] = useState(9);
  const [minutes, setMinutes] = useState(0);
  const [period, setPeriod] = useState<'AM' | 'PM'>('AM');

  // Parse incoming value (always in 24hr format: "09:00" or "21:30")
  useEffect(() => {
    const [h, m] = value.split(':').map(Number);
    setHours(h);
    setMinutes(m);
    setPeriod(h >= 12 ? 'PM' : 'AM');
  }, [value]);

  // Convert to 24hr format for output
  const updateTime = (newHours: number, newMinutes: number, newPeriod: 'AM' | 'PM') => {
    let hour24 = newHours;
    
    if (format === '12hr') {
      if (newPeriod === 'PM' && newHours !== 12) {
        hour24 = newHours + 12;
      } else if (newPeriod === 'AM' && newHours === 12) {
        hour24 = 0;
      }
    }
    
    const formattedTime = `${hour24.toString().padStart(2, '0')}:${newMinutes.toString().padStart(2, '0')}`;
    onChange(formattedTime);
  };

  const incrementHours = () => {
    const maxHours = format === '12hr' ? 12 : 23;
    const newHours = hours >= maxHours ? (format === '12hr' ? 1 : 0) : hours + 1;
    setHours(newHours);
    updateTime(newHours, minutes, period);
  };

  const decrementHours = () => {
    const maxHours = format === '12hr' ? 12 : 23;
    const newHours = hours <= (format === '12hr' ? 1 : 0) ? maxHours : hours - 1;
    setHours(newHours);
    updateTime(newHours, minutes, period);
  };

  const incrementMinutes = () => {
    const newMinutes = minutes >= 55 ? 0 : minutes + 5;
    setMinutes(newMinutes);
    updateTime(hours, newMinutes, period);
  };

  const decrementMinutes = () => {
    const newMinutes = minutes <= 0 ? 55 : minutes - 5;
    setMinutes(newMinutes);
    updateTime(hours, newMinutes, period);
  };

  const togglePeriod = () => {
    const newPeriod = period === 'AM' ? 'PM' : 'AM';
    setPeriod(newPeriod);
    updateTime(hours, minutes, newPeriod);
  };

  // Display hours in the chosen format
  const displayHours = format === '12hr' 
    ? (hours === 0 ? 12 : hours > 12 ? hours - 12 : hours)
    : hours;

  return (
    <div className={cn("flex items-center gap-2", className)} data-testid="time-spinner">
      {/* Hours */}
      <div className="flex flex-col items-center">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={incrementHours}
          data-testid="button-increment-hours"
        >
          <ChevronUp className="h-4 w-4" />
        </Button>
        <div className="flex items-center justify-center w-12 h-10 text-lg font-semibold border rounded-md" data-testid="text-hours">
          {displayHours.toString().padStart(2, '0')}
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={decrementHours}
          data-testid="button-decrement-hours"
        >
          <ChevronDown className="h-4 w-4" />
        </Button>
      </div>

      <span className="text-2xl font-bold">:</span>

      {/* Minutes */}
      <div className="flex flex-col items-center">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={incrementMinutes}
          data-testid="button-increment-minutes"
        >
          <ChevronUp className="h-4 w-4" />
        </Button>
        <div className="flex items-center justify-center w-12 h-10 text-lg font-semibold border rounded-md" data-testid="text-minutes">
          {minutes.toString().padStart(2, '0')}
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={decrementMinutes}
          data-testid="button-decrement-minutes"
        >
          <ChevronDown className="h-4 w-4" />
        </Button>
      </div>

      {/* AM/PM Toggle (only for 12hr format) */}
      {format === '12hr' && (
        <div className="flex flex-col items-center ml-2">
          <Button
            type="button"
            variant={period === 'AM' ? 'default' : 'outline'}
            size="sm"
            className="h-8 w-14 mb-1"
            onClick={() => period === 'PM' && togglePeriod()}
            data-testid="button-am"
          >
            AM
          </Button>
          <Button
            type="button"
            variant={period === 'PM' ? 'default' : 'outline'}
            size="sm"
            className="h-8 w-14"
            onClick={() => period === 'AM' && togglePeriod()}
            data-testid="button-pm"
          >
            PM
          </Button>
        </div>
      )}
    </div>
  );
}
