import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Check, ChevronsUpDown, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { SortableSection } from "@/components/store-details/sortable-section";
import { CANADIAN_PROVINCES, US_STATES } from "@/components/store-details/store-details-utils";

export function StoreDetailsContactInfoSection(props: any) {
  const p = props;

  return (
    <SortableSection key="contact-info" id="contact-info">
      <AccordionItem value="contact-info" data-testid="accordion-item-contact-info">
        <AccordionTrigger className="text-lg font-semibold" data-testid="trigger-contact-info">
          Contact Information
        </AccordionTrigger>
        <AccordionContent>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="listing-name">Listing Name</Label>
              <Input
                id="listing-name"
                data-testid="input-listing-name"
                value={p.formData.name}
                onChange={(e) => p.handleInputChange("name", e.target.value)}
                placeholder="Store listing name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Street Address</Label>
              <Input
                id="address"
                data-testid="input-address"
                value={p.formData.address}
                onChange={(e) => p.handleInputChange("address", e.target.value)}
                placeholder="123 Main St"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  data-testid="input-city"
                  value={p.formData.city}
                  onChange={(e) => p.handleInputChange("city", e.target.value)}
                  placeholder="City"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">State</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      id="state"
                      variant="outline"
                      role="combobox"
                      className={cn("w-full justify-between font-normal", !p.formData.state && "text-muted-foreground")}
                      data-testid="input-state"
                    >
                      {p.formData.state || "State"}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[300px] p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Search states..." />
                      <CommandList>
                        <CommandEmpty>No state found.</CommandEmpty>
                        <CommandGroup>
                          {US_STATES.map((state) => (
                            <CommandItem key={state} value={state} onSelect={() => p.handleInputChange("state", state)}>
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  p.formData.state === state ? "opacity-100" : "opacity-0",
                                )}
                              />
                              {state}
                            </CommandItem>
                          ))}
                          {CANADIAN_PROVINCES.map((province) => (
                            <CommandItem
                              key={province}
                              value={province}
                              onSelect={() => p.handleInputChange("state", province)}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  p.formData.state === province ? "opacity-100" : "opacity-0",
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
            </div>

            <Separator className="my-4" />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  data-testid="input-phone"
                  type="tel"
                  value={p.formData.phone}
                  onChange={(e) => p.handleInputChange("phone", e.target.value)}
                  placeholder="(555) 123-4567"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  data-testid="input-email"
                  type="email"
                  value={p.formData.email}
                  onChange={(e) => p.handleInputChange("email", e.target.value)}
                  placeholder="contact@store.com"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="website">Website</Label>
              <div className="flex gap-2">
                <Input
                  id="website"
                  data-testid="input-website"
                  value={p.formData.website}
                  onChange={(e) => p.handleInputChange("website", e.target.value)}
                  placeholder="https://www.store.com"
                  className="flex-1"
                />
                {p.formData.website && (
                  <Button variant="outline" size="icon" asChild data-testid="button-open-website">
                    <a
                      href={p.formData.website.startsWith("http") ? p.formData.website : `https://${p.formData.website}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </Button>
                )}
              </div>
            </div>
          </div>
        </AccordionContent>
      </AccordionItem>
    </SortableSection>
  );
}
