import { Link } from "wouter";
import { ChevronLeft, ChevronRight, Plus, Settings2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface MapSearchFiltersPanelProps {
  activeKeywords: string[];
  activeTypes: string[];
  addExclusionMutation: { isPending: boolean; mutate: (params: { type: "keyword" | "place_type"; value: string }) => void };
  clearAllKeywords: () => void;
  clearAllTypes: () => void;
  filtersOpen: boolean;
  keywords: string[];
  newKeyword: string;
  newPlaceType: string;
  placeTypes: string[];
  setFiltersOpen: (value: boolean) => void;
  setNewKeyword: (value: string) => void;
  setNewPlaceType: (value: string) => void;
  toggleKeyword: (keyword: string) => void;
  togglePlaceType: (type: string) => void;
}

export function MapSearchFiltersPanel(props: MapSearchFiltersPanelProps) {
  return (
    <div className="border rounded-md">
      <div className="flex items-center justify-between pr-2">
        <Button
          type="button"
          variant="ghost"
          onClick={() => props.setFiltersOpen(!props.filtersOpen)}
          className="flex-1 justify-start hover-elevate"
          data-testid="button-filters-toggle"
        >
          <div className="flex items-center gap-2">
            {props.filtersOpen ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            <span className="font-medium">Filters</span>
            {(props.activeKeywords.length > 0 || props.activeTypes.length > 0) && (
              <Badge variant="secondary" className="ml-2">
                {props.activeKeywords.length + props.activeTypes.length} active
              </Badge>
            )}
          </div>
        </Button>
        <Link href="/map-search-settings">
          <Button type="button" variant="ghost" size="icon" data-testid="button-filters-settings">
            <Settings2 className="h-4 w-4" />
          </Button>
        </Link>
      </div>

      {props.filtersOpen && (
        <div className="p-4 space-y-3 border-t">
          <Collapsible defaultOpen={false}>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="p-0 hover-elevate">
                    <Label className="cursor-pointer font-semibold">Hide Keyword Results</Label>
                  </Button>
                </CollapsibleTrigger>
                {props.activeKeywords.length > 0 && (
                  <Button type="button" variant="ghost" size="sm" onClick={props.clearAllKeywords} data-testid="button-clear-keywords">
                    Clear All
                  </Button>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                Dual-purpose: filters backend results when checked before search, filters visible results when checked after
              </p>

              <CollapsibleContent>
                <div className="flex gap-2 mb-3">
                  <Input
                    placeholder="Add keyword to exclude..."
                    value={props.newKeyword}
                    onChange={(e) => props.setNewKeyword(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        if (props.newKeyword.trim()) {
                          props.addExclusionMutation.mutate({
                            type: "keyword",
                            value: props.newKeyword.trim(),
                          });
                        }
                      }
                    }}
                    data-testid="input-new-keyword"
                  />
                  <Button
                    type="button"
                    size="sm"
                    disabled={!props.newKeyword.trim() || props.addExclusionMutation.isPending}
                    onClick={() => {
                      if (props.newKeyword.trim()) {
                        props.addExclusionMutation.mutate({
                          type: "keyword",
                          value: props.newKeyword.trim(),
                        });
                      }
                    }}
                    data-testid="button-add-keyword"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add
                  </Button>
                </div>

                <div className="space-y-2 max-h-[200px] overflow-y-auto">
                  {props.keywords.length === 0 ? (
                    <p className="text-sm text-muted-foreground italic">No keywords saved yet</p>
                  ) : (
                    props.keywords.map((keyword) => (
                      <div key={keyword} className="flex items-center gap-2">
                        <Checkbox
                          id={`keyword-${keyword}`}
                          checked={props.activeKeywords.includes(keyword)}
                          onCheckedChange={() => props.toggleKeyword(keyword)}
                          data-testid={`checkbox-keyword-${keyword}`}
                        />
                        <Label htmlFor={`keyword-${keyword}`} className="cursor-pointer text-sm flex-1">
                          {keyword}
                        </Label>
                      </div>
                    ))
                  )}
                </div>
              </CollapsibleContent>
            </div>
          </Collapsible>

          <Collapsible defaultOpen={false}>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="p-0 hover-elevate">
                    <Label className="cursor-pointer font-semibold">Exclude Place Types</Label>
                  </Button>
                </CollapsibleTrigger>
                {props.activeTypes.length > 0 && (
                  <Button type="button" variant="ghost" size="sm" onClick={props.clearAllTypes} data-testid="button-clear-types">
                    Clear All
                  </Button>
                )}
              </div>
              <p className="text-sm text-muted-foreground">API-level filtering - saves credits by excluding before results</p>

              <CollapsibleContent>
                <div className="flex gap-2 mb-3">
                  <Input
                    placeholder="Add place type to exclude..."
                    value={props.newPlaceType}
                    onChange={(e) => props.setNewPlaceType(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        if (props.newPlaceType.trim()) {
                          props.addExclusionMutation.mutate({
                            type: "place_type",
                            value: props.newPlaceType.trim().toLowerCase().replace(/\s+/g, "_"),
                          });
                        }
                      }
                    }}
                    data-testid="input-new-place-type"
                  />
                  <Button
                    type="button"
                    size="sm"
                    disabled={!props.newPlaceType.trim() || props.addExclusionMutation.isPending}
                    onClick={() => {
                      if (props.newPlaceType.trim()) {
                        props.addExclusionMutation.mutate({
                          type: "place_type",
                          value: props.newPlaceType.trim().toLowerCase().replace(/\s+/g, "_"),
                        });
                      }
                    }}
                    data-testid="button-add-place-type"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add
                  </Button>
                </div>

                <div className="space-y-2 max-h-[200px] overflow-y-auto">
                  {props.placeTypes.length === 0 ? (
                    <p className="text-sm text-muted-foreground italic">No place types saved yet</p>
                  ) : (
                    props.placeTypes.map((type) => (
                      <div key={type} className="flex items-center gap-2">
                        <Checkbox
                          id={`type-${type}`}
                          checked={props.activeTypes.includes(type)}
                          onCheckedChange={() => props.togglePlaceType(type)}
                          data-testid={`checkbox-type-${type}`}
                        />
                        <Label htmlFor={`type-${type}`} className="cursor-pointer text-sm flex-1">
                          {type}
                        </Label>
                      </div>
                    ))
                  )}
                </div>
              </CollapsibleContent>
            </div>
          </Collapsible>
        </div>
      )}
    </div>
  );
}
