import { useAgentFilter } from '@/contexts/agent-filter-context';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Users } from 'lucide-react';

export function AdminAgentToolbar() {
  const { selectedAgentIds, setSelectedAgentIds, availableAgents, isLoadingAgents, currentUser } = useAgentFilter();

  // Only show for admins
  if (currentUser?.role !== 'admin') {
    return null;
  }

  if (isLoadingAgents) {
    return (
      <Card className="p-4 mb-6">
        <div className="text-sm text-muted-foreground">Loading agents...</div>
      </Card>
    );
  }

  const handleToggleAgent = (agentId: string, checked: boolean) => {
    if (checked) {
      setSelectedAgentIds([...selectedAgentIds, agentId]);
    } else {
      setSelectedAgentIds(selectedAgentIds.filter(id => id !== agentId));
    }
  };

  const handleToggleAll = (checked: boolean) => {
    if (checked) {
      setSelectedAgentIds(availableAgents.map(a => a.id));
    } else {
      // Deselect all except current user
      setSelectedAgentIds([currentUser!.id]);
    }
  };

  const allSelected = availableAgents.length > 0 && selectedAgentIds.length === availableAgents.length;
  const someSelected = selectedAgentIds.length > 0 && selectedAgentIds.length < availableAgents.length;

  const getAgentDisplayName = (agent: typeof availableAgents[0]) => {
    return agent.agentName || `${agent.firstName} ${agent.lastName}`.trim() || agent.id;
  };

  return (
    <Card className="p-4 mb-6" data-testid="admin-agent-toolbar">
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          <h3 className="text-sm font-medium">View Data For:</h3>
          <Badge variant="secondary" className="ml-auto" data-testid="selected-count">
            {selectedAgentIds.length} selected
          </Badge>
        </div>

        <div className="flex flex-wrap gap-4">
          {/* Select All checkbox */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="select-all-agents"
              checked={allSelected}
              onCheckedChange={handleToggleAll}
              data-testid="checkbox-all-agents"
              className={someSelected ? "data-[state=checked]:bg-primary/50" : ""}
            />
            <Label
              htmlFor="select-all-agents"
              className="text-sm font-medium cursor-pointer"
            >
              All Agents
            </Label>
          </div>

          {/* Individual agent checkboxes */}
          {availableAgents.map((agent) => {
            const isCurrentUser = agent.id === currentUser?.id;
            const displayName = getAgentDisplayName(agent);
            
            return (
              <div key={agent.id} className="flex items-center space-x-2">
                <Checkbox
                  id={`agent-${agent.id}`}
                  checked={selectedAgentIds.includes(agent.id)}
                  onCheckedChange={(checked) => handleToggleAgent(agent.id, !!checked)}
                  data-testid={`checkbox-agent-${agent.id}`}
                />
                <Label
                  htmlFor={`agent-${agent.id}`}
                  className="text-sm font-normal cursor-pointer"
                >
                  {displayName}
                  {isCurrentUser && <span className="text-xs text-muted-foreground ml-1">(You)</span>}
                </Label>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
}
