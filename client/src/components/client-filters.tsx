import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { X, Search } from "lucide-react";

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
            <Select value={state} onValueChange={onStateChange}>
              <SelectTrigger id="filter-state" data-testid="select-filter-state">
                <SelectValue placeholder="All states" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All States</SelectItem>
                {states.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
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
