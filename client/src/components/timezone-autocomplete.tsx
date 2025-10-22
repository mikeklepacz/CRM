import { useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { TIMEZONE_DATA, formatTimezoneDisplay } from "@shared/timezoneUtils";

interface TimezoneAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function TimezoneAutocomplete({ value, onChange, placeholder = "Select timezone..." }: TimezoneAutocompleteProps) {
  const [open, setOpen] = useState(false);

  const selectedTimezone = TIMEZONE_DATA.find((tz) => tz.value === value);

  const handleSelect = (currentValue: string) => {
    onChange(currentValue);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
          data-testid="timezone-autocomplete"
        >
          {value ? formatTimezoneDisplay(value) : placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command>
          <CommandInput placeholder="Search timezone, city, or country..." />
          <CommandList>
            <CommandEmpty>No timezone found.</CommandEmpty>
            <CommandGroup>
              {TIMEZONE_DATA.map((tz) => {
                const searchableText = [
                  tz.label,
                  tz.country,
                  tz.value,
                  ...tz.searchTerms
                ].join(' ').toLowerCase();

                return (
                  <CommandItem
                    key={tz.value}
                    value={searchableText}
                    onSelect={() => handleSelect(tz.value)}
                    data-testid={`timezone-option-${tz.value}`}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === tz.value ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <div className="flex flex-col">
                      <span>{formatTimezoneDisplay(tz.value)}</span>
                      <span className="text-xs text-muted-foreground">
                        {tz.country}
                      </span>
                    </div>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
