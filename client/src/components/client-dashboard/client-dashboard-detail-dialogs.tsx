import { AddressEditSheetDialog } from "@/components/client-dashboard/address-edit-sheet-dialog";
import { ExpandedCellDialog } from "@/components/client-dashboard/expanded-cell-dialog";
import { StoreDetailsSheetDialog } from "@/components/client-dashboard/store-details-sheet-dialog";
import { VCardExportDialog } from "@/components/client-dashboard/vcard-export-dialog";

type ClientDashboardDetailDialogsProps = {
  actionButtonColor?: string;
  addressEditDialog: any;
  allVisibleStores: any[];
  contextUpdateTrigger: number;
  currentColors: any;
  expandedCell: any;
  exportVCardDialogOpen: boolean;
  filteredCount: number;
  joinColumn: string;
  listName: string;
  loadDefaultScriptTrigger: number;
  onAddressClose: () => void;
  onExpandedClose: () => void;
  onExpandedOpenChange: (open: boolean) => void;
  onExpandedSave: () => void;
  onExpandedValueChange: (value: string) => void;
  onNavigateToStore: (row: any) => void;
  onStoreDetailsClose: () => void;
  onVCardCancel: () => void;
  onVCardConfirm: () => Promise<void> | void;
  onVCardFieldsChange: (fields: any) => void;
  onVCardListNameChange: (value: string) => void;
  onVCardOpenChange: (open: boolean) => void;
  onVCardPlatformChange: (value: any) => void;
  platform: any;
  refetch: () => Promise<any>;
  statusColors: any;
  statusOptions: string[];
  storeDetailsDialog: any;
  storeSheetId: string;
  trackerSheetId: string;
  vCardFields: any;
  onContextUpdateTriggerChange: (value: any) => void;
  onLoadDefaultScriptTriggerChange: (value: any) => void;
};

export function ClientDashboardDetailDialogs({
  actionButtonColor,
  addressEditDialog,
  allVisibleStores,
  contextUpdateTrigger,
  currentColors,
  expandedCell,
  exportVCardDialogOpen,
  filteredCount,
  joinColumn,
  listName,
  loadDefaultScriptTrigger,
  onAddressClose,
  onContextUpdateTriggerChange,
  onExpandedClose,
  onExpandedOpenChange,
  onExpandedSave,
  onExpandedValueChange,
  onLoadDefaultScriptTriggerChange,
  onNavigateToStore,
  onStoreDetailsClose,
  onVCardCancel,
  onVCardConfirm,
  onVCardFieldsChange,
  onVCardListNameChange,
  onVCardOpenChange,
  onVCardPlatformChange,
  platform,
  refetch,
  statusColors,
  statusOptions,
  storeDetailsDialog,
  storeSheetId,
  trackerSheetId,
  vCardFields,
}: ClientDashboardDetailDialogsProps) {
  return (
    <>
      <ExpandedCellDialog
        open={!!expandedCell}
        expandedCell={expandedCell}
        actionButtonColor={actionButtonColor}
        onOpenChange={onExpandedOpenChange}
        onValueChange={onExpandedValueChange}
        onSave={onExpandedSave}
        onClose={onExpandedClose}
      />

      <AddressEditSheetDialog
        dialog={addressEditDialog}
        trackerSheetId={trackerSheetId}
        joinColumn={joinColumn}
        onClose={onAddressClose}
      />

      <StoreDetailsSheetDialog
        dialog={storeDetailsDialog}
        trackerSheetId={trackerSheetId}
        storeSheetId={storeSheetId}
        refetch={refetch}
        currentColors={currentColors}
        statusOptions={statusOptions}
        statusColors={statusColors}
        contextUpdateTrigger={contextUpdateTrigger}
        loadDefaultScriptTrigger={loadDefaultScriptTrigger}
        allVisibleStores={allVisibleStores}
        onClose={onStoreDetailsClose}
        onContextUpdateTriggerChange={onContextUpdateTriggerChange}
        onLoadDefaultScriptTriggerChange={onLoadDefaultScriptTriggerChange}
        onNavigateToStore={onNavigateToStore}
      />

      <VCardExportDialog
        open={exportVCardDialogOpen}
        filteredCount={filteredCount}
        fields={vCardFields}
        listName={listName}
        platform={platform}
        onOpenChange={onVCardOpenChange}
        onFieldsChange={onVCardFieldsChange}
        onListNameChange={onVCardListNameChange}
        onPlatformChange={onVCardPlatformChange}
        onCancel={onVCardCancel}
        onConfirm={onVCardConfirm}
      />
    </>
  );
}
