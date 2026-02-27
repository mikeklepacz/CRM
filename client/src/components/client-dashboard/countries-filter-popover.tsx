import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Settings2 } from "lucide-react";

type CountriesFilterPopoverProps = {
  allCountries: string[];
  countryCounts: Record<string, number>;
  onClearAllCountries: () => void;
  onSelectAllCountries: () => void;
  onToggleCountry: (country: string) => void;
  selectedCountries: Set<string>;
};

export function CountriesFilterPopover({
  allCountries,
  countryCounts,
  onClearAllCountries,
  onSelectAllCountries,
  onToggleCountry,
  selectedCountries,
}: CountriesFilterPopoverProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" data-testid="button-countries-filter">
          <Settings2 className="mr-2 h-4 w-4" />
          Countries ({selectedCountries.size}/{allCountries.length})
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium">Filter by Country</h4>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={onSelectAllCountries}
                data-testid="button-select-all-countries"
              >
                All
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClearAllCountries}
                data-testid="button-clear-all-countries"
              >
                None
              </Button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Uncheck countries to hide rows from those countries
          </p>
          <ScrollArea className="h-64">
            <div className="space-y-2">
              {allCountries.map((country) => (
                <div key={country} className="flex items-center gap-2">
                  <Checkbox
                    id={`country-${country}`}
                    checked={selectedCountries.has(country)}
                    onCheckedChange={() => onToggleCountry(country)}
                    data-testid={`checkbox-country-${country}`}
                  />
                  <Label htmlFor={`country-${country}`} className="text-sm cursor-pointer flex-1">
                    {country}
                  </Label>
                  <span className="text-xs text-muted-foreground">
                    ({countryCounts[country] || 0})
                  </span>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      </PopoverContent>
    </Popover>
  );
}
