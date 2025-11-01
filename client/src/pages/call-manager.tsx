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
  agent_id: string;
  name: string;
  phone_number_id: string;
}

interface EligibleStore {
  link: string;
  businessName: string;
  state: string;
  phone: string;
  hours: string;
  isOpen: boolean;
  claimedBy?: string;
  status?: string;
  lastContactDate?: string;
  followUpDate?: string;
  pocName?: string;
}

interface QueuedCall {
  id: number;
  storeName: string;
  phoneNumber: string;
  status: string;
  createdAt: string;
}

type CallScenario = 'cold_calls' | 'follow_ups' | 'recovery';

export default function CallManager() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const [activeScenario, setActiveScenario] = useState<CallScenario>('cold_calls');
  const [selectedStores, setSelectedStores] = useState<Set<string>>(new Set());
  const [selectedAgent, setSelectedAgent] = useState<string>("");
  const [schedulingMode, setSchedulingMode] = useState<'immediate' | 'scheduled'>('immediate');
  const [scheduledTime, setScheduledTime] = useState<string>("");

  // Clear selections when scenario changes
  useEffect(() => {
    setSelectedStores(new Set());
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
  const { data: callQueue = [] } = useQuery<QueuedCall[]>({
    queryKey: ['/api/elevenlabs/call-queue'],
    enabled: hasAccess,
    refetchInterval: 5000, // Poll every 5 seconds for real-time updates
  });

  // Batch call mutation
  const batchCallMutation = useMutation({
    mutationFn: async (data: { agent_id: string; phone_number_id: string; stores: string[]; scheduled_for?: string }) => {
      return apiRequest('/api/elevenlabs/batch-call', {
        method: 'POST',
        body: JSON.stringify(data),
      });
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
    if (selectedStores.size === eligibleStores.length) {
      setSelectedStores(new Set());
    } else {
      setSelectedStores(new Set(eligibleStores.map(s => s.link)));
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

    const agent = agents.find(a => a.agent_id === selectedAgent);
    if (!agent) return;

    const payload: { agent_id: string; phone_number_id: string; stores: string[]; scheduled_for?: string } = {
      agent_id: agent.agent_id,
      phone_number_id: agent.phone_number_id,
      stores: Array.from(selectedStores),
    };

    if (schedulingMode === 'scheduled' && scheduledTime) {
      payload.scheduled_for = new Date(scheduledTime).toISOString();
    }

    batchCallMutation.mutate(payload);
  };

  const scenarioDescriptions: Record<CallScenario, string> = {
    cold_calls: "Claimed stores without any prior contact or POC. Fresh leads ready for first outreach.",
    follow_ups: "Stores marked as 'Interested' with scheduled follow-up dates approaching.",
    recovery: "Leads from other agents that have been inactive for 30+ days. Re-engagement opportunities.",
  };

  // Calculate stats
  const queueStats = {
    active: callQueue.filter(c => c.status === 'calling' || c.status === 'in_progress').length,
    queued: callQueue.filter(c => c.status === 'queued').length,
    completed: callQueue.filter(c => c.status === 'completed').length,
    failed: callQueue.filter(c => c.status === 'failed').length,
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
                  <Select value={selectedAgent} onValueChange={setSelectedAgent} disabled={agentsLoading}>
                    <SelectTrigger data-testid="select-agent">
                      <SelectValue placeholder={agentsLoading ? "Loading agents..." : "Choose an agent"} />
                    </SelectTrigger>
                    <SelectContent>
                      {agents.map(agent => (
                        <SelectItem key={agent.agent_id} value={agent.agent_id} data-testid={`select-agent-${agent.agent_id}`}>
                          {agent.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Scheduling</label>
                  <RadioGroup value={schedulingMode} onValueChange={(v) => setSchedulingMode(v as 'immediate' | 'scheduled')} data-testid="radio-scheduling-mode">
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="immediate" id="immediate" data-testid="radio-immediate" />
                      <Label htmlFor="immediate">Call Immediately</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="scheduled" id="scheduled" data-testid="radio-scheduled" />
                      <Label htmlFor="scheduled">Schedule for Later</Label>
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

                  {/* Stores Table */}
                  {storesLoading ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                  ) : eligibleStores.length === 0 ? (
                    <div className="text-center py-12 bg-muted/20 rounded-lg">
                      <p className="text-muted-foreground" data-testid="text-no-stores">
                        No eligible stores found for this scenario.
                      </p>
                    </div>
                  ) : (
                    <div className="border rounded-lg">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-12">
                              <Checkbox
                                checked={selectedStores.size === eligibleStores.length && eligibleStores.length > 0}
                                onCheckedChange={handleSelectAll}
                                data-testid="checkbox-select-all"
                              />
                            </TableHead>
                            <TableHead>Business Name</TableHead>
                            <TableHead>Location</TableHead>
                            <TableHead>Phone</TableHead>
                            <TableHead>Hours</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {eligibleStores.map((store) => (
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
                                <div className="flex items-center gap-2">
                                  <span className="text-sm text-muted-foreground truncate max-w-[200px]">
                                    {store.hours || "N/A"}
                                  </span>
                                  {store.isOpen ? (
                                    <Badge variant="default" className="bg-green-600" data-testid={`badge-open-${store.link}`}>
                                      Open
                                    </Badge>
                                  ) : (
                                    <Badge variant="secondary" data-testid={`badge-closed-${store.link}`}>
                                      Closed
                                    </Badge>
                                  )}
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
