import { Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { US_STATES } from "@/components/map-search/map-search.constants";

interface MapSearchLocationFieldsProps {
  city: string;
  country: string;
  countryOptions: string[];
  isDefaultCountryChecked: boolean;
  isDefaultViewChecked: boolean;
  onToggleDefaultCountry: (checked: boolean) => void;
  onToggleDefaultView: (checked: boolean) => void;
  setCity: (value: string) => void;
  setCountry: (value: string) => void;
  setState: (value: string) => void;
  setStateOpen: (value: boolean) => void;
  state: string;
  stateOpen: boolean;
}

export function MapSearchLocationFields(props: MapSearchLocationFieldsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      <div className="space-y-2">
        <Label htmlFor="country">Country</Label>
        <Select value={props.country} onValueChange={props.setCountry}>
          <SelectTrigger data-testid="select-country">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {props.countryOptions.map((countryName) => (
              <SelectItem key={countryName} value={countryName}>
                {countryName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex items-center gap-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="save-default-country"
              checked={props.isDefaultCountryChecked}
              onCheckedChange={(checked) => props.onToggleDefaultCountry(checked as boolean)}
              data-testid="checkbox-save-default-country"
            />
            <Label htmlFor="save-default-country" className="text-xs text-muted-foreground cursor-pointer">
              Default country
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="save-default-view"
              checked={props.isDefaultViewChecked}
              onCheckedChange={(checked) => props.onToggleDefaultView(checked as boolean)}
              data-testid="checkbox-save-default-view"
            />
            <Label htmlFor="save-default-view" className="text-xs text-muted-foreground cursor-pointer">
              Default map view
            </Label>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label>State *</Label>
        <Popover open={props.stateOpen} onOpenChange={props.setStateOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={props.stateOpen}
              className="w-full justify-between"
              data-testid="button-state-select"
            >
              <span className="truncate">{props.state || "Select state..."}</span>
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[300px] p-0">
            <Command
              filter={(value, search) => {
                if (value.toLowerCase().startsWith(search.toLowerCase())) return 1;
                return 0;
              }}
            >
              <CommandInput placeholder="Search state..." />
              <CommandList>
                <CommandEmpty>No state found.</CommandEmpty>
                <CommandGroup>
                  {US_STATES.map((stateName) => (
                    <CommandItem
                      key={stateName}
                      value={stateName}
                      onSelect={(currentValue) => {
                        props.setState(currentValue);
                        props.setStateOpen(false);
                      }}
                      data-testid={`state-${stateName.toLowerCase().replace(/\s+/g, "-")}`}
                    >
                      <Check className={cn("mr-2 h-4 w-4", props.state === stateName ? "opacity-100" : "opacity-0")} />
                      {stateName}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      <div className="space-y-2">
        <Label htmlFor="city">City *</Label>
        <Input
          id="city"
          placeholder="e.g., Denver, Portland"
          value={props.city}
          onChange={(e) => props.setCity(e.target.value)}
          required
          data-testid="input-city"
        />
      </div>
    </div>
  );
}
