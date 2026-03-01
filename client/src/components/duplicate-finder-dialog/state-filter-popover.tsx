import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Settings2 } from "lucide-react";
import { isCanadianProvince } from "./utils";

interface StateFilterPopoverProps {
  allStates: string[];
  selectedStates: string[];
  showCanadaOnly: boolean;
  stateCounts: Record<string, number>;
  onSelectedStatesChange: (states: string[]) => void;
  onShowCanadaOnlyChange: (value: boolean) => void;
  onStateChange: (state: string, isChecked: boolean) => void;
}

export function StateFilterPopover({
  allStates,
  selectedStates,
  showCanadaOnly,
  stateCounts,
  onSelectedStatesChange,
  onShowCanadaOnlyChange,
  onStateChange,
}: StateFilterPopoverProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" data-testid="button-state-filter">
          <Settings2 className="mr-2 h-4 w-4" />
          {selectedStates.length > 0 ? `${selectedStates.length} state(s)` : "Filter by State"}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium">Filter by State</h4>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => onSelectedStatesChange(allStates)} data-testid="button-select-all-states">
                All
              </Button>
              <Button variant="ghost" size="sm" onClick={() => onSelectedStatesChange([])} data-testid="button-clear-all-states">
                None
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-2 p-2 bg-muted rounded-md">
            <Checkbox
              id="canada-toggle"
              checked={showCanadaOnly}
              onCheckedChange={(checked) => onShowCanadaOnlyChange(!!checked)}
              data-testid="checkbox-canada-toggle"
            />
            <Label htmlFor="canada-toggle" className="text-sm cursor-pointer flex-1 font-medium">
              Canada
            </Label>
            <span className="text-xs text-muted-foreground">
              ({allStates.filter(isCanadianProvince).reduce((sum, state) => sum + (stateCounts[state] || 0), 0)} stores)
            </span>
          </div>

          <ScrollArea className="h-64">
            <div className="space-y-2">
              {allStates
                .filter((state) => (showCanadaOnly ? isCanadianProvince(state) : !isCanadianProvince(state)))
                .map((state) => (
                  <div key={state} className="flex items-center gap-2">
                    <Checkbox
                      id={`state-${state}`}
                      checked={selectedStates.includes(state)}
                      onCheckedChange={(checked) => onStateChange(state, checked as boolean)}
                      data-testid={`checkbox-state-${state}`}
                    />
                    <Label htmlFor={`state-${state}`} className="text-sm cursor-pointer flex-1">
                      {state}
                    </Label>
                    <span className="text-xs text-muted-foreground">({stateCounts[state] || 0})</span>
                  </div>
                ))}
            </div>
          </ScrollArea>
        </div>
      </PopoverContent>
    </Popover>
  );
}
