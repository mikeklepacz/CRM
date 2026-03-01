import { Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { Category, SearchHistory } from "@/components/map-search/map-search.types";

interface MapSearchBusinessCategoryFieldsProps {
  businessType: string;
  businessTypeOpen: boolean;
  category: string;
  categoryOpen: boolean;
  categoriesData?: { categories: Category[] };
  customCategory: string;
  hasProject: boolean;
  isQualificationMode: boolean;
  searchHistoryData?: { history: SearchHistory[] };
  setBusinessType: (value: string) => void;
  setBusinessTypeOpen: (value: boolean) => void;
  setCategory: (value: string) => void;
  setCategoryOpen: (value: boolean) => void;
  setCustomCategory: (value: string) => void;
}

export function MapSearchBusinessCategoryFields(props: MapSearchBusinessCategoryFieldsProps) {
  return (
    <div className={`grid gap-3 ${props.hasProject ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2"}`}>
      <div className="space-y-2">
        <Label>Business Type *</Label>
        <Popover open={props.businessTypeOpen} onOpenChange={props.setBusinessTypeOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={props.businessTypeOpen}
              className="w-full justify-between"
              data-testid="button-business-type-select"
            >
              {props.businessType || "Select or type business type..."}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[300px] p-0">
            <Command shouldFilter={false}>
              <CommandInput placeholder="Type to search or enter new..." value={props.businessType} onValueChange={props.setBusinessType} />
              <CommandList>
                {props.searchHistoryData?.history && props.searchHistoryData.history.length > 0 ? (
                  <CommandGroup heading="Recent Searches">
                    {(() => {
                      const uniqueBusinessTypes = new Map();
                      props.searchHistoryData?.history
                        .sort((a, b) => new Date(b.searchedAt).getTime() - new Date(a.searchedAt).getTime())
                        .forEach((entry) => {
                          if (!uniqueBusinessTypes.has(entry.businessType)) {
                            uniqueBusinessTypes.set(entry.businessType, entry);
                          }
                        });
                      return Array.from(uniqueBusinessTypes.values())
                        .slice(0, 10)
                        .map((entry: any) => (
                          <CommandItem
                            key={entry.id}
                            value={entry.businessType}
                            onSelect={(currentValue) => {
                              props.setBusinessType(currentValue);
                              props.setBusinessTypeOpen(false);
                            }}
                          >
                            <Check className={cn("mr-2 h-4 w-4", props.businessType === entry.businessType ? "opacity-100" : "opacity-0")} />
                            {entry.businessType}
                          </CommandItem>
                        ));
                    })()}
                  </CommandGroup>
                ) : (
                  <CommandEmpty>Type to enter a business type</CommandEmpty>
                )}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      <div className={props.hasProject ? "hidden" : "space-y-2"}>
        <Label htmlFor="category">{props.isQualificationMode ? "Category/Tag" : "Category"}</Label>
        <Popover open={props.categoryOpen} onOpenChange={props.setCategoryOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={props.categoryOpen}
              className="w-full justify-between"
              data-testid="button-category-select"
            >
              {(props.isQualificationMode ? props.customCategory : props.category) || "Select or type category..."}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[300px] p-0">
            <Command shouldFilter={false}>
              <CommandInput
                placeholder="Type to search or enter new..."
                value={props.isQualificationMode ? props.customCategory : props.category}
                onValueChange={(value) => {
                  if (props.isQualificationMode) {
                    props.setCustomCategory(value);
                  } else {
                    props.setCategory(value);
                  }
                }}
              />
              <CommandList>
                {props.categoriesData?.categories && props.categoriesData.categories.length > 0 ? (
                  <CommandGroup heading="Categories">
                    {props.categoriesData.categories.map((cat) => (
                      <CommandItem
                        key={cat.id}
                        value={cat.name}
                        onSelect={(currentValue) => {
                          if (props.isQualificationMode) {
                            props.setCustomCategory(currentValue);
                          } else {
                            props.setCategory(currentValue);
                          }
                          props.setCategoryOpen(false);
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            (props.isQualificationMode ? props.customCategory : props.category) === cat.name ? "opacity-100" : "opacity-0",
                          )}
                        />
                        {cat.name}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                ) : (
                  <CommandEmpty>Type to enter a category</CommandEmpty>
                )}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}
