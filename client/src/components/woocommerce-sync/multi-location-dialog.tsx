import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Search } from "lucide-react";

type StoreSearchResult = {
  link: string;
  name: string;
  dba?: string;
  city?: string;
  state?: string;
  address?: string;
  agentName?: string;
};

type Props = {
  open: boolean;
  searchTerm: string;
  searchResults: StoreSearchResult[];
  selectedStoreLinks: Set<string>;
  agentName: string;
  searchPending: boolean;
  assignPending: boolean;
  onOpenChange: (open: boolean) => void;
  onSearchTermChange: (value: string) => void;
  onSearch: () => void;
  onToggleStore: (link: string) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onAgentNameChange: (value: string) => void;
  onAssign: () => void;
  onReset: () => void;
};

export function MultiLocationDialog({
  open,
  searchTerm,
  searchResults,
  selectedStoreLinks,
  agentName,
  searchPending,
  assignPending,
  onOpenChange,
  onSearchTermChange,
  onSearch,
  onToggleStore,
  onSelectAll,
  onDeselectAll,
  onAgentNameChange,
  onAssign,
  onReset,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Multi-Location Store Assignment</DialogTitle>
          <DialogDescription>
            Search for stores by name or DBA (company name), then assign an agent to all matching locations at once.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex gap-2">
            <Input
              placeholder="Search by store name or DBA (e.g., 'Bud Mart')"
              value={searchTerm}
              onChange={(e) => onSearchTermChange(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && onSearch()}
              data-testid="input-multi-location-search"
            />
            <Button
              onClick={onSearch}
              disabled={searchPending || !searchTerm.trim()}
              data-testid="button-search-stores"
            >
              {searchPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Searching...
                </>
              ) : (
                <>
                  <Search className="h-4 w-4 mr-2" />
                  Search
                </>
              )}
            </Button>
          </div>

          {searchResults.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">Found {searchResults.length} store(s)</p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={onSelectAll} data-testid="button-select-all-stores">
                    Select All
                  </Button>
                  <Button variant="outline" size="sm" onClick={onDeselectAll} data-testid="button-deselect-all-stores">
                    Deselect All
                  </Button>
                </div>
              </div>

              <div className="border rounded-md max-h-96 overflow-y-auto">
                <Table>
                  <TableHeader className="sticky top-0 bg-background">
                    <TableRow>
                      <TableHead className="w-12">Select</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>DBA</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Current Agent</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {searchResults.map((store) => (
                      <TableRow key={store.link}>
                        <TableCell>
                          <Checkbox
                            checked={selectedStoreLinks.has(store.link)}
                            onCheckedChange={() => onToggleStore(store.link)}
                            data-testid={`checkbox-store-${store.link}`}
                          />
                        </TableCell>
                        <TableCell className="font-medium">{store.name}</TableCell>
                        <TableCell>{store.dba || "-"}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {store.city && store.state ? `${store.city}, ${store.state}` : store.address || "-"}
                        </TableCell>
                        <TableCell>
                          {store.agentName ? <Badge variant="default">{store.agentName}</Badge> : <Badge variant="outline">Unassigned</Badge>}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bulk-agent-name">Agent Name</Label>
                <Input
                  id="bulk-agent-name"
                  placeholder="Enter agent name (e.g., 'John Smith')"
                  value={agentName}
                  onChange={(e) => onAgentNameChange(e.target.value)}
                  data-testid="input-bulk-agent-name"
                />
                <p className="text-sm text-muted-foreground">Selected: {selectedStoreLinks.size} store(s)</p>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={onReset}>
                  Cancel
                </Button>
                <Button
                  onClick={onAssign}
                  disabled={assignPending || selectedStoreLinks.size === 0 || !agentName.trim()}
                  data-testid="button-execute-bulk-assign"
                >
                  {assignPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Assigning...
                    </>
                  ) : (
                    `Assign to ${selectedStoreLinks.size} Store(s)`
                  )}
                </Button>
              </div>
            </div>
          )}

          {searchResults.length === 0 && searchTerm && !searchPending && (
            <div className="text-center py-8 text-muted-foreground">
              <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No stores found matching "{searchTerm}"</p>
              <p className="text-sm mt-1">Try a different search term</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
