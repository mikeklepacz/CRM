import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Settings2 } from "lucide-react";
import { isCanadianProvince } from "@/components/client-dashboard/region-utils";

type StatesFilterPopoverProps = {
  allStates: string[];
  clearAllStates: () => void;
  selectAllStates: () => void;
  selectedStates: Set<string>;
  setShowCanadaOnly: (value: boolean) => void;
  setShowStateless: (value: boolean) => void;
  showCanadaOnly: boolean;
  showStateless: boolean;
  stateCounts: Record<string, number>;
  statesButtonColor?: string;
  statelessCount: number;
  toggleState: (state: string) => void;
};

export function StatesFilterPopover({
  allStates,
  clearAllStates,
  selectAllStates,
  selectedStates,
  setShowCanadaOnly,
  setShowStateless,
  showCanadaOnly,
  showStateless,
  stateCounts,
  statesButtonColor,
  statelessCount,
  toggleState,
}: StatesFilterPopoverProps) {
  const canadaCount = allStates
    .filter(isCanadianProvince)
    .reduce((sum, state) => sum + (stateCounts[state] || 0), 0);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          data-testid="button-states-filter"
          style={
            statesButtonColor
              ? { backgroundColor: statesButtonColor, borderColor: statesButtonColor }
              : undefined
          }
        >
          <Settings2 className="mr-2 h-4 w-4" />
          States ({selectedStates.size + (showStateless ? 1 : 0)}/{allStates.length + 1})
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium">Filter by State</h4>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={selectAllStates}
                data-testid="button-select-all-states"
              >
                All
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAllStates}
                data-testid="button-clear-all-states"
              >
                None
              </Button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Uncheck states to hide rows from those states
          </p>

          <div className="flex items-center gap-2 p-2 bg-muted rounded-md">
            <Checkbox
              id="canada-toggle"
              checked={showCanadaOnly}
              onCheckedChange={(checked) => {
                setShowCanadaOnly(!!checked);
              }}
              data-testid="checkbox-canada-toggle"
            />
            <Label
              htmlFor="canada-toggle"
              className="text-sm cursor-pointer flex-1 font-medium"
            >
              Canada
            </Label>
            <span className="text-xs text-muted-foreground">({canadaCount} shops)</span>
          </div>

          <ScrollArea className="h-64">
            <div className="space-y-2">
              {allStates
                .filter((state) =>
                  showCanadaOnly ? isCanadianProvince(state) : !isCanadianProvince(state),
                )
                .map((state) => (
                  <div key={state} className="flex items-center gap-2">
                    <Checkbox
                      id={`state-${state}`}
                      checked={selectedStates.has(state)}
                      onCheckedChange={() => toggleState(state)}
                      data-testid={`checkbox-state-${state}`}
                    />
                    <Label htmlFor={`state-${state}`} className="text-sm cursor-pointer flex-1">
                      {state}
                    </Label>
                    <span className="text-xs text-muted-foreground">
                      ({stateCounts[state] || 0})
                    </span>
                  </div>
                ))}
            </div>
          </ScrollArea>

          <div className="flex items-center gap-2 p-2 bg-muted rounded-md">
            <Checkbox
              id="stateless-toggle"
              checked={showStateless}
              onCheckedChange={(checked) => {
                setShowStateless(!!checked);
              }}
              data-testid="checkbox-stateless-toggle"
            />
            <Label
              htmlFor="stateless-toggle"
              className="text-sm cursor-pointer flex-1 font-medium"
            >
              Stateless
            </Label>
            <span className="text-xs text-muted-foreground">({statelessCount} shops)</span>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
