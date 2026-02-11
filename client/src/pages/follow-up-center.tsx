import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Phone, Loader2, ChevronDown, ChevronUp, Target } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { StoreDetailsDialog } from "@/components/store-details-dialog";
import { useTwilioVoip } from "@/hooks/useTwilioVoip";

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

export default function FollowUpCenter() {
  const voip = useTwilioVoip();
  // Follow-up center filters
  const [claimedDays, setClaimedDays] = useState([7, 90]);
  const [interestedDays, setInterestedDays] = useState([14, 90]);
  const [reorderDays, setReorderDays] = useState([30, 180]);
  const [preferencesLoaded, setPreferencesLoaded] = useState(false);

  // Collapsible states
  const [claimedOpen, setClaimedOpen] = useState(true);
  const [interestedOpen, setInterestedOpen] = useState(true);
  const [reorderOpen, setReorderOpen] = useState(true);

  // Store Details Dialog state
  const [storeDialogOpen, setStoreDialogOpen] = useState(false);
  const [selectedStore, setSelectedStore] = useState<FollowUpClient | null>(null);

  // Fetch user preferences
  const { data: userPreferences } = useQuery<{
    followUpFilters?: {
      claimedDays: [number, number];
      interestedDays: [number, number];
      reorderDays: [number, number];
    };
  }>({
    queryKey: ['/api/user/preferences'],
  });

  // Load saved filter preferences on mount
  useEffect(() => {
    if (userPreferences && !preferencesLoaded) {
      if (userPreferences.followUpFilters) {
        setClaimedDays(userPreferences.followUpFilters.claimedDays);
        setInterestedDays(userPreferences.followUpFilters.interestedDays);
        setReorderDays(userPreferences.followUpFilters.reorderDays);
      }
      setPreferencesLoaded(true);
    }
  }, [userPreferences, preferencesLoaded]);

  // Save filter preferences mutation
  const saveFiltersMutation = useMutation({
    mutationFn: async (filters: { claimedDays: [number, number]; interestedDays: [number, number]; reorderDays: [number, number] }) => {
      return await apiRequest('PUT', '/api/user/preferences', {
        followUpFilters: filters,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/user/preferences'] });
    },
  });

  // Save filters when they change (with debounce effect) - only after preferences are loaded
  useEffect(() => {
    if (!preferencesLoaded) return;

    const timer = setTimeout(() => {
      saveFiltersMutation.mutate({
        claimedDays: claimedDays as [number, number],
        interestedDays: interestedDays as [number, number],
        reorderDays: reorderDays as [number, number],
      });
    }, 500); // Debounce for 500ms

    return () => clearTimeout(timer);
  }, [claimedDays, interestedDays, reorderDays, preferencesLoaded]);

  // Fetch follow-up center data
  const { data: followUpData, isLoading } = useQuery<FollowUpData>({
    queryKey: ['/api/follow-up-center'],
  });

  // Fetch sheets data for Store Details Dialog
  const { data: sheetsData } = useQuery<any>({
    queryKey: ['/api/sheets'],
  });

  const sheets = sheetsData?.sheets || [];
  const trackerSheet = sheets.find((s: any) => s.purpose === 'commissions');
  const storeSheet = sheets.find((s: any) => s.purpose === 'Store Database');
  const trackerSheetId = trackerSheet?.id;
  const storeSheetId = storeSheet?.id;

  const handleFollowUpCall = (client: FollowUpClient) => {
    const storeName = client.data?.Name || client.data?.name || 'Unknown';
    const phoneNumber = client.data?.Phone || client.data?.phone || '';
    const storeLink = client.data?.Link || client.data?.link || null;

    if (!phoneNumber) return;

    voip.makeCall(phoneNumber, { storeName, storeLink: storeLink || undefined });
  };

  const handleOpenStoreDetails = (client: FollowUpClient) => {
    setSelectedStore(client);
    setStoreDialogOpen(true);
  };

  const getClientName = (client: FollowUpClient) => {
    return client.data?.Name || client.data?.name || client.data?.Company || client.data?.company || 'Unknown';
  };

  const getClientPhone = (client: FollowUpClient) => {
    return client.data?.Phone || client.data?.phone || 'No phone';
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
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-[50%] mx-auto">
          {/* Header */}
          <div className="border-b p-4">
            <div className="flex items-center gap-2 mb-2">
              <Target className="h-6 w-6" />
              <h1 className="text-2xl font-bold">Follow-Up Center</h1>
            </div>
            <p className="text-sm text-muted-foreground">
              Smart filters to catch clients falling through the cracks
            </p>
          </div>

          {/* Content */}
          <div className="p-4 space-y-4">
        {isLoading ? (
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
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenStoreDetails(client);
                                }}
                                data-testid={`button-notes-${idx}`}
                                className="h-auto py-2 flex flex-col items-center gap-0"
                              >
                                <span className="text-xs leading-tight">Notes</span>
                                <span className="text-xs leading-tight">Follow up</span>
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => handleFollowUpCall(client)}
                                data-testid={`button-followup-${idx}`}
                              >
                                <Phone className="h-4 w-4 mr-1" />
                                Call
                              </Button>
                            </div>
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
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenStoreDetails(client);
                                }}
                                data-testid={`button-notes-interested-${idx}`}
                                className="h-auto py-2 flex flex-col items-center gap-0"
                              >
                                <span className="text-xs leading-tight">Notes</span>
                                <span className="text-xs leading-tight">Follow up</span>
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => handleFollowUpCall(client)}
                                data-testid={`button-followup-interested-${idx}`}
                              >
                                <Phone className="h-4 w-4 mr-1" />
                                Call
                              </Button>
                            </div>
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
                      <span className="font-medium">Days since last order:</span>
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
                                Last order {client.daysSinceOrder} days ago
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenStoreDetails(client);
                                }}
                                data-testid={`button-notes-reorder-${idx}`}
                                className="h-auto py-2 flex flex-col items-center gap-0"
                              >
                                <span className="text-xs leading-tight">Notes</span>
                                <span className="text-xs leading-tight">Follow up</span>
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => handleFollowUpCall(client)}
                                data-testid={`button-followup-reorder-${idx}`}
                              >
                                <Phone className="h-4 w-4 mr-1" />
                                Call
                              </Button>
                            </div>
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
        </div>
      </div>

      {/* Store Details Dialog */}
      {selectedStore && (
        <StoreDetailsDialog
          open={storeDialogOpen}
          onOpenChange={setStoreDialogOpen}
          row={selectedStore.data}
          trackerSheetId={trackerSheetId || ''}
          storeSheetId={storeSheetId || ''}
          refetch={() => {
            queryClient.invalidateQueries({ queryKey: ['/api/follow-up-center'] });
          }}
          franchiseContext={null}
          currentColors={{}}
          statusOptions={[]}
          statusColors={{}}
          contextUpdateTrigger={0}
          setContextUpdateTrigger={() => {}}
          loadDefaultScriptTrigger={false}
        />
      )}
    </div>
  );
}
