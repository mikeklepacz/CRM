import { DndContext, closestCenter } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Accordion } from "@/components/ui/accordion";
import { InlineAIChatEnhanced } from "@/components/inline-ai-chat-enhanced";
import { StoreDetailsSalesInfoSection } from "@/components/store-details/store-details-sales-info-section";
import { StoreDetailsContactInfoSection } from "@/components/store-details/store-details-contact-info-section";
import { StoreDetailsDbaManagementSection } from "@/components/store-details/store-details-dba-management-section";
import { StoreDetailsActionButtons } from "@/components/store-details/store-details-action-buttons";

export function StoreDetailsDialogMainPane(props: any) {
  const savePending = !!props.saveMutation?.isPending;

  return (
    <div className="flex gap-4 overflow-hidden flex-1">
      {props.showAssistant && (
        <div className="w-1/2 border-r pr-4 flex flex-col overflow-hidden">
          <InlineAIChatEnhanced
            storeContext={{
              sales_ready_summary: props.formData.sales_ready_summary,
              notes: props.formData.notes,
              point_of_contact: props.formData.point_of_contact,
              poc_email: props.formData.poc_email,
              poc_phone: props.formData.poc_phone,
              status: props.formData.status,
              follow_up_date: props.formData.follow_up_date,
              next_action: props.formData.next_action,
              dba: props.dbaName,
              name: props.formData.name,
              type: props.formData.type,
              link: props.formData.link,
              address: props.formData.address,
              city: props.formData.city,
              state: props.formData.state,
              phone: props.formData.phone,
              email: props.formData.email,
              website: props.formData.website,
            }}
            contextUpdateTrigger={props.contextUpdateTrigger}
            loadDefaultScriptTrigger={props.loadDefaultScriptTrigger}
            trackerSheetId={props.trackerSheetId}
            onStatusChange={(newStatus) => {
              props.handleInputChange("status", newStatus);
              props.setInitialData((prev: any) => ({ ...prev, status: newStatus }));
            }}
          />
        </div>
      )}

      <div
        className={
          props.showAssistant
            ? "w-1/2 flex flex-col overflow-hidden pl-2"
            : "w-full flex flex-col overflow-hidden"
        }
      >
        {!props.row ? (
          <div className="flex items-center justify-center h-64">
            <p>No store data available</p>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto">
              <DndContext
                sensors={props.sensors}
                collisionDetection={closestCenter}
                onDragEnd={props.handleDragEnd}
              >
                <Accordion type="multiple" defaultValue={["sales-info"]} className="w-full" data-testid="accordion-store-details">
                  <SortableContext items={props.sectionOrder} strategy={verticalListSortingStrategy}>
                    {props.sectionOrder.map((sectionId: string) => {
                      if (sectionId === "sales-info") {
                        return (
                          <StoreDetailsSalesInfoSection
                            key="sales-info"
                            corporateAddress={props.corporateAddress}
                            corporateCity={props.corporateCity}
                            corporateEmail={props.corporateEmail}
                            corporatePhone={props.corporatePhone}
                            corporateState={props.corporateState}
                            currentDbaStores={props.currentDbaStores}
                            currentUser={props.currentUser}
                            dbaName={props.dbaName}
                            formData={props.formData}
                            handleInputChange={props.handleInputChange}
                            headOfficeLink={props.headOfficeLink}
                            isClaiming={props.isClaiming}
                            isSavingReminder={props.isSavingReminder}
                            multiLocationMode={props.multiLocationMode}
                            onOpenChange={props.onOpenChange}
                            parentCreationType={props.parentCreationType}
                            parentPocEmail={props.parentPocEmail}
                            parentPocName={props.parentPocName}
                            parentPocPhone={props.parentPocPhone}
                            queryClient={props.queryClient}
                            refetch={props.refetch}
                            reminderSectionOpen={props.reminderSectionOpen}
                            row={props.row}
                            selectedParentLink={props.selectedParentLink}
                            selectedStores={props.selectedStores}
                            setCorporateAddress={props.setCorporateAddress}
                            setCorporateCity={props.setCorporateCity}
                            setCorporateEmail={props.setCorporateEmail}
                            setCorporatePhone={props.setCorporatePhone}
                            setCorporateState={props.setCorporateState}
                            setCurrentDbaStores={props.setCurrentDbaStores}
                            setDbaName={props.setDbaName}
                            setHeadOfficeLink={props.setHeadOfficeLink}
                            setInitialData={props.setInitialData}
                            setIsClaiming={props.setIsClaiming}
                            setIsSavingReminder={props.setIsSavingReminder}
                            setMultiLocationMode={props.setMultiLocationMode}
                            setParentCreationType={props.setParentCreationType}
                            setParentPocEmail={props.setParentPocEmail}
                            setParentPocName={props.setParentPocName}
                            setParentPocPhone={props.setParentPocPhone}
                            setParseLocationsDialog={props.setParseLocationsDialog}
                            setReminderSectionOpen={props.setReminderSectionOpen}
                            setSelectedParentLink={props.setSelectedParentLink}
                            setSelectedStores={props.setSelectedStores}
                            setStoreSearch={props.setStoreSearch}
                            setStoreSearchDialog={props.setStoreSearchDialog}
                            statusColors={props.statusColors}
                            statusOptions={props.statusOptions}
                            storeSheetId={props.storeSheetId}
                            toast={props.toast}
                            trackerSheetId={props.trackerSheetId}
                            upsertTrackerFieldsMutation={props.upsertTrackerFieldsMutation}
                            userPreferences={props.userPreferences}
                          />
                        );
                      }

                      if (sectionId === "basic-info") return null;

                      if (sectionId === "contact-info") {
                        return (
                          <StoreDetailsContactInfoSection
                            key="contact-info"
                            formData={props.formData}
                            handleInputChange={props.handleInputChange}
                          />
                        );
                      }

                      return null;
                    })}
                  </SortableContext>

                  <StoreDetailsDbaManagementSection
                    childLocations={props.childLocations}
                    currentStoreLink={props.currentStoreLink}
                    formData={props.formData}
                    queryClient={props.queryClient}
                    refetch={props.refetch}
                    refetchChildren={props.refetchChildren}
                    toast={props.toast}
                  />
                </Accordion>
              </DndContext>
            </div>

            {props.showAssistant && (
              <div className="sticky bottom-0 bg-background border-t pt-4 mt-4 flex justify-end gap-2">
                <StoreDetailsActionButtons
                  currentColors={props.currentColors}
                  isSavePending={savePending}
                  onCall={props.handleCallFromDetails}
                  onCancel={() => props.onOpenChange(false)}
                  onSave={props.handleSave}
                  onSaveAndExit={props.handleSaveAndExit}
                  voip={props.voip}
                />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
