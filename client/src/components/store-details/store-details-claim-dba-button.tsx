import { Button } from "@/components/ui/button";
import { Loader2, Sparkles } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

export function StoreDetailsClaimDbaButton(props: any) {
  const p = props;

  return (
    <Button
      type="button"
      variant="default"
      onClick={async () => {
        p.setIsClaiming(true);
        try {
          if (p.selectedStores.length === 0) {
            p.toast({
              title: "No stores selected",
              description: "Please select at least one store to add to this DBA",
              variant: "destructive",
            });
            return;
          }

          if (p.parentCreationType === "existing" && !p.selectedParentLink) {
            p.toast({
              title: "Parent not selected",
              description: "Please select which location should be the parent",
              variant: "destructive",
            });
            return;
          }

          const storesWithLinks = await Promise.all(
            p.selectedStores.map(async (store: any) => {
              if (store.source === "google") {
                const importResult = await apiRequest("POST", "/api/stores/import-new", {
                  store: {
                    name: store.name,
                    address: store.address,
                    city: store.city,
                    state: store.state,
                    phone: store.phone,
                    zip: store.zip,
                  },
                  sheetId: p.storeSheetId,
                });

                return {
                  ...store,
                  link: importResult.link,
                };
              }

              return store;
            }),
          );

          const storeLinks = storesWithLinks.map((s) => s.link);

          if (p.parentCreationType === "new" && (!p.corporateCity?.trim() || !p.corporateState?.trim())) {
            p.toast({
              title: "Missing Required Fields",
              description: "City and State are required for parent record to appear in CRM filters",
              variant: "destructive",
            });
            return;
          }

          p.toast({
            title: "Claiming DBA",
            description: `Step 1/4: Claiming ${p.selectedStores.length} location(s)...`,
          });
          await apiRequest("POST", "/api/stores/claim-multiple", {
            storeLinks,
            dbaName: p.dbaName.trim(),
            storeSheetId: p.storeSheetId,
            trackerSheetId: p.trackerSheetId,
            isUpdatingExisting: p.currentDbaStores.length > 0,
          });

          p.toast({
            title: "Claiming DBA",
            description: "Step 2/4: Creating parent DBA record...",
          });
          let parentLink: string;

          const liveCardData = {
            notes: p.formData.notes || "",
            pointOfContact: p.formData.point_of_contact || "",
            pocEmail: p.formData.poc_email || "",
            pocPhone: p.formData.poc_phone || "",
            storeName: p.formData.name || p.row?.Name || "",
          };

          if (p.parentCreationType === "new") {
            const parentResponse = await apiRequest("POST", "/api/dba/create-parent", {
              dbaName: p.dbaName.trim(),
              pocName: p.parentPocName || liveCardData.pointOfContact,
              pocEmail: p.parentPocEmail || liveCardData.pocEmail,
              pocPhone: p.parentPocPhone || liveCardData.pocPhone,
              notes: liveCardData.notes
                ? `Corporate parent for ${p.dbaName.trim()}\n\n[From ${liveCardData.storeName}]: ${liveCardData.notes}`
                : `Corporate parent for ${p.dbaName.trim()}`,
              agentName: p.currentUser?.agentName || "",
              status: "claimed",
              address: p.corporateAddress || "",
              city: p.corporateCity || "",
              state: p.corporateState || "",
              phone: p.corporatePhone || "",
              email: p.corporateEmail || "",
              childLinks: storeLinks,
              liveCardData,
            });

            if (!parentResponse?.parentLink) {
              throw new Error(
                "Failed to create parent DBA record - no parent link returned. Please check that all required fields are filled.",
              );
            }
            parentLink = parentResponse.parentLink;
          } else {
            const parentResponse = await apiRequest("POST", "/api/dba/create-parent", {
              dbaName: p.dbaName.trim(),
              parentLink: p.selectedParentLink,
              liveCardData,
            });

            if (!parentResponse?.parentLink && !p.selectedParentLink) {
              throw new Error("Failed to set existing location as parent - no parent link returned.");
            }
            parentLink = p.selectedParentLink;
          }

          p.toast({
            title: "Claiming DBA",
            description: `Step 3/4: Linking ${p.selectedStores.length} child location(s) to parent...`,
          });
          const childLinks = storeLinks.filter((link) => link !== parentLink);
          if (childLinks.length > 0) {
            await apiRequest("POST", "/api/dba/link-children", {
              parentLink,
              childLinks,
              liveCardData,
            });
          }

          if (p.headOfficeLink && p.headOfficeLink !== "none") {
            p.toast({
              title: "Claiming DBA",
              description: "Step 4/4: Setting head office...",
            });
            await apiRequest("POST", "/api/dba/set-head-office", {
              headOfficeLink: p.headOfficeLink,
              parentLink,
              mergePocInfo: true,
            });
          }

          p.toast({
            title: "Success",
            description: `Claimed ${p.selectedStores.length} location(s) with DBA "${p.dbaName.trim()}" and created parent record`,
          });

          p.setMultiLocationMode(false);
          p.setSelectedStores([]);
          p.setCurrentDbaStores([]);
          p.setDbaName("");
          p.setSelectedParentLink("");
          p.setHeadOfficeLink("");
          p.setParentPocName("");
          p.setParentPocEmail("");
          p.setParentPocPhone("");

          await p.queryClient.invalidateQueries({ queryKey: ["merged-data"] });
          await p.queryClient.invalidateQueries({ queryKey: [`/api/stores/all/${p.storeSheetId}`] });
          await p.queryClient.invalidateQueries({ queryKey: ["/api/stores/by-dba"] });
          await p.refetch();

          p.onOpenChange(false);
        } catch (error: any) {
          console.error("[Claim DBA Error]", error);
          p.toast({
            title: "Error Claiming DBA",
            description: error.message || "Failed to claim locations. Please try again.",
            variant: "destructive",
          });
        } finally {
          p.setIsClaiming(false);
        }
      }}
      disabled={
        p.isClaiming ||
        !p.dbaName ||
        !p.dbaName.trim() ||
        p.selectedStores.length === 0 ||
        !p.storeSheetId ||
        !p.trackerSheetId
      }
      data-testid="button-claim-multiple"
    >
      {p.isClaiming ? (
        <>
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          Claiming DBA...
        </>
      ) : (
        <>
          <Sparkles className="h-4 w-4 mr-2" />
          Claim DBA with Parent-Child Structure
        </>
      )}
    </Button>
  );
}
