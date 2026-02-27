import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Settings2 } from "lucide-react";
import { VoiceHubStoresTable } from "@/components/call-manager/voice-hub-stores-table";

type CallScenario = "cold_calls" | "follow_ups" | "recovery";

interface VoiceHubScenariosCardProps {
  activeScenario: CallScenario;
  allStates: string[];
  eligibleStores: any[];
  filteredStores: any[];
  handleSelectAll: () => void;
  handleStateChange: (state: string, checked: boolean) => void;
  handleToggleAgentFilter: (agentName: string) => void;
  handleToggleStore: (storeLink: string) => void;
  isCanadianProvince: (state: string) => boolean;
  leadsCount: number;
  onActiveScenarioChange: (value: CallScenario) => void;
  onSelectedStateFiltersChange: (value: string[]) => void;
  onShowCanadaOnlyChange: (value: boolean) => void;
  onSourceFilterChange: (value: "all" | "sheets" | "leads") => void;
  scenarioDescriptions: Record<CallScenario, string>;
  selectedAgentFilters: Set<string>;
  selectedStateFilters: string[];
  selectedStores: Set<string>;
  sheetsCount: number;
  showCanadaOnly: boolean;
  sourceFilter: "all" | "sheets" | "leads";
  stateCounts: Record<string, number>;
  storesLoading: boolean;
  uniqueAgents: Array<string | undefined>;
}

