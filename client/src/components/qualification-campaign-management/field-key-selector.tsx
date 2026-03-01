import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from "@/components/ui/command";
import { Plus, Trash2, Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { PLACEHOLDER_CATEGORIES } from "@/components/qualification-campaign-management/constants";

export function FieldKeySelector(props: any) {
  if (props.isCustomKey) {
    return (
      <div className="flex gap-2">
        <div className="relative flex-1">
          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">{`{{`}</span>
          <Input
            value={props.customKeyInput}
            onChange={(e) => {
              const value = e.target.value.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
              props.setCustomKeyInput(value);
              props.setNewField((prev: any) => ({ ...prev, key: value }));
            }}
            placeholder="custom_key"
            className="px-7"
            data-testid="input-custom-field-key"
          />
          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">{`}}`}</span>
        </div>
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => {
            props.setIsCustomKey(false);
            props.setCustomKeyInput("");
            props.setNewField((prev: any) => ({ ...prev, key: "" }));
          }}
          data-testid="button-cancel-custom-key"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <Popover
      open={props.fieldKeyOpen}
      onOpenChange={(open) => {
        props.setFieldKeyOpen(open);
        if (!open) props.setFieldKeySearch("");
      }}
    >
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={props.fieldKeyOpen}
          className="w-full justify-between font-normal"
          data-testid="combobox-field-key"
        >
          {props.newField.key ? (
            <code className="text-sm">{`{{${props.newField.key}}}`}</code>
          ) : (
            <span className="text-muted-foreground">Select placeholder...</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0 max-h-[350px]" align="start">
        <Command className="flex flex-col max-h-[350px]">
          <CommandInput placeholder="Search placeholders..." value={props.fieldKeySearch} onValueChange={props.setFieldKeySearch} />
          <CommandList className="flex-1 max-h-[280px] overflow-y-auto">
            <CommandEmpty>
              <div className="py-4 text-center">
                <p className="text-sm text-muted-foreground mb-2">No placeholder found.</p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const sanitizedSearch = props.fieldKeySearch.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
                    props.setCustomKeyInput(sanitizedSearch);
                    props.setNewField((prev: any) => ({ ...prev, key: sanitizedSearch }));
                    props.setIsCustomKey(true);
                    props.setFieldKeyOpen(false);
                    props.setFieldKeySearch("");
                  }}
                  data-testid="button-create-custom-empty"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Create custom placeholder
                </Button>
              </div>
            </CommandEmpty>
            {Object.entries(PLACEHOLDER_CATEGORIES).map(([category, placeholders]) => (
              <CommandGroup key={category} heading={category}>
                {placeholders.map((placeholder) => (
                  <CommandItem
                    key={placeholder.key}
                    value={placeholder.key}
                    onSelect={() => {
                      props.setNewField((prev: any) => ({ ...prev, key: placeholder.key }));
                      props.setFieldKeySearch("");
                      props.setFieldKeyOpen(false);
                    }}
                    data-testid={`option-placeholder-${placeholder.key}`}
                  >
                    <Check className={cn("mr-2 h-4 w-4", props.newField.key === placeholder.key ? "opacity-100" : "opacity-0")} />
                    <div className="flex flex-col">
                      <code className="text-xs">{`{{${placeholder.key}}}`}</code>
                      <span className="text-xs text-muted-foreground">{placeholder.label}</span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
            <CommandSeparator />
            <CommandGroup heading="Custom" forceMount>
              <CommandItem
                value="__custom__ custom create new placeholder"
                onSelect={() => {
                  const sanitizedSearch = props.fieldKeySearch.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
                  props.setCustomKeyInput(sanitizedSearch);
                  props.setNewField((prev: any) => ({ ...prev, key: sanitizedSearch }));
                  props.setIsCustomKey(true);
                  props.setFieldKeyOpen(false);
                  props.setFieldKeySearch("");
                }}
                data-testid="option-custom-key"
              >
                <Plus className="mr-2 h-4 w-4" />
                <span>Add custom placeholder...</span>
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
