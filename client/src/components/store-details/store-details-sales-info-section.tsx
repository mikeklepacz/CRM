import { AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SortableSection } from "@/components/store-details/sortable-section";
import { StoreDetailsParentRecordConfig } from "@/components/store-details/store-details-parent-record-config";
import { StoreDetailsMultiLocationSelector } from "@/components/store-details/store-details-multi-location-selector";
import { StoreDetailsSalesContactStatus } from "@/components/store-details/store-details-sales-contact-status";
import { StoreDetailsReminderCollapsible } from "@/components/store-details/store-details-reminder-collapsible";

export function StoreDetailsSalesInfoSection(props: any) {
  const p = props;

  return (
    <SortableSection key="sales-info" id="sales-info">
      <AccordionItem value="sales-info" data-testid="accordion-item-sales-info">
        <AccordionTrigger className="text-lg font-semibold" data-testid="trigger-sales-info">
          Sales Info
        </AccordionTrigger>
        <AccordionContent>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="sales_ready_summary">Sales-ready Summary</Label>
              <Textarea
                id="sales_ready_summary"
                data-testid="input-sales-ready-summary"
                value={p.formData.sales_ready_summary}
                onChange={(e) => p.handleInputChange("sales_ready_summary", e.target.value)}
                placeholder="Summary for sales team..."
                rows={4}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                data-testid="input-notes"
                value={p.formData.notes}
                onChange={(e) => p.handleInputChange("notes", e.target.value)}
                placeholder="Call notes, contact info from store worker..."
                rows={4}
              />
            </div>

            <div className="space-y-4 pt-4 border-t">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="multiple_locations"
                  checked={p.multiLocationMode}
                  onCheckedChange={(checked) => {
                    p.setMultiLocationMode(checked as boolean);
                    if (!checked) {
                      p.setSelectedStores([]);
                      p.setCurrentDbaStores([]);
                      p.setDbaName("");
                      p.setStoreSearch("");
                    }
                  }}
                  data-testid="checkbox-multiple-locations"
                />
                <Label htmlFor="multiple_locations" className="cursor-pointer font-medium">
                  Multiple Locations (claim DBA with multiple stores)
                </Label>
              </div>

              {p.multiLocationMode && (
                <div className="space-y-4 pl-6 border-l-2 border-primary/20">
                  <div className="space-y-2">
                    <Label htmlFor="dba_name">
                      DBA / Company Name <span className="text-red-600">*</span>
                    </Label>
                    <Input
                      id="dba_name"
                      data-testid="input-dba-name"
                      value={p.dbaName}
                      onChange={(e) => p.setDbaName(e.target.value)}
                      placeholder="e.g., House of Dank, Green Thumb Industries"
                    />
                    {p.selectedStores.length > 0 && (
                      <p className="text-xs text-red-600 font-medium">
                        ⚠ If you modify this field after adding locations, they will be deleted!
                      </p>
                    )}
                  </div>

                  <StoreDetailsParentRecordConfig
                    corporateAddress={p.corporateAddress}
                    corporateCity={p.corporateCity}
                    corporateEmail={p.corporateEmail}
                    corporatePhone={p.corporatePhone}
                    corporateState={p.corporateState}
                    dbaName={p.dbaName}
                    formData={p.formData}
                    parentCreationType={p.parentCreationType}
                    parentPocEmail={p.parentPocEmail}
                    parentPocName={p.parentPocName}
                    parentPocPhone={p.parentPocPhone}
                    selectedParentLink={p.selectedParentLink}
                    selectedStores={p.selectedStores}
                    setCorporateAddress={p.setCorporateAddress}
                    setCorporateCity={p.setCorporateCity}
                    setCorporateEmail={p.setCorporateEmail}
                    setCorporatePhone={p.setCorporatePhone}
                    setCorporateState={p.setCorporateState}
                    setParentCreationType={p.setParentCreationType}
                    setParentPocEmail={p.setParentPocEmail}
                    setParentPocName={p.setParentPocName}
                    setParentPocPhone={p.setParentPocPhone}
                    setSelectedParentLink={p.setSelectedParentLink}
                  />

                  <StoreDetailsMultiLocationSelector
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
                    setParseLocationsDialog={p.setParseLocationsDialog}
                    setSelectedParentLink={p.setSelectedParentLink}
                    setSelectedStores={p.setSelectedStores}
                    setStoreSearchDialog={p.setStoreSearchDialog}
                    storeSheetId={p.storeSheetId}
                    toast={p.toast}
                    trackerSheetId={p.trackerSheetId}
                  />
                </div>
              )}
            </div>

            <StoreDetailsSalesContactStatus
              formData={p.formData}
              handleInputChange={p.handleInputChange}
              statusColors={p.statusColors}
              statusOptions={p.statusOptions}
            />

            <StoreDetailsReminderCollapsible
              formData={p.formData}
              handleInputChange={p.handleInputChange}
              isSavingReminder={p.isSavingReminder}
              reminderSectionOpen={p.reminderSectionOpen}
              row={p.row}
              setInitialData={p.setInitialData}
              setIsSavingReminder={p.setIsSavingReminder}
              setReminderSectionOpen={p.setReminderSectionOpen}
              toast={p.toast}
              trackerSheetId={p.trackerSheetId}
              upsertTrackerFieldsMutation={p.upsertTrackerFieldsMutation}
              userPreferences={p.userPreferences}
            />
          </div>
        </AccordionContent>
      </AccordionItem>
    </SortableSection>
  );
}
