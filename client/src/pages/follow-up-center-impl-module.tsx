import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Loader2, Target } from "lucide-react";

import { StoreDetailsDialog } from "@/components/store-details-dialog";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useTwilioVoip } from "@/hooks/useTwilioVoip";
import { FollowUpSection } from "./follow-up-center/follow-up-section";
import type { FollowUpClient, FollowUpData } from "./follow-up-center/types";

export default function FollowUpCenter() {
  const StoreDetailsDialogCompat = StoreDetailsDialog as any;
  const voip = useTwilioVoip();

  const [claimedDays, setClaimedDays] = useState([7, 90]);
  const [interestedDays, setInterestedDays] = useState([14, 90]);
  const [reorderDays, setReorderDays] = useState([30, 180]);
  const [preferencesLoaded, setPreferencesLoaded] = useState(false);

  const [claimedOpen, setClaimedOpen] = useState(true);
  const [interestedOpen, setInterestedOpen] = useState(true);
  const [reorderOpen, setReorderOpen] = useState(true);

  const [storeDialogOpen, setStoreDialogOpen] = useState(false);
  const [selectedStore, setSelectedStore] = useState<FollowUpClient | null>(null);

  const { data: userPreferences } = useQuery<{
    followUpFilters?: {
      claimedDays: [number, number];
      interestedDays: [number, number];
      reorderDays: [number, number];
    };
  }>({ queryKey: ["/api/user/preferences"] });

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

  const saveFiltersMutation = useMutation({
    mutationFn: async (filters: { claimedDays: [number, number]; interestedDays: [number, number]; reorderDays: [number, number] }) => {
      return await apiRequest("PUT", "/api/user/preferences", { followUpFilters: filters });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/preferences"] });
    },
  });

  useEffect(() => {
    if (!preferencesLoaded) return;
    const timer = setTimeout(() => {
      saveFiltersMutation.mutate({
        claimedDays: claimedDays as [number, number],
        interestedDays: interestedDays as [number, number],
        reorderDays: reorderDays as [number, number],
      });
    }, 500);
    return () => clearTimeout(timer);
  }, [claimedDays, interestedDays, reorderDays, preferencesLoaded]);

  const { data: followUpData, isLoading } = useQuery<FollowUpData>({ queryKey: ["/api/follow-up-center"] });

  const { data: sheetsData } = useQuery<any>({ queryKey: ["/api/sheets"] });
  const sheets = sheetsData?.sheets || [];
  const trackerSheet = sheets.find((s: any) => s.purpose === "commissions");
  const storeSheet = sheets.find((s: any) => s.purpose === "Store Database");
  const trackerSheetId = trackerSheet?.id;
  const storeSheetId = storeSheet?.id;

  const handleFollowUpCall = (client: FollowUpClient) => {
    const storeName = client.data?.Name || client.data?.name || "Unknown";
    const phoneNumber = client.data?.Phone || client.data?.phone || "";
    const storeLink = client.data?.Link || client.data?.link || null;
    if (!phoneNumber) return;
    voip.makeCall(phoneNumber, { storeName, storeLink: storeLink || undefined });
  };

  const filteredClaimedUntouched = (followUpData?.claimedUntouched || []).filter((c) => c.daysSinceContact! >= claimedDays[0] && c.daysSinceContact! <= claimedDays[1]);
  const filteredInterestedGoingCold = (followUpData?.interestedGoingCold || []).filter((c) => c.daysSinceContact! >= interestedDays[0] && c.daysSinceContact! <= interestedDays[1]);
  const filteredClosedWonReorder = (followUpData?.closedWonReorder || []).filter((c) => c.daysSinceOrder! >= reorderDays[0] && c.daysSinceOrder! <= reorderDays[1]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-[50%] mx-auto">
          <div className="border-b p-4">
            <div className="flex items-center gap-2 mb-2">
              <Target className="h-6 w-6" />
              <h1 className="text-2xl font-bold">Follow-Up Center</h1>
            </div>
            <p className="text-sm text-muted-foreground">Smart filters to catch clients falling through the cracks</p>
          </div>

          <div className="p-4 space-y-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                <FollowUpSection
                  open={claimedOpen}
                  onOpenChange={setClaimedOpen}
                  title="Claimed but Never Contacted"
                  description="You claimed these clients but haven't reached out yet"
                  countTestId="count-claimed-untouched"
                  filterTestId="filter-claimed-untouched"
                  sliderTestId="slider-claimed-days"
                  daysLabel="Days since claimed:"
                  daysRange={claimedDays}
                  onDaysRangeChange={setClaimedDays}
                  clients={filteredClaimedUntouched}
                  noteButtonTestIdPrefix="button-notes"
                  callButtonTestIdPrefix="button-followup"
                  dateText={(c) => `Claimed ${c.daysSinceContact} days ago`}
                  onOpenStoreDetails={(client) => {
                    setSelectedStore(client);
                    setStoreDialogOpen(true);
                  }}
                  onFollowUpCall={handleFollowUpCall}
                />

                <FollowUpSection
                  open={interestedOpen}
                  onOpenChange={setInterestedOpen}
                  title="Interested Leads Going Cold"
                  description="Contacted but haven't closed - time to follow up"
                  countTestId="count-interested-cold"
                  filterTestId="filter-interested-cold"
                  sliderTestId="slider-interested-days"
                  daysLabel="Days since last contact:"
                  daysRange={interestedDays}
                  onDaysRangeChange={setInterestedDays}
                  clients={filteredInterestedGoingCold}
                  noteButtonTestIdPrefix="button-notes-interested"
                  callButtonTestIdPrefix="button-followup-interested"
                  dateText={(c) => `Last contact ${c.daysSinceContact} days ago`}
                  onOpenStoreDetails={(client) => {
                    setSelectedStore(client);
                    setStoreDialogOpen(true);
                  }}
                  onFollowUpCall={handleFollowUpCall}
                />

                <FollowUpSection
                  open={reorderOpen}
                  onOpenChange={setReorderOpen}
                  title="First-Time Buyers - Reorder Alert"
                  description="Placed one order but haven't reordered yet"
                  countTestId="count-reorder-alert"
                  filterTestId="filter-reorder-alert"
                  sliderTestId="slider-reorder-days"
                  daysLabel="Days since last order:"
                  daysRange={reorderDays}
                  onDaysRangeChange={setReorderDays}
                  clients={filteredClosedWonReorder}
                  noteButtonTestIdPrefix="button-notes-reorder"
                  callButtonTestIdPrefix="button-followup-reorder"
                  dateText={(c) => `Last order ${c.daysSinceOrder} days ago`}
                  onOpenStoreDetails={(client) => {
                    setSelectedStore(client);
                    setStoreDialogOpen(true);
                  }}
                  onFollowUpCall={handleFollowUpCall}
                />
              </>
            )}
          </div>
        </div>
      </div>

      {selectedStore && (
        <StoreDetailsDialogCompat
          open={storeDialogOpen}
          onOpenChange={setStoreDialogOpen}
          row={selectedStore.data}
          trackerSheetId={trackerSheetId || ""}
          storeSheetId={storeSheetId || ""}
          refetch={() => {
            queryClient.invalidateQueries({ queryKey: ["/api/follow-up-center"] });
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
