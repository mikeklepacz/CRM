import { Loader2, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type StoreHoursEntry = {
  day: string;
  hours: string;
  isToday: boolean;
  isClosed: boolean;
};

type VoiceHubStore = {
  agentName?: string;
  businessName: string;
  hours?: string;
  hoursSchedule?: StoreHoursEntry[];
  isOpen: boolean;
  link: string;
  phone?: string;
  pocName?: string;
  source: "sheets" | "leads";
  state: string;
  status?: string;
  website?: string;
};

type VoiceHubStoresTableProps = {
  filteredStores: VoiceHubStore[];
  selectedAgentFilters: Set<string>;
  selectedStores: Set<string>;
  storesLoading: boolean;
  onSelectAll: () => void;
  onToggleStore: (link: string) => void;
};

export function VoiceHubStoresTable({
  filteredStores,
  selectedAgentFilters,
  selectedStores,
  storesLoading,
  onSelectAll,
  onToggleStore,
}: VoiceHubStoresTableProps) {
  if (storesLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (filteredStores.length === 0) {
    return (
      <div className="text-center py-12 bg-muted/20 rounded-lg">
        <p className="text-muted-foreground" data-testid="text-no-stores">
          {selectedAgentFilters.size > 0
            ? "No stores found for the selected agents."
            : "No eligible stores found for this scenario."}
        </p>
      </div>
    );
  }

  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">
              <Checkbox
                checked={selectedStores.size === filteredStores.length && filteredStores.length > 0}
                onCheckedChange={onSelectAll}
                data-testid="checkbox-select-all"
              />
            </TableHead>
            <TableHead>Business Name</TableHead>
            <TableHead>Source</TableHead>
            <TableHead>Agent</TableHead>
            <TableHead>Location</TableHead>
            <TableHead>Phone</TableHead>
            <TableHead>Hours</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredStores.map((store) => (
            <TableRow key={store.link} data-testid={`row-store-${store.link}`} className={store.status === "scheduled" ? "bg-primary/10 border-l-2 border-l-primary" : ""}>
              <TableCell>
                <Checkbox
                  checked={selectedStores.has(store.link)}
                  onCheckedChange={() => onToggleStore(store.link)}
                  data-testid={`checkbox-store-${store.link}`}
                />
              </TableCell>
              <TableCell className="font-medium" data-testid={`text-name-${store.link}`}>
                <div className="flex flex-col">
                  <span>{store.businessName}</span>
                  {store.pocName && (
                    <span className="text-xs text-muted-foreground">{store.pocName}</span>
                  )}
                  {store.website && (
                    <a href={store.website} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 hover:underline truncate max-w-[200px]">
                      {store.website}
                    </a>
                  )}
                </div>
              </TableCell>
              <TableCell data-testid={`text-source-${store.link}`}>
                <Badge variant={store.source === "leads" ? "default" : "secondary"}>
                  {store.source === "leads" ? "Lead" : "Client"}
                </Badge>
              </TableCell>
              <TableCell data-testid={`text-agent-${store.link}`}>
                <span className="text-sm">{store.agentName || "N/A"}</span>
              </TableCell>
              <TableCell data-testid={`text-location-${store.link}`}>
                <div className="flex items-center gap-1">
                  <MapPin className="h-3 w-3 text-muted-foreground" />
                  <span className="text-sm">{store.state}</span>
                </div>
              </TableCell>
              <TableCell data-testid={`text-phone-${store.link}`}>
                {store.phone || "N/A"}
              </TableCell>
              <TableCell data-testid={`text-hours-${store.link}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                    {store.hoursSchedule && store.hoursSchedule.length > 0 ? (
                      store.hoursSchedule.map((entry, idx) => (
                        <div key={idx} className={`flex items-center gap-2 text-sm ${entry.isToday ? "font-medium" : "text-muted-foreground"}`}>
                          <span className="w-20 flex-shrink-0">{entry.day}:</span>
                          <span className={entry.isClosed ? "text-destructive" : ""}>{entry.hours}</span>
                        </div>
                      ))
                    ) : (
                      <span className="text-sm text-muted-foreground">
                        {store.hours || "N/A"}
                      </span>
                    )}
                  </div>
                  <div className="flex-shrink-0">
                    {store.isOpen ? (
                      <Badge variant="default" className="bg-green-600" data-testid={`badge-open-${store.link}`}>
                        Open
                      </Badge>
                    ) : (
                      <Badge variant="destructive" data-testid={`badge-closed-${store.link}`}>
                        Closed
                      </Badge>
                    )}
                  </div>
                </div>
              </TableCell>
              <TableCell data-testid={`text-status-${store.link}`}>
                <Badge
                  variant={store.status === "scheduled" ? "default" : "outline"}
                  className={store.status === "scheduled" ? "bg-primary" : ""}
                >
                  {store.status === "scheduled" ? "Scheduled" : (store.status || "pending")}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
