import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Search } from "lucide-react";
import { StoreDetailsClaimDbaButton } from "@/components/store-details/store-details-claim-dba-button";

export function StoreDetailsMultiLocationSelector(props: any) {
  const p = props;

  return (
    <>
      {p.selectedStores.length > 0 && (
        <div
          className="space-y-2 p-3 bg-muted/30 rounded-md"
          style={{ opacity: !p.dbaName.trim() ? 0.5 : 1, pointerEvents: !p.dbaName.trim() ? "none" : "auto" }}
        >
          <Label htmlFor="select-head-office">Head Office Location (optional)</Label>
          <p className="text-xs text-muted-foreground">Select which location is the corporate headquarters</p>
          <Select value={p.headOfficeLink} onValueChange={p.setHeadOfficeLink} disabled={!p.dbaName.trim()}>
            <SelectTrigger id="select-head-office" data-testid="select-head-office">
              <SelectValue placeholder="Choose head office (or skip)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              {p.selectedStores.map((store: any) => (
                <SelectItem key={store.link} value={store.link}>
                  {store.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {p.currentDbaStores.length > 0 && (
        <div className="space-y-2">
          <Label>Current Stores in this DBA ({p.currentDbaStores.length})</Label>
          <div className="space-y-2 max-h-40 overflow-y-auto border rounded-md p-2 bg-muted/30">
            {p.currentDbaStores.map((store: any) => (
              <div
                key={store.link}
                className="flex items-center justify-between p-2 bg-background rounded-md"
                data-testid={`current-store-${store.link}`}
              >
                <span className="text-sm">{store.name}</span>
                <Badge variant="secondary" className="text-xs">
                  Current
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-2" style={{ opacity: !p.dbaName.trim() ? 0.5 : 1 }}>
        <div className="flex items-center justify-between">
          <Label>Selected Locations ({p.selectedStores.length})</Label>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => p.setParseLocationsDialog(true)}
              data-testid="button-parse-locations"
              disabled={!p.dbaName.trim()}
            >
              <FileText className="h-4 w-4 mr-2" />
              Parse Locations
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => p.setStoreSearchDialog(true)}
              data-testid="button-add-locations"
              disabled={!p.dbaName.trim()}
            >
              <Search className="h-4 w-4 mr-2" />
              Add Locations
            </Button>
          </div>
        </div>

        {p.selectedStores.length > 0 ? (
          <div className="space-y-2 max-h-40 overflow-y-auto border rounded-md p-2">
            {p.selectedStores.map((store: any) => (
              <div
                key={store.link}
                className="flex items-center justify-between p-2 bg-muted/50 rounded-md"
                data-testid={`selected-store-${store.link}`}
              >
                <div className="flex items-center gap-2 flex-1">
                  <span className="text-sm">{store.name}</span>
                  {store.source === "google" && (
                    <Badge variant="default" className="bg-blue-600 text-xs">
                      From Google
                    </Badge>
                  )}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => p.setSelectedStores((prev: any) => prev.filter((s: any) => s.link !== store.link))}
                  data-testid={`button-remove-store-${store.link}`}
                >
                  ×
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground p-2 border rounded-md bg-muted/30">
            No new locations selected. Click "Add Locations" to add stores to this DBA.
          </p>
        )}
      </div>

      <StoreDetailsClaimDbaButton
        corporateAddress={p.corporateAddress}
        corporateCity={p.corporateCity}
        corporateEmail={p.corporateEmail}
        corporatePhone={p.corporatePhone}
        corporateState={p.corporateState}
        currentDbaStores={p.currentDbaStores}
        currentUser={p.currentUser}
        dbaName={p.dbaName}
        formData={p.formData}
        headOfficeLink={p.headOfficeLink}
        isClaiming={p.isClaiming}
        onOpenChange={p.onOpenChange}
        parentCreationType={p.parentCreationType}
        parentPocEmail={p.parentPocEmail}
        parentPocName={p.parentPocName}
        parentPocPhone={p.parentPocPhone}
        queryClient={p.queryClient}
        refetch={p.refetch}
        row={p.row}
        selectedParentLink={p.selectedParentLink}
        selectedStores={p.selectedStores}
        setCurrentDbaStores={p.setCurrentDbaStores}
        setDbaName={p.setDbaName}
        setHeadOfficeLink={p.setHeadOfficeLink}
        setIsClaiming={p.setIsClaiming}
        setMultiLocationMode={p.setMultiLocationMode}
        setParentPocEmail={p.setParentPocEmail}
        setParentPocName={p.setParentPocName}
        setParentPocPhone={p.setParentPocPhone}
        setSelectedParentLink={p.setSelectedParentLink}
        setSelectedStores={p.setSelectedStores}
        storeSheetId={p.storeSheetId}
        toast={p.toast}
        trackerSheetId={p.trackerSheetId}
      />
    </>
  );
}
