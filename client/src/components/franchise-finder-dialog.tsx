import { useState, useMemo } from "react";
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
import { Store, Globe, MapPin } from "lucide-react";
import { detectFranchises, type FranchiseGroup, type StoreData } from "@shared/franchiseUtils";

interface FranchiseFinderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stores: StoreData[];
  onSelectFranchise: (franchise: FranchiseGroup) => void;
}

export function FranchiseFinderDialog({
  open,
  onOpenChange,
  stores,
  onSelectFranchise,
}: FranchiseFinderDialogProps) {
  const [maxLocations, setMaxLocations] = useState(100);
  
  const franchises = useMemo(() => {
    return detectFranchises(stores, 2, maxLocations);
  }, [stores, maxLocations]);

  const handleSelectFranchise = (franchise: FranchiseGroup) => {
    onSelectFranchise(franchise);
    onOpenChange(false);
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
          {/* Max Locations Slider */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">
                Maximum Locations per Franchise
              </label>
              <Badge variant="secondary" data-testid="badge-max-locations">
                {maxLocations === 100 ? "100+" : maxLocations}
              </Badge>
            </div>
            <Slider
              value={[maxLocations]}
              onValueChange={(values) => setMaxLocations(values[0])}
              min={2}
              max={100}
              step={1}
              className="w-full"
              data-testid="slider-max-locations"
            />
            <p className="text-xs text-muted-foreground">
              Adjust to find franchises that match your target account size. Smaller teams may prefer fewer locations.
            </p>
          </div>

          <Separator />

          {/* Results */}
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
                    Try increasing the maximum locations slider
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

                      {/* Show first 5 locations as preview */}
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
