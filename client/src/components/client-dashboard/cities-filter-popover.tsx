import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Settings2 } from "lucide-react";

type CitiesFilterPopoverProps = {
  citiesInSelectedStates: string[];
  cityCounts: Record<string, number>;
  citySearchTerm: string;
  onCitySearchTermChange: (value: string) => void;
  onClearAllCities: () => void;
  onSelectAllCities: () => void;
  onToggleCity: (city: string) => void;
  selectedCities: Set<string>;
};

export function CitiesFilterPopover({
  citiesInSelectedStates,
  cityCounts,
  citySearchTerm,
  onCitySearchTermChange,
  onClearAllCities,
  onSelectAllCities,
  onToggleCity,
  selectedCities,
}: CitiesFilterPopoverProps) {
  const filteredCities = citiesInSelectedStates.filter((city) =>
    city.toLowerCase().includes(citySearchTerm.toLowerCase()),
  );

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" data-testid="button-cities-filter">
          <Settings2 className="mr-2 h-4 w-4" />
          Cities ({selectedCities.size}/{citiesInSelectedStates.length})
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium">Filter by City</h4>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={onSelectAllCities}
                data-testid="button-select-all-cities"
              >
                All
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClearAllCities}
                data-testid="button-clear-all-cities"
              >
                None
              </Button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Cities in selected states ({citiesInSelectedStates.length} total)
          </p>
          <Input
            placeholder="Search cities..."
            value={citySearchTerm}
            onChange={(e) => onCitySearchTermChange(e.target.value)}
            className="h-8"
            data-testid="input-search-cities"
          />
          <ScrollArea className="h-64">
            <div className="space-y-2">
              {filteredCities.map((city) => (
                <div key={city} className="flex items-center gap-2">
                  <Checkbox
                    id={`city-${city}`}
                    checked={selectedCities.has(city)}
                    onCheckedChange={() => onToggleCity(city)}
                    data-testid={`checkbox-city-${city}`}
                  />
                  <Label htmlFor={`city-${city}`} className="text-sm cursor-pointer flex-1">
                    {city}
                  </Label>
                  <span className="text-xs text-muted-foreground">
                    ({cityCounts[city] || 0})
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
