import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Phone, Loader2, ExternalLink, ChevronDown, ChevronUp, Target } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";

interface CallHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCallStore?: (storeLink: string, phoneNumber: string) => void;
}

interface CallRecord {
  id: string;
  calledAt: string;
  agentId: string;
  storeName: string;
  phoneNumber: string;
  storeLink: string | null;
}

interface GroupedCall {
  storeName: string;
  phoneNumber: string;
  storeLink: string | null;
  calls: CallRecord[];
  count: number;
  lastCallTime: string;
}

interface FollowUpClient {
  id: string;
  data: Record<string, any>;
  claimDate: string | null;
  lastContactDate: string | null;
  firstOrderDate: string | null;
  lastOrderDate: string | null;
  daysSinceContact?: number;
  daysSinceOrder?: number;
}

interface FollowUpData {
  claimedUntouched: FollowUpClient[];
  interestedGoingCold: FollowUpClient[];
  closedWonReorder: FollowUpClient[];
}

export function CallHistoryDialog({ open, onOpenChange, onCallStore }: CallHistoryDialogProps) {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [selectedAgent, setSelectedAgent] = useState<string>("all");
  const [mode, setMode] = useState<"chronological" | "followup">("chronological");
  
  // Follow-up center filters
  const [claimedDays, setClaimedDays] = useState([7, 90]);
  const [interestedDays, setInterestedDays] = useState([14, 90]);
  const [reorderDays, setReorderDays] = useState([30, 180]);
  
  // Collapsible states
  const [claimedOpen, setClaimedOpen] = useState(true);
  const [interestedOpen, setInterestedOpen] = useState(true);
  const [reorderOpen, setReorderOpen] = useState(true);

  // Fetch all users (for admin agent filter)
  const { data: usersData } = useQuery<any>({
    queryKey: ["/api/users"],
    enabled: user?.role === 'admin',
  });

  const users = usersData?.users || [];
  const agents = users.filter((u: any) => u.role === 'agent');

  // Fetch call history with optional agent filter
  const { data: callHistory = [], isLoading } = useQuery<CallRecord[]>({
    queryKey: ['/api/call-history', selectedAgent !== 'all' ? { agentId: selectedAgent } : {}],
    queryFn: async () => {
      const url = user?.role === 'admin' && selectedAgent !== 'all'
        ? `/api/call-history?agentId=${selectedAgent}`
        : '/api/call-history';
      return await apiRequest('GET', url);
    },
    enabled: mode === 'chronological',
  });

  // Fetch follow-up center data
  const { data: followUpData, isLoading: isLoadingFollowUp } = useQuery<FollowUpData>({
    queryKey: ['/api/follow-up-center'],
    enabled: mode === 'followup',
  });

  // Log call mutation
  const logCallMutation = useMutation({
    mutationFn: async ({ storeName, phoneNumber, storeLink }: { storeName: string; phoneNumber: string; storeLink: string | null }) => {
      return await apiRequest("POST", "/api/call-history", {
        storeName,
        phoneNumber,
        storeLink,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/call-history'] });
      queryClient.invalidateQueries({ queryKey: ['/api/follow-up-center'] });
    },
    onError: (error: Error) => {
      console.error('Failed to log call:', error);
    },
  });

  // Group calls by store and phone number (chronological mode)
  const groupedCalls: GroupedCall[] = callHistory.reduce((acc: GroupedCall[], call) => {
    const key = `${call.storeName}-${call.phoneNumber}`;
    const existing = acc.find(g => `${g.storeName}-${g.phoneNumber}` === key);
    
    if (existing) {
      existing.calls.push(call);
      existing.count++;
      if (new Date(call.calledAt) > new Date(existing.lastCallTime)) {
        existing.lastCallTime = call.calledAt;
      }
    } else {
      acc.push({
        storeName: call.storeName,
        phoneNumber: call.phoneNumber,
        storeLink: call.storeLink,
        calls: [call],
        count: 1,
        lastCallTime: call.calledAt,
      });
    }
    
    return acc;
  }, []);

  groupedCalls.sort((a, b) => new Date(b.lastCallTime).getTime() - new Date(a.lastCallTime).getTime());

  const handleCall = (group: GroupedCall) => {
    logCallMutation.mutate({
      storeName: group.storeName,
      phoneNumber: group.phoneNumber,
      storeLink: group.storeLink,
    });

    onOpenChange(false);

    if (onCallStore && group.storeLink) {
      onCallStore(group.storeLink, group.phoneNumber);
    } else {
      window.location.href = `tel:${group.phoneNumber}`;
    }
  };

  const handleFollowUpCall = (client: FollowUpClient) => {
    const storeName = client.data?.Name || client.data?.name || 'Unknown';
    const phoneNumber = client.data?.Phone || client.data?.phone || '';
    const storeLink = client.data?.Link || client.data?.link || null;

    if (!phoneNumber) return;

    logCallMutation.mutate({
      storeName,
      phoneNumber,
      storeLink,
    });

    onOpenChange(false);

    if (onCallStore && storeLink) {
      onCallStore(storeLink, phoneNumber);
    } else {
      window.location.href = `tel:${phoneNumber}`;
    }
  };

  const getClientName = (client: FollowUpClient) => {
    return client.data?.Name || client.data?.name || client.data?.Company || client.data?.company || 'Unknown';
  };

  const getClientPhone = (client: FollowUpClient) => {
    return client.data?.Phone || client.data?.phone || 'No phone';
  };

  const getClientLink = (client: FollowUpClient) => {
    return client.data?.Link || client.data?.link || null;
  };

  // Filter follow-up data based on slider ranges
  const filteredClaimedUntouched = (followUpData?.claimedUntouched || []).filter(
    c => c.daysSinceContact! >= claimedDays[0] && c.daysSinceContact! <= claimedDays[1]
  );

  const filteredInterestedGoingCold = (followUpData?.interestedGoingCold || []).filter(
    c => c.daysSinceContact! >= interestedDays[0] && c.daysSinceContact! <= interestedDays[1]
  );

  const filteredClosedWonReorder = (followUpData?.closedWonReorder || []).filter(
    c => c.daysSinceOrder! >= reorderDays[0] && c.daysSinceOrder! <= reorderDays[1]
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col" data-testid="dialog-call-history">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5" />
            {mode === 'chronological' ? 'Call History' : 'Follow-Up Center'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'chronological' 
              ? 'View your call history and make calls to stores'
              : 'Smart filters to catch clients falling through the cracks'}
          </DialogDescription>
        </DialogHeader>

        {/* Mode Toggle */}
        <div className="flex gap-2 pb-4 border-b">
          <Button
            variant={mode === 'chronological' ? 'default' : 'outline'}
            onClick={() => setMode('chronological')}
            className="flex-1"
            data-testid="button-mode-chronological"
          >
            <Phone className="h-4 w-4 mr-2" />
            Chronological
          </Button>
          <Button
            variant={mode === 'followup' ? 'default' : 'outline'}
            onClick={() => setMode('followup')}
            className="flex-1"
            data-testid="button-mode-followup"
          >
            <Target className="h-4 w-4 mr-2" />
            Follow-Up Center
          </Button>
        </div>

        {/* Admin Agent Filter (both modes) */}
        {user?.role === 'admin' && mode === 'chronological' && (
          <div className="flex items-center gap-2 pb-4 border-b">
            <label className="text-sm font-medium">Filter by Agent:</label>
            <Select value={selectedAgent} onValueChange={setSelectedAgent}>
              <SelectTrigger className="w-[200px]" data-testid="select-agent-filter">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Agents</SelectItem>
                {agents.map((agent: any) => (
                  <SelectItem key={agent.id} value={agent.id}>
                    {agent.name || agent.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Chronological Mode */}
        {mode === 'chronological' && (
          <div className="flex-1 overflow-y-auto space-y-3">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : groupedCalls.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No call history yet</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Phone call logs will appear here when you call stores
                </p>
              </div>
            ) : (
              groupedCalls.map((group, index) => (
                <Card key={index} className="p-4 hover-elevate" data-testid={`call-history-item-${index}`}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold" data-testid={`text-store-name-${index}`}>
                          {group.storeName}
                        </h3>
                        {group.storeLink && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            asChild
                            data-testid={`button-store-link-${index}`}
                          >
                            <a href={group.storeLink} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          </Button>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Phone className="h-3 w-3" />
                        <span data-testid={`text-phone-${index}`}>{group.phoneNumber}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Badge variant="secondary" data-testid={`badge-call-count-${index}`}>
                          {group.count} {group.count === 1 ? 'call' : 'calls'}
                        </Badge>
                        <span data-testid={`text-last-call-${index}`}>
                          Last called {formatDistanceToNow(new Date(group.lastCallTime), { addSuffix: true })}
                        </span>
                      </div>
                    </div>
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => handleCall(group)}
                      data-testid={`button-call-${index}`}
                    >
                      <Phone className="h-4 w-4 mr-2" />
                      Call
                    </Button>
                  </div>
                </Card>
              ))
            )}
          </div>
        )}

        {/* Follow-Up Center Mode */}
        {mode === 'followup' && (
          <div className="flex-1 overflow-y-auto space-y-4">
            {isLoadingFollowUp ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                {/* Filter 1: Claimed but Untouched */}
                <Collapsible open={claimedOpen} onOpenChange={setClaimedOpen}>
                  <Card className="p-4">
                    <CollapsibleTrigger className="w-full" asChild>
                      <div className="flex items-center justify-between cursor-pointer hover-elevate p-2 rounded-md" data-testid="filter-claimed-untouched">
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg">Claimed but Never Contacted</h3>
                          <p className="text-sm text-muted-foreground">
                            You claimed these clients but haven't reached out yet
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge variant="default" className="text-lg px-3 py-1" data-testid="count-claimed-untouched">
                            {filteredClaimedUntouched.length}
                          </Badge>
                          {claimedOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                        </div>
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="mt-4 space-y-3">
                      <div className="space-y-2 p-3 bg-muted/30 rounded-md">
                        <div className="flex justify-between text-sm">
                          <span className="font-medium">Days since claimed:</span>
                          <span className="text-muted-foreground">{claimedDays[0]} - {claimedDays[1]} days</span>
                        </div>
                        <Slider
                          value={claimedDays}
                          onValueChange={setClaimedDays}
                          min={1}
                          max={365}
                          step={1}
                          className="w-full"
                          data-testid="slider-claimed-days"
                        />
                      </div>
                      
                      {filteredClaimedUntouched.length === 0 ? (
                        <p className="text-center text-sm text-muted-foreground py-4">
                          No clients match these criteria
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {filteredClaimedUntouched.map((client, idx) => (
                            <Card key={client.id} className="p-3 hover-elevate" data-testid={`client-claimed-${idx}`}>
                              <div className="flex items-center justify-between gap-3">
                                <div className="flex-1 min-w-0">
                                  <h4 className="font-medium truncate">{getClientName(client)}</h4>
                                  <p className="text-sm text-muted-foreground">{getClientPhone(client)}</p>
                                  <p className="text-xs text-muted-foreground mt-1">
                                    Claimed {client.daysSinceContact} days ago
                                  </p>
                                </div>
                                <Button
                                  size="sm"
                                  onClick={() => handleFollowUpCall(client)}
                                  data-testid={`button-followup-${idx}`}
                                >
                                  <Phone className="h-4 w-4 mr-1" />
                                  Call
                                </Button>
                              </div>
                            </Card>
                          ))}
                        </div>
                      )}
                    </CollapsibleContent>
                  </Card>
                </Collapsible>

                {/* Filter 2: Interested Going Cold */}
                <Collapsible open={interestedOpen} onOpenChange={setInterestedOpen}>
                  <Card className="p-4">
                    <CollapsibleTrigger className="w-full" asChild>
                      <div className="flex items-center justify-between cursor-pointer hover-elevate p-2 rounded-md" data-testid="filter-interested-cold">
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg">Interested Leads Going Cold</h3>
                          <p className="text-sm text-muted-foreground">
                            Contacted but haven't closed - time to follow up
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge variant="default" className="text-lg px-3 py-1" data-testid="count-interested-cold">
                            {filteredInterestedGoingCold.length}
                          </Badge>
                          {interestedOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                        </div>
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="mt-4 space-y-3">
                      <div className="space-y-2 p-3 bg-muted/30 rounded-md">
                        <div className="flex justify-between text-sm">
                          <span className="font-medium">Days since last contact:</span>
                          <span className="text-muted-foreground">{interestedDays[0]} - {interestedDays[1]} days</span>
                        </div>
                        <Slider
                          value={interestedDays}
                          onValueChange={setInterestedDays}
                          min={1}
                          max={365}
                          step={1}
                          className="w-full"
                          data-testid="slider-interested-days"
                        />
                      </div>
                      
                      {filteredInterestedGoingCold.length === 0 ? (
                        <p className="text-center text-sm text-muted-foreground py-4">
                          No clients match these criteria
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {filteredInterestedGoingCold.map((client, idx) => (
                            <Card key={client.id} className="p-3 hover-elevate" data-testid={`client-interested-${idx}`}>
                              <div className="flex items-center justify-between gap-3">
                                <div className="flex-1 min-w-0">
                                  <h4 className="font-medium truncate">{getClientName(client)}</h4>
                                  <p className="text-sm text-muted-foreground">{getClientPhone(client)}</p>
                                  <p className="text-xs text-muted-foreground mt-1">
                                    Last contact {client.daysSinceContact} days ago
                                  </p>
                                </div>
                                <Button
                                  size="sm"
                                  onClick={() => handleFollowUpCall(client)}
                                  data-testid={`button-followup-interested-${idx}`}
                                >
                                  <Phone className="h-4 w-4 mr-1" />
                                  Call
                                </Button>
                              </div>
                            </Card>
                          ))}
                        </div>
                      )}
                    </CollapsibleContent>
                  </Card>
                </Collapsible>

                {/* Filter 3: Closed-Won Reorder Alert */}
                <Collapsible open={reorderOpen} onOpenChange={setReorderOpen}>
                  <Card className="p-4">
                    <CollapsibleTrigger className="w-full" asChild>
                      <div className="flex items-center justify-between cursor-pointer hover-elevate p-2 rounded-md" data-testid="filter-reorder-alert">
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg">First-Time Buyers - Reorder Alert</h3>
                          <p className="text-sm text-muted-foreground">
                            Placed one order but haven't reordered yet
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge variant="default" className="text-lg px-3 py-1" data-testid="count-reorder-alert">
                            {filteredClosedWonReorder.length}
                          </Badge>
                          {reorderOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                        </div>
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="mt-4 space-y-3">
                      <div className="space-y-2 p-3 bg-muted/30 rounded-md">
                        <div className="flex justify-between text-sm">
                          <span className="font-medium">Days since first order:</span>
                          <span className="text-muted-foreground">{reorderDays[0]} - {reorderDays[1]} days</span>
                        </div>
                        <Slider
                          value={reorderDays}
                          onValueChange={setReorderDays}
                          min={1}
                          max={365}
                          step={1}
                          className="w-full"
                          data-testid="slider-reorder-days"
                        />
                      </div>
                      
                      {filteredClosedWonReorder.length === 0 ? (
                        <p className="text-center text-sm text-muted-foreground py-4">
                          No clients match these criteria
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {filteredClosedWonReorder.map((client, idx) => (
                            <Card key={client.id} className="p-3 hover-elevate" data-testid={`client-reorder-${idx}`}>
                              <div className="flex items-center justify-between gap-3">
                                <div className="flex-1 min-w-0">
                                  <h4 className="font-medium truncate">{getClientName(client)}</h4>
                                  <p className="text-sm text-muted-foreground">{getClientPhone(client)}</p>
                                  <p className="text-xs text-muted-foreground mt-1">
                                    First order {client.daysSinceOrder} days ago
                                  </p>
                                </div>
                                <Button
                                  size="sm"
                                  onClick={() => handleFollowUpCall(client)}
                                  data-testid={`button-followup-reorder-${idx}`}
                                >
                                  <Phone className="h-4 w-4 mr-1" />
                                  Call
                                </Button>
                              </div>
                            </Card>
                          ))}
                        </div>
                      )}
                    </CollapsibleContent>
                  </Card>
                </Collapsible>
              </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
