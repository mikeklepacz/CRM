import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface CallHistoryAgent {
  agent_id: string;
  name: string;
}

type CallHistoryFiltersProps = {
  agents: CallHistoryAgent[];
  historyAgentFilter: string;
  historyCampaignFilter: string;
  historyEndDate: string;
  historySearchQuery: string;
  historyStartDate: string;
  historyStatusFilter: string;
  onAgentFilterChange: (value: string) => void;
  onCampaignFilterChange: (value: string) => void;
  onEndDateChange: (value: string) => void;
  onSearchQueryChange: (value: string) => void;
  onStartDateChange: (value: string) => void;
  onStatusFilterChange: (value: string) => void;
};

export function CallHistoryFilters({
  agents,
  historyAgentFilter,
  historyCampaignFilter,
  historyEndDate,
  historySearchQuery,
  historyStartDate,
  historyStatusFilter,
  onAgentFilterChange,
  onCampaignFilterChange,
  onEndDateChange,
  onSearchQueryChange,
  onStartDateChange,
  onStatusFilterChange,
}: CallHistoryFiltersProps) {
  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Start Date</Label>
          <Input
            type="date"
            value={historyStartDate}
            onChange={(e) => onStartDateChange(e.target.value)}
            className="h-8 text-xs"
            data-testid="input-history-start-date"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">End Date</Label>
          <Input
            type="date"
            value={historyEndDate}
            onChange={(e) => onEndDateChange(e.target.value)}
            className="h-8 text-xs"
            data-testid="input-history-end-date"
          />
        </div>

        <div className="space-y-1">
          <Label className="text-xs">Status</Label>
          <Select value={historyStatusFilter} onValueChange={onStatusFilterChange}>
            <SelectTrigger className="h-8 text-xs" data-testid="select-history-status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
              <SelectItem value="call-ended-by-assistant">Ended by Assistant</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label className="text-xs">Campaign</Label>
          <Select value={historyCampaignFilter} onValueChange={onCampaignFilterChange}>
            <SelectTrigger className="h-8 text-xs" data-testid="select-history-campaign">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="cold_calls">Cold Calls</SelectItem>
              <SelectItem value="follow_ups">Follow-Ups</SelectItem>
              <SelectItem value="recovery">Recovery</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label className="text-xs">Agent ID</Label>
          <Select value={historyAgentFilter} onValueChange={onAgentFilterChange}>
            <SelectTrigger className="h-8 text-xs" data-testid="select-history-agent">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              {agents.map((agent) => (
                <SelectItem key={agent.agent_id} value={agent.agent_id}>
                  {agent.name} ({agent.agent_id.slice(0, 8)})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="w-full md:w-96">
        <Input
          placeholder="Search store name, POC name, or agent ID..."
          value={historySearchQuery}
          onChange={(e) => onSearchQueryChange(e.target.value)}
          className="h-8 text-xs"
          data-testid="input-history-search"
        />
      </div>
    </>
  );
}
