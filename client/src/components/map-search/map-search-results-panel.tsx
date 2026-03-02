import { type RefObject } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, ExternalLink, Loader2, Plus, Bone } from "lucide-react";
import type { PlaceResult } from "@/components/map-search/map-search.types";

interface MapSearchResultsPanelProps {
  allSelected: boolean;
  checkingDuplicates: boolean;
  duplicateCount: number;
  duplicatesInResults: number;
  exportProgress: { current: number; failed: number; total: number } | null;
  filteredResults: PlaceResult[];
  gridSearchInfo: { gridDuplicatesRemoved: number; totalZones: number } | null;
  handleExportSelected: () => Promise<void>;
  handleSavePlace: (placeId: string) => void;
  hiddenByKeywordFilters: number;
  hideClosedBusinesses: boolean;
  hideDuplicates: boolean;
  isQualificationMode: boolean;
  loadingMore: boolean;
  parseCityState: (address: string) => { city: string; state: string };
  resultsContainerRef: RefObject<HTMLDivElement>;
  saveToQualificationMutation: { isPending: boolean };
  saveToSheetMutation: { isPending: boolean };
  searchResults: PlaceResult[];
  selectedPlaces: Set<string>;
  setHideClosedBusinesses: (value: boolean) => void;
  setHideDuplicates: (value: boolean) => void;
  sheetsLoading: boolean;
  showCheckboxes: boolean;
  togglePlaceSelection: (placeId: string) => void;
  toggleSelectAll: () => void;
  getBusinessLink: (place: PlaceResult) => string;
}

export function MapSearchResultsPanel(props: MapSearchResultsPanelProps) {
  return (
    <div className="absolute top-0 right-0 bottom-0 w-1/3 min-w-[500px] z-20 bg-background shadow-2xl overflow-y-auto" ref={props.resultsContainerRef}>
      <div className="p-6">
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h2 className="text-2xl font-semibold">
                Search Results
                {props.hiddenByKeywordFilters > 0 ? (
                  <span className="text-sm font-normal ml-2">
                    (Showing {props.filteredResults.length} of {props.searchResults.length} results)
                    {props.hiddenByKeywordFilters > 0 && (
                      <span className="text-muted-foreground"> ({props.hiddenByKeywordFilters} hidden by keyword filters)</span>
                    )}
                  </span>
                ) : (
                  <span className="text-sm font-normal ml-2">({props.filteredResults.length})</span>
                )}
                {props.duplicateCount > 0 && (
                  <span className="text-sm font-normal text-muted-foreground ml-2">({props.duplicateCount} already imported)</span>
                )}
              </h2>
              {props.gridSearchInfo && props.gridSearchInfo.totalZones > 1 && (
                <p className="text-xs text-muted-foreground">
                  Comprehensive search: {props.gridSearchInfo.totalZones} zones searched
                  {props.gridSearchInfo.gridDuplicatesRemoved > 0 && (
                    <span>, {props.gridSearchInfo.gridDuplicatesRemoved} overlapping results merged</span>
                  )}
                </p>
              )}
              <p className="text-muted-foreground text-sm">
                {props.showCheckboxes
                  ? "Select businesses and use the export bar to save to your database"
                  : "Click 'Add to Database' to save a business to your Store Database sheet"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Checkbox
                id="hide-closed"
                checked={props.hideClosedBusinesses}
                onCheckedChange={(checked) => props.setHideClosedBusinesses(checked as boolean)}
                data-testid="checkbox-hide-closed"
              />
              <Label htmlFor="hide-closed" className="cursor-pointer text-sm">
                Hide closed businesses
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="hide-duplicates"
                checked={props.hideDuplicates}
                onCheckedChange={(checked) => props.setHideDuplicates(checked as boolean)}
                disabled={props.checkingDuplicates}
                data-testid="checkbox-hide-duplicates"
              />
              <Label htmlFor="hide-duplicates" className="cursor-pointer text-sm flex items-center gap-1">
                {props.checkingDuplicates ? (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Checking duplicates...
                  </>
                ) : (
                  <>
                    Hide duplicates
                    {props.duplicatesInResults > 0 && (
                      <Badge variant="secondary" className="ml-1">
                        {props.duplicatesInResults}
                      </Badge>
                    )}
                  </>
                )}
              </Label>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {props.showCheckboxes && <TableHead className="w-12">Select</TableHead>}
                <TableHead>Name & Rating</TableHead>
                <TableHead>Address</TableHead>
                <TableHead>Location</TableHead>
                {!props.showCheckboxes && <TableHead>Action</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {props.filteredResults.map((place) => {
                const { city: placeCity, state: placeState } = props.parseCityState(place.formatted_address);
                const businessLink = props.getBusinessLink(place);

                return (
                  <TableRow key={place.place_id} data-testid={`row-place-${place.place_id}`}>
                    {props.showCheckboxes && (
                      <TableCell>
                        <Checkbox
                          checked={props.selectedPlaces.has(place.place_id)}
                          onCheckedChange={() => props.togglePlaceSelection(place.place_id)}
                          data-testid={`checkbox-place-${place.place_id}`}
                        />
                      </TableCell>
                    )}
                    <TableCell className="font-medium">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <a
                            href={businessLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-base hover:underline flex items-center gap-1"
                            data-testid={`link-place-${place.place_id}`}
                          >
                            {place.name}
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </div>
                        {place.rating ? (
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <span className="text-yellow-500">★</span>
                            <span className="font-medium">{place.rating}</span>
                            <span>({place.user_ratings_total?.toLocaleString()} reviews)</span>
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">No reviews</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="max-w-xs">
                      <span className="line-clamp-2">{place.formatted_address}</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col text-sm">
                        <span className="font-medium">{placeCity}</span>
                        <span className="text-muted-foreground">{placeState}</span>
                      </div>
                    </TableCell>
                    {!props.showCheckboxes && (
                      <TableCell>
                        <Button
                          size="sm"
                          onClick={() => props.handleSavePlace(place.place_id)}
                          disabled={props.sheetsLoading || props.saveToSheetMutation.isPending || props.saveToQualificationMutation.isPending}
                          data-testid={`button-save-${place.place_id}`}
                        >
                          <Plus className="mr-1 h-3 w-3" />
                          {props.sheetsLoading ? "Loading..." : props.isQualificationMode ? "Add Lead" : "Add to Database"}
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        {props.loadingMore && (
          <div className="flex justify-center items-center py-8" data-testid="loading-more-indicator">
            <Bone className="h-8 w-8 text-primary animate-pulse" />
          </div>
        )}
      </div>

      {props.showCheckboxes && (
        <div className="sticky bottom-0 bg-background border-t p-4" data-testid="export-bar">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Checkbox id="select-all" checked={props.allSelected} onCheckedChange={props.toggleSelectAll} data-testid="checkbox-select-all" />
              <Label htmlFor="select-all" className="cursor-pointer text-sm font-medium">
                Select All
              </Label>
            </div>

            <Badge variant="secondary" data-testid="badge-selected-count">
              {props.selectedPlaces.size} selected
            </Badge>

            <Button
              onClick={props.handleExportSelected}
              disabled={props.sheetsLoading || props.selectedPlaces.size === 0 || props.exportProgress !== null}
              data-testid="button-export-crm"
            >
              {props.exportProgress ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Exporting {props.exportProgress.current}/{props.exportProgress.total}...
                </>
              ) : props.sheetsLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Checking destination...
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  {props.isQualificationMode ? `Add to Leads (${props.selectedPlaces.size})` : `Export to CRM (${props.selectedPlaces.size})`}
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
