import { Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { CANADIAN_PROVINCES, US_STATES } from "@/components/map-search/map-search.constants";

interface MapSearchShowBusinessesPanelProps {
  city: string;
  country: string;
  setCity: (value: string) => void;
  setCountry: (value: string) => void;
  setState: (value: string) => void;
  setStateOpen: (value: boolean) => void;
  state: string;
  stateOpen: boolean;
  storeSheetId: string;
  trackerSheetId: string;
}

export function MapSearchShowBusinessesPanel(props: MapSearchShowBusinessesPanelProps) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="space-y-2">
          <Label htmlFor="show-biz-country">Country</Label>
          <Select
            value={props.country}
            onValueChange={(val) => {
              props.setCountry(val);
              props.setState("");
              props.setCity("");
            }}
          >
            <SelectTrigger data-testid="select-show-biz-country">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="United States">United States</SelectItem>
              <SelectItem value="Canada">Canada</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>State / Province *</Label>
          <Popover open={props.stateOpen} onOpenChange={props.setStateOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={props.stateOpen}
                className="w-full justify-between"
                data-testid="button-show-biz-state-select"
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
                <CommandInput placeholder={props.country === "Canada" ? "Search province..." : "Search state..."} />
                <CommandList>
                  <CommandEmpty>No results found.</CommandEmpty>
                  <CommandGroup>
                    {(props.country === "Canada" ? CANADIAN_PROVINCES : US_STATES).map((stateName) => (
                      <CommandItem
                        key={stateName}
                        value={stateName}
                        onSelect={(currentValue) => {
                          props.setState(currentValue);
                          props.setStateOpen(false);
                        }}
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
          <Label htmlFor="show-biz-city">City (optional)</Label>
          <Input
            id="show-biz-city"
            placeholder="Filter by city..."
            value={props.city}
            onChange={(e) => props.setCity(e.target.value)}
            data-testid="input-show-biz-city"
          />
        </div>
      </div>

      {!props.storeSheetId || !props.trackerSheetId ? (
        <p className="text-sm text-destructive">Store Database and Commission Tracker sheets are required to display business pins</p>
      ) : !props.state ? (
        <p className="text-sm text-muted-foreground">Select a state to view business pins on the map</p>
      ) : null}
    </div>
  );
}
