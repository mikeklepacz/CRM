import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PhoneCall, Clock, AlertCircle, CheckCircle2, Loader2, MapPin, Calendar } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";

interface ElevenLabsAgent {
  id: string;
  agent_id: string;
  name: string;
  phone_number_id: string;
}

interface HoursScheduleEntry {
  day: string;
  hours: string;
  isToday: boolean;
  isClosed: boolean;
}

interface EligibleStore {
  link: string;
  businessName: string;
  state: string;
  phone: string;
  hours: string;
  hoursSchedule?: HoursScheduleEntry[];
  isOpen: boolean;
  agentName?: string;
  status?: string;
  lastContactDate?: string;
  followUpDate?: string;
  pocName?: string;
}

interface CallQueueStats {
  activeCalls: number;
  queuedCalls: number;
  completedToday: number;
  failedToday: number;
  campaigns: any[];
}

type CallScenario = 'cold_calls' | 'follow_ups' | 'recovery';

export default function CallManager() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const [activeScenario, setActiveScenario] = useState<CallScenario>('cold_calls');
  const [selectedStores, setSelectedStores] = useState<Set<string>>(new Set());
  const [selectedAgent, setSelectedAgent] = useState<string>("");
  const [schedulingMode, setSchedulingMode] = useState<'immediate' | 'scheduled' | 'auto'>('immediate');
  const [scheduledTime, setScheduledTime] = useState<string>("");
  const [selectedAgentFilters, setSelectedAgentFilters] = useState<Set<string>>(new Set());

  // Clear selections when scenario changes
  useEffect(() => {
    setSelectedStores(new Set());
    setSelectedAgentFilters(new Set());
  }, [activeScenario]);

  // Redirect if user doesn't have voice access
  useEffect(() => {
    if (user && user.role !== 'admin' && !user.hasVoiceAccess) {
      setLocation('/');
    }
  }, [user, setLocation]);

  // Check if user should have access
  const hasAccess = user?.role === 'admin' || user?.hasVoiceAccess;

  // Fetch available agents
  const { data: agents = [], isLoading: agentsLoading } = useQuery<ElevenLabsAgent[]>({
    queryKey: ['/api/elevenlabs/agents'],
    enabled: hasAccess,
  });

  // Fetch eligible stores for current scenario
  const { data: eligibleStores = [], isLoading: storesLoading, refetch: refetchStores } = useQuery<EligibleStore[]>({
    queryKey: ['/api/elevenlabs/eligible-stores', activeScenario],
    enabled: hasAccess,
  });

  // Fetch call queue status
  const { data: callQueueStats } = useQuery<CallQueueStats>({
    queryKey: ['/api/elevenlabs/call-queue'],
    enabled: hasAccess,
    refetchInterval: 5000, // Poll every 5 seconds for real-time updates
  });

  // Batch call mutation
  const batchCallMutation = useMutation({
    mutationFn: async (data: { agent_record_id: string; agent_id: string; phone_number_id: string; stores: string[]; store_data?: any[]; scenario?: string; scheduled_for?: string; auto_schedule?: boolean }) => {
      return apiRequest('POST', '/api/elevenlabs/batch-call', data);
    },
    onSuccess: () => {
      toast({
        title: "Calls Queued",
        description: `${selectedStores.size} calls have been queued successfully.`,
      });
      setSelectedStores(new Set());
      queryClient.invalidateQueries({ queryKey: ['/api/elevenlabs/call-queue'] });
      refetchStores();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to queue calls",
        variant: "destructive",
      });
    },
  });

  if (!hasAccess) {
    return null;
  }

  // Handle select all/none
  const handleSelectAll = () => {
    if (selectedStores.size === filteredStores.length) {
      setSelectedStores(new Set());
    } else {
      setSelectedStores(new Set(filteredStores.map(s => s.link)));
    }
  };

  // Handle individual checkbox
  const handleToggleStore = (storeLink: string) => {
    const newSelected = new Set(selectedStores);
    if (newSelected.has(storeLink)) {
      newSelected.delete(storeLink);
    } else {
      newSelected.add(storeLink);
    }
    setSelectedStores(newSelected);
  };

  // Handle batch call submission
  const handleBatchCall = () => {
    if (!selectedAgent || selectedStores.size === 0) {
      toast({
        title: "Missing Information",
        description: "Please select an agent and at least one store.",
        variant: "destructive",
      });
      return;
    }

    if (schedulingMode === 'scheduled' && !scheduledTime) {
      toast({
        title: "Missing Schedule",
        description: "Please select a date and time for scheduled calls.",
        variant: "destructive",
      });
      return;
    }

    // Runtime validation: ensure scheduled time is in the future
    if (schedulingMode === 'scheduled' && scheduledTime) {
      const scheduledDate = new Date(scheduledTime);
      if (scheduledDate <= new Date()) {
        toast({
          title: "Invalid Schedule",
          description: "Scheduled time must be in the future.",
          variant: "destructive",
        });
        return;
      }
    }

    const agent = agents.find(a => a.id === selectedAgent);
    if (!agent) return;

    // Build payload with store links for auto-scheduling
    const selectedStoreData = eligibleStores.filter(store => selectedStores.has(store.link));

    const payload: { agent_record_id: string; agent_id: string; phone_number_id: string; stores: string[]; store_data?: any[]; scenario?: string; scheduled_for?: string; auto_schedule?: boolean } = {
      agent_record_id: agent.id,
      agent_id: agent.agent_id,
      phone_number_id: agent.phone_number_id,
      stores: Array.from(selectedStores),
      scenario: activeScenario,
    };

    // Include full store data for auto-scheduling
    if (schedulingMode === 'auto') {
      payload.auto_schedule = true;
      payload.store_data = selectedStoreData;
    } else if (schedulingMode === 'scheduled' && scheduledTime) {
      payload.scheduled_for = new Date(scheduledTime).toISOString();
    }

    batchCallMutation.mutate(payload);
  };

  const scenarioDescriptions: Record<CallScenario, string> = {
    cold_calls: "Claimed stores ready for outreach. Filter by agent to see specific agent's claimed stores.",
    follow_ups: "Stores marked as 'Interested' with scheduled follow-up dates approaching.",
    recovery: "Leads from other agents that have been inactive for 30+ days. Re-engagement opportunities.",
  };

  // Get unique agents from stores
  const uniqueAgents = Array.from(new Set(eligibleStores.map(s => s.agentName).filter(Boolean)));

  // Filter stores by selected agents (if any filters are active)
  const filteredStores = selectedAgentFilters.size === 0 
    ? eligibleStores 
    : eligibleStores.filter(store => store.agentName && selectedAgentFilters.has(store.agentName));

  // Toggle agent filter
  const handleToggleAgentFilter = (agentName: string) => {
    const newFilters = new Set(selectedAgentFilters);
    if (newFilters.has(agentName)) {
      newFilters.delete(agentName);
    } else {
      newFilters.add(agentName);
    }
    setSelectedAgentFilters(newFilters);
  };

  // Use stats from API
  const queueStats = {
    active: callQueueStats?.activeCalls || 0,
    queued: callQueueStats?.queuedCalls || 0,
    completed: callQueueStats?.completedToday || 0,
    failed: callQueueStats?.failedToday || 0,
  };

  return (
    <div className="h-full overflow-auto p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight" data-testid="text-call-manager-title">
            Call Manager
          </h1>
          <p className="text-muted-foreground mt-2" data-testid="text-call-manager-description">
            Intelligently queue AI voice calls based on calling scenarios
          </p>
        </div>

        {/* Real-time Queue Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card data-testid="card-stat-active">
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Calls</CardTitle>
              <PhoneCall className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-active-count">{queueStats.active}</div>
              <p className="text-xs text-muted-foreground">Currently in progress</p>
            </CardContent>
          </Card>

          <Card data-testid="card-stat-queued">
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Queued</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-queued-count">{queueStats.queued}</div>
              <p className="text-xs text-muted-foreground">Waiting to dial</p>
            </CardContent>
          </Card>

          <Card data-testid="card-stat-completed">
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-completed-count">{queueStats.completed}</div>
              <p className="text-xs text-muted-foreground">Successfully finished</p>
            </CardContent>
          </Card>

          <Card data-testid="card-stat-failed">
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Failed</CardTitle>
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-failed-count">{queueStats.failed}</div>
              <p className="text-xs text-muted-foreground">Needs attention</p>
            </CardContent>
          </Card>
        </div>

        {/* Agent Selector and Batch Actions */}
        <Card data-testid="card-batch-controls">
          <CardHeader>
            <CardTitle>Batch Calling</CardTitle>
            <CardDescription>Select an AI agent and queue multiple calls at once</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-sm font-medium mb-2 block">Select Agent</label>
                  <Select value={selectedAgent} onValueChange={(value) => {
                    console.log('[CallManager] Agent selected:', value);
                    setSelectedAgent(value);
                  }} disabled={agentsLoading}>
                    <SelectTrigger data-testid="select-agent">
                      <SelectValue placeholder={agentsLoading ? "Loading agents..." : "Choose an agent"}>
                        {selectedAgent && agents.find(a => a.id === selectedAgent)?.name}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {agents.map(agent => (
                        <SelectItem key={agent.id} value={agent.id} data-testid={`select-agent-${agent.id}`}>
                          {agent.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Scheduling</label>
                  <RadioGroup value={schedulingMode} onValueChange={(v) => setSchedulingMode(v as 'immediate' | 'scheduled' | 'auto')} data-testid="radio-scheduling-mode">
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="immediate" id="immediate" data-testid="radio-immediate" />
                      <Label htmlFor="immediate">Call Immediately</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="scheduled" id="scheduled" data-testid="radio-scheduled" />
                      <Label htmlFor="scheduled">Schedule for Later</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="auto" id="auto" data-testid="radio-auto" />
                      <Label htmlFor="auto">Auto Schedule (Smart Hours)</Label>
                    </div>
                  </RadioGroup>
                </div>
              </div>

              {schedulingMode === 'scheduled' && (
                <div>
                  <label className="text-sm font-medium mb-2 block">Schedule Date & Time</label>
                  <Input
                    type="datetime-local"
                    value={scheduledTime}
                    onChange={(e) => setScheduledTime(e.target.value)}
                    step="300"
                    min={(() => {
                      const now = new Date();
                      // Adjust for timezone offset to get local time string
                      const offset = now.getTimezoneOffset();
                      const localTime = new Date(now.getTime() - offset * 60 * 1000);
                      return localTime.toISOString().slice(0, 16);
                    })()}
                    data-testid="input-scheduled-time"
                  />
                </div>
              )}

              {schedulingMode === 'auto' && (
                <div className="rounded-md bg-muted p-3">
                  <p className="text-sm text-muted-foreground">
                    Calls will be automatically scheduled during each store's business hours based on their timezone and operating schedule.
                  </p>
                </div>
              )}

              <div className="flex justify-end">
                <Button
                  onClick={handleBatchCall}
                  disabled={selectedStores.size === 0 || !selectedAgent || batchCallMutation.isPending}
                  data-testid="button-queue-calls"
                >
                  {batchCallMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Queueing...
                    </>
                  ) : schedulingMode === 'scheduled' ? (
                    <>
                      <Calendar className="h-4 w-4 mr-2" />
                      Schedule {selectedStores.size > 0 ? `${selectedStores.size} ` : ''}Calls
                    </>
                  ) : schedulingMode === 'auto' ? (
                    <>
                      <Clock className="h-4 w-4 mr-2" />
                      Auto Schedule {selectedStores.size > 0 ? `${selectedStores.size} ` : ''}Calls
                    </>
                  ) : (
                    <>
                      <PhoneCall className="h-4 w-4 mr-2" />
                      Queue {selectedStores.size > 0 ? `${selectedStores.size} ` : ''}Calls
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Scenario Tabs */}
        <Card data-testid="card-scenarios">
          <Tabs value={activeScenario} onValueChange={(v) => setActiveScenario(v as CallScenario)}>
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

                  {/* Agent Filters - only show for cold_calls */}
                  {activeScenario === 'cold_calls' && uniqueAgents.length > 0 && (
                    <div className="border rounded-lg p-4">
                      <h3 className="text-sm font-medium mb-3">Filter by Agent</h3>
                      <div className="flex flex-wrap gap-2">
                        {uniqueAgents.map((agent) => {
                          const count = eligibleStores.filter(s => s.agentName === agent).length;
                          return (
                            <div key={agent} className="flex items-center space-x-2">
                              <Checkbox
                                id={`agent-${agent}`}
                                checked={selectedAgentFilters.has(agent)}
                                onCheckedChange={() => handleToggleAgentFilter(agent)}
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

                  {/* Stores Table */}
                  {storesLoading ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                  ) : filteredStores.length === 0 ? (
                    <div className="text-center py-12 bg-muted/20 rounded-lg">
                      <p className="text-muted-foreground" data-testid="text-no-stores">
                        {selectedAgentFilters.size > 0 
                          ? "No stores found for the selected agents." 
                          : "No eligible stores found for this scenario."}
                      </p>
                    </div>
                  ) : (
                    <div className="border rounded-lg">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-12">
                              <Checkbox
                                checked={selectedStores.size === filteredStores.length && filteredStores.length > 0}
                                onCheckedChange={handleSelectAll}
                                data-testid="checkbox-select-all"
                              />
                            </TableHead>
                            <TableHead>Business Name</TableHead>
                            <TableHead>Agent</TableHead>
                            <TableHead>Location</TableHead>
                            <TableHead>Phone</TableHead>
                            <TableHead>Hours</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredStores.map((store) => (
                            <TableRow key={store.link} data-testid={`row-store-${store.link}`}>
                              <TableCell>
                                <Checkbox
                                  checked={selectedStores.has(store.link)}
                                  onCheckedChange={() => handleToggleStore(store.link)}
                                  data-testid={`checkbox-store-${store.link}`}
                                />
                              </TableCell>
                              <TableCell className="font-medium" data-testid={`text-name-${store.link}`}>
                                {store.businessName}
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
                                        <div key={idx} className={`flex items-center gap-2 text-sm ${entry.isToday ? 'font-medium' : 'text-muted-foreground'}`}>
                                          <span className="w-20 flex-shrink-0">{entry.day}:</span>
                                          <span className={entry.isClosed ? 'text-destructive' : ''}>{entry.hours}</span>
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
                                <Badge variant="outline">{store.status || "Unclaimed"}</Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>
              </TabsContent>
            </CardContent>
          </Tabs>
        </Card>
      </div>
    </div>
  );
}
