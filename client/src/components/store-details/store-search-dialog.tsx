import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2 } from "lucide-react";

type SelectedStore = {
  link: string;
  name: string;
};

type StoreSearchDialogProps = {
  filteredStores: any[];
  isLoadingStores: boolean;
  onOpenChange: (open: boolean) => void;
  onSearchChange: (value: string) => void;
  onSelectionChange: (stores: SelectedStore[]) => void;
  open: boolean;
  selectedStores: SelectedStore[];
  storeSearch: string;
};

export function StoreSearchDialog({
  filteredStores,
  isLoadingStores,
  onOpenChange,
  onSearchChange,
  onSelectionChange,
  open,
  selectedStores,
  storeSearch,
}: StoreSearchDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent enableEnterSubmit={false} className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Select Multiple Locations</DialogTitle>
          <DialogDescription>
            Search and select multiple stores to claim with the DBA name
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="store_search">Search Stores (type 2+ letters to search)</Label>
            <Input
              id="store_search"
              data-testid="input-store-search"
              value={storeSearch}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search by name, city, state, or address..."
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              {selectedStores.length} location{selectedStores.length !== 1 ? "s" : ""} selected
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  if (filteredStores.length > 0) {
                    onSelectionChange(
                      filteredStores.map((store: any) => ({ link: store.link, name: store.name })),
                    );
                  }
                }}
                disabled={filteredStores.length === 0}
                data-testid="button-select-all"
              >
                Select All ({filteredStores.length})
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onSelectionChange([])}
                disabled={selectedStores.length === 0}
                data-testid="button-select-none"
              >
                Clear All
              </Button>
            </div>
          </div>

          <ScrollArea className="h-96 border rounded-md">
            <div className="p-4 space-y-2">
              {storeSearch.length < 2 ? (
                <p className="text-center text-muted-foreground py-8">
                  Type 2 or more letters to search for stores...
                </p>
              ) : isLoadingStores ? (
                <p className="text-center text-muted-foreground py-8">
                  <Loader2 className="h-6 w-6 mx-auto mb-2 animate-spin" />
                  Loading stores...
                </p>
              ) : filteredStores.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No stores found matching "{storeSearch}"
                </p>
              ) : (
                filteredStores.map((store: any) => {
                  const isSelected = selectedStores.some(
                    (selectedStore) => selectedStore.link === store.link,
                  );

                  const toggleStore = () => {
                    onSelectionChange(
                      isSelected
                        ? selectedStores.filter((selectedStore) => selectedStore.link !== store.link)
                        : [...selectedStores, { link: store.link, name: store.name }],
                    );
                  };

                  return (
                    <div
                      key={store.link}
                      className={`flex items-start space-x-3 p-3 rounded-md border cursor-pointer hover-elevate ${
                        isSelected ? "bg-primary/10 border-primary" : ""
                      }`}
                      onClick={toggleStore}
                      data-testid={`store-option-${store.link}`}
                    >
                      <Checkbox checked={isSelected} data-testid={`checkbox-store-${store.link}`} />
                      <div className="flex-1">
                        <div className="font-medium">{store.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {store.city && store.state
                            ? `${store.city}, ${store.state}`
                            : store.city || store.state || ""}
                        </div>
                        {store.address && (
                          <div className="text-xs text-muted-foreground">{store.address}</div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </ScrollArea>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} data-testid="button-cancel-search">
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
