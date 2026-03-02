import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface AnalyticsAgent {
  agent_id: string;
  name: string;
}

type AnalyticsFiltersProps = {
  agents: AnalyticsAgent[];
  analyticsAgentFilter: string;
  analyticsDateFilter: string;
  analyticsInterestFilter: string;
  analyticsStatusFilter: string;
  onAgentFilterChange: (value: string) => void;
  onDateFilterChange: (value: string) => void;
  onInterestFilterChange: (value: string) => void;
  onStatusFilterChange: (value: string) => void;
};

export function AnalyticsFilters({
  agents,
  analyticsAgentFilter,
  analyticsDateFilter,
  analyticsInterestFilter,
  analyticsStatusFilter,
  onAgentFilterChange,
  onDateFilterChange,
  onInterestFilterChange,
  onStatusFilterChange,
}: AnalyticsFiltersProps) {
  return (
    <div className="flex flex-wrap gap-4 mb-6 p-4 bg-muted/20 rounded-lg" data-testid="analytics-filters">
      <div className="flex-1 min-w-[200px]">
        <Label htmlFor="analytics-agent-filter" className="text-sm font-medium">
          AI Agent
        </Label>
        <Select value={analyticsAgentFilter} onValueChange={onAgentFilterChange}>
          <SelectTrigger id="analytics-agent-filter" data-testid="select-analytics-agent">
            <SelectValue placeholder="All Agents" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Agents</SelectItem>
            {agents.map((agent) => (
              <SelectItem key={agent.agent_id} value={agent.agent_id}>
                {agent.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex-1 min-w-[200px]">
        <Label htmlFor="analytics-date-filter" className="text-sm font-medium">
          Date Range
        </Label>
        <Select value={analyticsDateFilter} onValueChange={onDateFilterChange}>
          <SelectTrigger id="analytics-date-filter" data-testid="select-analytics-date">
            <SelectValue placeholder="All Time" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Time</SelectItem>
            <SelectItem value="today">Today</SelectItem>
            <SelectItem value="7days">Last 7 Days</SelectItem>
            <SelectItem value="30days">Last 30 Days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex-1 min-w-[200px]">
        <Label htmlFor="analytics-status-filter" className="text-sm font-medium">
          Call Status
        </Label>
        <Select value={analyticsStatusFilter} onValueChange={onStatusFilterChange}>
          <SelectTrigger id="analytics-status-filter" data-testid="select-analytics-status">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="successful">Successful</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex-1 min-w-[200px]">
        <Label htmlFor="analytics-interest-filter" className="text-sm font-medium">
          Interest Level
        </Label>
        <Select value={analyticsInterestFilter} onValueChange={onInterestFilterChange}>
          <SelectTrigger id="analytics-interest-filter" data-testid="select-analytics-interest">
            <SelectValue placeholder="All Levels" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Levels</SelectItem>
            <SelectItem value="hot">Hot</SelectItem>
            <SelectItem value="warm">Warm</SelectItem>
            <SelectItem value="cold">Cold</SelectItem>
            <SelectItem value="not_interested">Not Interested</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
