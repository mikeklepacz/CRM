import React, { useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Store, Globe, MapPin, Settings2 } from "lucide-react";
import { detectFranchises, type FranchiseGroup } from "@shared/franchiseUtils";
import { buildStateCounts, isCanadianProvince } from "./franchise-finder-dialog-utils";
import type { FranchiseFinderDialogProps } from "./franchise-finder-dialog-types";

export function FranchiseFinderDialog({
  open,
  onOpenChange,
  stores,
  onSelectFranchise,
}: FranchiseFinderDialogProps) {
  const [minLocations, setMinLocations] = useState(2);
  const [maxLocations, setMaxLocations] = useState(100);
  const [selectedStates, setSelectedStates] = useState<string[]>([]);
  const [showCanadaOnly, setShowCanadaOnly] = useState(false);

  const franchises = useMemo(() => {
    let filteredFranchises = detectFranchises(stores, minLocations, maxLocations);

    if (selectedStates.length > 0) {
      filteredFranchises = filteredFranchises.filter(franchise =>
        franchise.locations.some(location => location.State && selectedStates.includes(location.State))
      );
    }
    return filteredFranchises;
  }, [stores, minLocations, maxLocations, selectedStates]);

  const allStates = useMemo(() => {
    const states = new Set<string>();
    stores.forEach(store => {
      if (store.State) {
        states.add(store.State);
      }
    });
    return Array.from(states).sort();
  }, [stores]);

  const canadianStates = allStates.filter(isCanadianProvince);
  const usStates = allStates.filter(state => !isCanadianProvince(state));

  const stateCounts = useMemo(() => buildStateCounts(stores), [stores]);

  const handleSelectFranchise = (franchise: FranchiseGroup) => {
    onSelectFranchise(franchise);
    onOpenChange(false);
  };

  const handleStateChange = (state: string, isChecked: boolean) => {
    setSelectedStates(prev =>
      isChecked ? [...prev, state] : prev.filter(s => s !== state)
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh]" data-testid="dialog-franchise-finder">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Store className="h-5 w-5" />
            Franchise Finder
          </DialogTitle>
          <DialogDescription>
            Discover multi-location franchises and chains to target high-value accounts
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-3 md:col-span-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">
                  Locations per Franchise
                </label>
                <Badge variant="secondary" data-testid="badge-location-range">
                  {minLocations} - {maxLocations === 100 ? "100+" : maxLocations}
                </Badge>
              </div>
              <Slider
                value={[minLocations, maxLocations]}
                onValueChange={(values) => {
                  setMinLocations(values[0]);
                  setMaxLocations(values[1]);
                }}
                min={2}
                max={100}
                step={1}
                className="w-full"
                data-testid="slider-location-range"
              />
              <p className="text-xs text-muted-foreground">
                Adjust to find franchises that match your target account size. Smaller teams may prefer fewer locations.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Settings2 className="h-4 w-4 text-muted-foreground" />
                Filter by State
              </label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start" data-testid="button-state-filter">
                    {selectedStates.length > 0
                      ? `${selectedStates.length} state(s) selected`
                      : "All States"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-80">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">Filter by State</h4>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedStates(allStates)}
                          data-testid="button-select-all-states"
                        >
                          All
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedStates([])}
                          data-testid="button-clear-all-states"
                        >
                          None
                        </Button>
                      </div>
                    </div>

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
                      <span className="text-xs text-muted-foreground">
                        ({allStates.filter(isCanadianProvince).reduce((sum, state) => sum + (stateCounts[state] || 0), 0)} shops)
                      </span>
                    </div>

                    <ScrollArea className="h-64">
                      <div className="space-y-2">
                        {allStates
                          .filter(state => showCanadaOnly ? isCanadianProvince(state) : !isCanadianProvince(state))
                          .map((state) => (
                          <div key={state} className="flex items-center gap-2">
                            <Checkbox
                              id={`state-${state}`}
                              checked={selectedStates.includes(state)}
                              onCheckedChange={(checked) => handleStateChange(state, checked as boolean)}
                              data-testid={`checkbox-state-${state}`}
                            />
                            <Label
                              htmlFor={`state-${state}`}
                              className="text-sm cursor-pointer flex-1"
                            >
                              {state}
                            </Label>
                            <span className="text-xs text-muted-foreground">
                              ({stateCounts[state] || 0})
                            </span>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium">
                Found {franchises.length} Franchise{franchises.length !== 1 ? 's' : ''}
              </h3>
              {franchises.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  {franchises.reduce((sum, f) => sum + f.locations.length, 0)} total stores
                </p>
              )}
            </div>

            <ScrollArea className="h-[400px] rounded-md border">
              {franchises.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full py-12 text-center">
                  <Store className="h-12 w-12 text-muted-foreground/50 mb-4" />
                  <p className="text-sm text-muted-foreground">
                    No franchises found with your current filters
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Try adjusting the location range or state filter
                  </p>
                </div>
              ) : (
                <div className="p-4 space-y-3">
                  {franchises.map((franchise, index) => (
                    <div
                      key={index}
                      className="rounded-lg border p-4 hover-elevate active-elevate-2 cursor-pointer transition-colors"
                      onClick={() => handleSelectFranchise(franchise)}
                      data-testid={`franchise-item-${index}`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-semibold">{franchise.brandName}</h4>
                            <Badge variant="default" data-testid={`badge-location-count-${index}`}>
                              <MapPin className="h-3 w-3 mr-1" />
                              {franchise.locations.length} {franchise.locations.length === 1 ? 'location' : 'locations'}
                            </Badge>
                            {franchise.matchType === 'website' && franchise.commonWebsite && (
                              <Badge variant="secondary" className="text-xs">
                                <Globe className="h-3 w-3 mr-1" />
                                {franchise.commonWebsite}
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Matched by: {franchise.matchType === 'website' ? 'Common website' : 'Name similarity'}
                          </p>
                        </div>
                      </div>

                      <div className="mt-3 space-y-1">
                        {franchise.locations.slice(0, 5).map((location, locIndex) => (
                          <div key={locIndex} className="text-sm text-muted-foreground flex items-center gap-2">
                            <MapPin className="h-3 w-3 shrink-0" />
                            <span className="truncate">{location.Name}</span>
                          </div>
                        ))}
                        {franchise.locations.length > 5 && (
                          <p className="text-xs text-muted-foreground pl-5">
                            + {franchise.locations.length - 5} more locations
                          </p>
                        )}
                      </div>

                      <div className="mt-3 pt-3 border-t">
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectFranchise(franchise);
                          }}
                          data-testid={`button-select-franchise-${index}`}
                        >
                          View All {franchise.locations.length} Locations
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} data-testid="button-cancel">
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
