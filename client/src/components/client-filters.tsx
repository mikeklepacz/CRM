import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { X, Search } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface ClientFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  state: string;
  onStateChange: (value: string) => void;
  status: string;
  onStatusChange: (value: string) => void;
  assignedAgent: string;
  onAssignedAgentChange: (value: string) => void;
  inactivityDays: string;
  onInactivityDaysChange: (value: string) => void;
  onClearFilters: () => void;
  agents?: Array<{ id: string; firstName: string | null; lastName: string | null; email: string | null }>;
  states?: string[];
  showAgentFilter?: boolean;
  statusOptions?: string[];
  statusColors?: { [key: string]: { background: string; text: string } };
}

export function ClientFilters({
  search,
  onSearchChange,
  state,
  onStateChange,
  status,
  onStatusChange,
  assignedAgent,
  onAssignedAgentChange,
  inactivityDays,
  onInactivityDaysChange,
  onClearFilters,
  agents = [],
  states = [],
  showAgentFilter = true,
  statusOptions = [],
  statusColors = {},
}: ClientFiltersProps) {
  const hasActiveFilters = search || state !== "all" || status !== "all" || assignedAgent !== "all" || inactivityDays !== "all";

  // State abbreviation to full name mapping
  const STATE_NAMES: Record<string, string> = {
    'AL': 'Alabama', 'AK': 'Alaska', 'AZ': 'Arizona', 'AR': 'Arkansas',
    'CA': 'California', 'CO': 'Colorado', 'CT': 'Connecticut', 'DE': 'Delaware',
    'FL': 'Florida', 'GA': 'Georgia', 'HI': 'Hawaii', 'ID': 'Idaho',
    'IL': 'Illinois', 'IN': 'Indiana', 'IA': 'Iowa', 'KS': 'Kansas',
    'KY': 'Kentucky', 'LA': 'Louisiana', 'ME': 'Maine', 'MD': 'Maryland',
    'MA': 'Massachusetts', 'MI': 'Michigan', 'MN': 'Minnesota', 'MS': 'Mississippi',
    'MO': 'Missouri', 'MT': 'Montana', 'NE': 'Nebraska', 'NV': 'Nevada',
    'NH': 'New Hampshire', 'NJ': 'New Jersey', 'NM': 'New Mexico', 'NY': 'New York',
    'NC': 'North Carolina', 'ND': 'North Dakota', 'OH': 'Ohio', 'OK': 'Oklahoma',
    'OR': 'Oregon', 'PA': 'Pennsylvania', 'RI': 'Rhode Island', 'SC': 'South Carolina',
    'SD': 'South Dakota', 'TN': 'Tennessee', 'TX': 'Texas', 'UT': 'Utah',
    'VT': 'Vermont', 'VA': 'Virginia', 'WA': 'Washington', 'WV': 'West Virginia',
    'WI': 'Wisconsin', 'WY': 'Wyoming', 'DC': 'District of Columbia',
    // Canadian provinces
    'AB': 'Alberta', 'BC': 'British Columbia', 'MB': 'Manitoba', 'NB': 'New Brunswick',
    'NL': 'Newfoundland and Labrador', 'NS': 'Nova Scotia', 'ON': 'Ontario',
    'PE': 'Prince Edward Island', 'QC': 'Quebec', 'SK': 'Saskatchewan',
    'NT': 'Northwest Territories', 'NU': 'Nunavut', 'YT': 'Yukon'
  };

  const getStateName = (abbr: string) => STATE_NAMES[abbr] || abbr;

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search clients..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10"
          data-testid="input-search-clients"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {states.length > 0 && (
          <div className="space-y-2">
            <Label htmlFor="filter-state">State</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  className="w-full justify-between font-normal"
                  data-testid="select-filter-state"
                >
                  {state === "all" ? "All States" : getStateName(state)}
                  <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[300px] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Search states..." />
                  <CommandList>
                    <CommandEmpty>No state found.</CommandEmpty>
                    <CommandGroup>
                      <CommandItem
                        value="all"
                        onSelect={() => onStateChange("all")}
                        data-testid="state-option-all"
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            state === "all" ? "opacity-100" : "opacity-0"
                          )}
                        />
                        All States
                      </CommandItem>
                      {states.map((s) => (
                        <CommandItem
                          key={s}
                          value={getStateName(s)}
                          onSelect={() => onStateChange(s)}
                          data-testid={`state-option-${s.toLowerCase()}`}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              state === s ? "opacity-100" : "opacity-0"
                            )}
                          />
                          {getStateName(s)}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="filter-status">Status</Label>
          <Select value={status} onValueChange={onStatusChange}>
            <SelectTrigger id="filter-status" data-testid="select-filter-status">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {statusOptions.map((statusOption) => {
                const colors = statusColors[statusOption];
                return (
                  <SelectItem 
                    key={statusOption}
                    value={statusOption}
                    data-testid={`status-filter-option-${statusOption.toLowerCase().replace(/[^a-z]+/g, '-')}`}
                    style={{
                      backgroundColor: colors?.background || 'transparent',
                      color: colors?.text || 'inherit',
                    }}
                  >
                    {statusOption}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>

        {showAgentFilter && agents.length > 0 && (
          <div className="space-y-2">
            <Label htmlFor="filter-agent">Assigned Agent</Label>
            <Select value={assignedAgent} onValueChange={onAssignedAgentChange}>
              <SelectTrigger id="filter-agent" data-testid="select-filter-agent">
                <SelectValue placeholder="All agents" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Agents</SelectItem>
                <SelectItem value="unassigned">Unassigned</SelectItem>
                {agents.map((agent) => {
                  const name = agent.firstName && agent.lastName 
                    ? `${agent.firstName} ${agent.lastName}` 
                    : agent.email || 'Unknown';
                  return (
                    <SelectItem key={agent.id} value={agent.id}>{name}</SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="filter-inactivity">Inactivity</Label>
          <Select value={inactivityDays} onValueChange={onInactivityDaysChange}>
            <SelectTrigger id="filter-inactivity" data-testid="select-filter-inactivity">
              <SelectValue placeholder="All clients" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Clients</SelectItem>
              <SelectItem value="90">Not ordered in 90 days</SelectItem>
              <SelectItem value="180">Not ordered in 180 days</SelectItem>
              <SelectItem value="365">Not ordered in 365 days</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {hasActiveFilters && (
        <Button
          variant="outline"
          size="sm"
          onClick={onClearFilters}
          data-testid="button-clear-filters"
        >
          <X className="h-4 w-4 mr-2" />
          Clear Filters
        </Button>
      )}
    </div>
  );
}
