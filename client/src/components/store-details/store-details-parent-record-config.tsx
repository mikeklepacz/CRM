import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { CANADIAN_PROVINCES, US_STATES } from "@/components/store-details/store-details-utils";

export function StoreDetailsParentRecordConfig(props: any) {
  const p = props;

  if (p.formData.dba) {
    return null;
  }

  return (
    <div
      className="space-y-3 p-3 bg-muted/30 rounded-md"
      style={{ opacity: !p.dbaName.trim() ? 0.5 : 1, pointerEvents: !p.dbaName.trim() ? "none" : "auto" }}
    >
      <Label>Parent Record</Label>
      <div className="space-y-2">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="parent-new"
            checked={p.parentCreationType === "new"}
            onCheckedChange={(checked) => {
              if (checked) {
                p.setParentCreationType("new");
                p.setSelectedParentLink("");
              }
            }}
            data-testid="checkbox-parent-new"
          />
          <Label htmlFor="parent-new" className="cursor-pointer font-normal">
            Create new parent (Corporate Office)
          </Label>
        </div>
        <div className="flex items-center space-x-2">
          <Checkbox
            id="parent-existing"
            checked={p.parentCreationType === "existing"}
            onCheckedChange={(checked) => {
              if (checked) {
                p.setParentCreationType("existing");
                if (p.selectedStores.length > 0) {
                  p.setSelectedParentLink(p.selectedStores[0].link);
                }
              }
            }}
            data-testid="checkbox-parent-existing"
          />
          <Label htmlFor="parent-existing" className="cursor-pointer font-normal">
            Use existing location as parent
          </Label>
        </div>
      </div>

      {p.parentCreationType === "new" && (
        <div className="space-y-3 pt-2 border-t">
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Corporate Office Location</Label>
            <p className="text-xs text-red-600 font-medium">City and State are required for parent to appear in CRM</p>
            <div className="grid grid-cols-1 gap-2">
              <Input
                placeholder="Address"
                value={p.corporateAddress}
                onChange={(e) => p.setCorporateAddress(e.target.value)}
                data-testid="input-corporate-address"
              />
              <div className="grid grid-cols-2 gap-2">
                <Input
                  placeholder="City *"
                  value={p.corporateCity}
                  onChange={(e) => p.setCorporateCity(e.target.value)}
                  data-testid="input-corporate-city"
                  required
                />
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      className={cn("w-full justify-between font-normal", !p.corporateState && "text-muted-foreground")}
                      data-testid="select-corporate-state"
                    >
                      {p.corporateState || "State *"}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[200px] p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Search states..." />
                      <CommandList>
                        <CommandEmpty>No state found.</CommandEmpty>
                        <CommandGroup>
                          {US_STATES.map((state) => (
                            <CommandItem key={state} value={state} onSelect={() => p.setCorporateState(state)}>
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  p.corporateState === state ? "opacity-100" : "opacity-0",
                                )}
                              />
                              {state}
                            </CommandItem>
                          ))}
                          {CANADIAN_PROVINCES.map((province) => (
                            <CommandItem key={province} value={province} onSelect={() => p.setCorporateState(province)}>
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  p.corporateState === province ? "opacity-100" : "opacity-0",
                                )}
                              />
                              {province}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
              <Input
                placeholder="Phone"
                type="tel"
                value={p.corporatePhone}
                onChange={(e) => p.setCorporatePhone(e.target.value)}
                data-testid="input-corporate-phone"
              />
              <Input
                placeholder="Email"
                type="email"
                value={p.corporateEmail}
                onChange={(e) => p.setCorporateEmail(e.target.value)}
                data-testid="input-corporate-email"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Corporate Contact Info (optional)</Label>
            <div className="grid grid-cols-1 gap-2">
              <Input
                placeholder="POC Name"
                value={p.parentPocName}
                onChange={(e) => p.setParentPocName(e.target.value)}
                data-testid="input-parent-poc-name"
              />
              <Input
                placeholder="POC Email"
                type="email"
                value={p.parentPocEmail}
                onChange={(e) => p.setParentPocEmail(e.target.value)}
                data-testid="input-parent-poc-email"
              />
              <Input
                placeholder="POC Phone"
                type="tel"
                value={p.parentPocPhone}
                onChange={(e) => p.setParentPocPhone(e.target.value)}
                data-testid="input-parent-poc-phone"
              />
            </div>
          </div>
        </div>
      )}

      {p.parentCreationType === "existing" && p.selectedStores.length > 0 && (
        <div className="space-y-2 pt-2 border-t">
          <Label htmlFor="select-parent">Select Parent Location</Label>
          <Select value={p.selectedParentLink} onValueChange={p.setSelectedParentLink}>
            <SelectTrigger id="select-parent" data-testid="select-parent-location">
              <SelectValue placeholder="Choose which location is the parent" />
            </SelectTrigger>
            <SelectContent>
              {p.selectedStores.map((store: any) => (
                <SelectItem key={store.link} value={store.link}>
                  {store.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
}