export function VoiceHubScenariosCard({
  activeScenario,
  allStates,
  eligibleStores,
  filteredStores,
  handleSelectAll,
  handleStateChange,
  handleToggleAgentFilter,
  handleToggleStore,
  isCanadianProvince,
  leadsCount,
  onActiveScenarioChange,
  onSelectedStateFiltersChange,
  onShowCanadaOnlyChange,
  onSourceFilterChange,
  scenarioDescriptions,
  selectedAgentFilters,
  selectedStateFilters,
  selectedStores,
  sheetsCount,
  showCanadaOnly,
  sourceFilter,
  stateCounts,
  storesLoading,
  uniqueAgents,
}: VoiceHubScenariosCardProps) {
  return (
    <Card data-testid="card-scenarios">
      <Tabs value={activeScenario} onValueChange={(v) => onActiveScenarioChange(v as CallScenario)}>
        <CardHeader>
          <TabsList className="grid w-full grid-cols-3" data-testid="tabs-scenarios">
            <TabsTrigger value="cold_calls" data-testid="tab-cold-calls">
              Cold Calls
            </TabsTrigger>
            <TabsTrigger value="follow_ups" data-testid="tab-follow-ups">
              Follow-Ups
            </TabsTrigger>
            <TabsTrigger value="recovery" data-testid="tab-recovery">
              Recovery
            </TabsTrigger>
          </TabsList>
        </CardHeader>

        <CardContent>
          <TabsContent value={activeScenario} className="mt-0">
            <div className="space-y-4">
              {/* Scenario Description */}
              <div className="bg-muted/50 rounded-lg p-4">
                <p className="text-sm text-muted-foreground" data-testid="text-scenario-description">
                  {scenarioDescriptions[activeScenario]}
                </p>
              </div>

              {/* Filters - only show for cold_calls */}
              {activeScenario === "cold_calls" && (
                <div className="flex gap-4">
                  {/* Agent Filter */}
                  {uniqueAgents.length > 0 && (
                    <div className="flex-1 border rounded-lg p-4">
                      <h3 className="text-sm font-medium mb-3">Filter by Agent</h3>
                      <div className="flex flex-wrap gap-2">
                        {uniqueAgents.map((agent) => {
                          const count = eligibleStores.filter((s) => s.agentName === agent).length;
                          return (
                            <div key={agent} className="flex items-center space-x-2">
                              <Checkbox
                                id={`agent-${agent}`}
                                checked={selectedAgentFilters.has(agent as string)}
                                onCheckedChange={() => handleToggleAgentFilter(agent as string)}
                                data-testid={`checkbox-agent-${agent}`}
                              />
                              <Label htmlFor={`agent-${agent}`} className="cursor-pointer">
                                {agent} ({count})
                              </Label>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* State Filter */}
                  {allStates.length > 0 && (
                    <div className="flex-1 border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-medium">Filter by State</h3>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" size="sm" data-testid="button-state-filter">
                              <Settings2 className="mr-2 h-4 w-4" />
                              {selectedStateFilters.length > 0 ? `${selectedStateFilters.length} state(s)` : "Select States"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent align="end" className="w-80">
                            <div className="space-y-4">
                              <div className="flex items-center justify-between">
                                <h4 className="font-medium">Filter by State</h4>
                                <div className="flex gap-2">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => onSelectedStateFiltersChange(allStates)}
                                    data-testid="button-select-all-states"
                                  >
                                    All
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => onSelectedStateFiltersChange([])}
                                    data-testid="button-clear-all-states"
                                  >
                                    None
                                  </Button>
                                </div>
                              </div>

                              {/* Canada Checkbox */}
                              <div className="flex items-center gap-2 p-2 bg-muted rounded-md">
                                <Checkbox
                                  id="canada-toggle"
                                  checked={showCanadaOnly}
                                  onCheckedChange={(checked) => {
                                    onShowCanadaOnlyChange(!!checked);
                                  }}
                                  data-testid="checkbox-canada-toggle"
                                />
                                <Label htmlFor="canada-toggle" className="text-sm cursor-pointer flex-1 font-medium">
                                  Canada
                                </Label>
                                <span className="text-xs text-muted-foreground">
                                  ({allStates.filter(isCanadianProvince).reduce((sum, state) => sum + (stateCounts[state] || 0), 0)} stores)
                                </span>
                              </div>

                              <ScrollArea className="h-64">
                                <div className="space-y-2">
                                  {allStates
                                    .filter((state) => (showCanadaOnly ? isCanadianProvince(state) : true))
                                    .map((state) => (
                                      <div key={state} className="flex items-center gap-2">
                                        <Checkbox
                                          id={`state-${state}`}
                                          checked={selectedStateFilters.includes(state)}
                                          onCheckedChange={(checked) => handleStateChange(state, checked as boolean)}
                                          data-testid={`checkbox-state-${state}`}
                                        />
                                        <Label htmlFor={`state-${state}`} className="text-sm cursor-pointer flex-1">
                                          {state}
                                        </Label>
                                        <span className="text-xs text-muted-foreground">({stateCounts[state] || 0})</span>
                                      </div>
                                    ))}
                                </div>
                              </ScrollArea>
                            </div>
                          </PopoverContent>
                        </Popover>
                      </div>
                      {selectedStateFilters.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {selectedStateFilters.map((state) => (
                            <Badge key={state} variant="secondary" className="text-xs">
                              {state} ({stateCounts[state] || 0})
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Source Filter (Sheets vs Leads) */}
                  <div className="border rounded-lg p-4">
                    <h3 className="text-sm font-medium mb-3">Contact Source</h3>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant={sourceFilter === "all" ? "default" : "outline"}
                        size="sm"
                        onClick={() => onSourceFilterChange("all")}
                        data-testid="button-source-all"
                      >
                        All ({eligibleStores.length})
                      </Button>
                      <Button
                        variant={sourceFilter === "sheets" ? "default" : "outline"}
                        size="sm"
                        onClick={() => onSourceFilterChange("sheets")}
                        data-testid="button-source-sheets"
                      >
                        Clients ({sheetsCount})
                      </Button>
                      <Button
                        variant={sourceFilter === "leads" ? "default" : "outline"}
                        size="sm"
                        onClick={() => onSourceFilterChange("leads")}
                        data-testid="button-source-leads"
                      >
                        Leads ({leadsCount})
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              <VoiceHubStoresTable
                filteredStores={filteredStores}
                selectedAgentFilters={selectedAgentFilters}
                selectedStores={selectedStores}
                storesLoading={storesLoading}
                onSelectAll={handleSelectAll}
                onToggleStore={handleToggleStore}
              />
            </div>
          </TabsContent>
        </CardContent>
      </Tabs>
    </Card>
  );
}
