import { StoreSearchDialog } from "@/components/store-details/store-search-dialog";
import { ParseLocationsDialog } from "@/components/parse-locations-dialog";

export function StoreDetailsDialogAuxDialogs(props: any) {
  return (
    <>
      <StoreSearchDialog
        open={props.storeSearchDialog}
        onOpenChange={props.setStoreSearchDialog}
        filteredStores={props.filteredStores}
        isLoadingStores={props.isLoadingStores}
        onSearchChange={props.setStoreSearch}
        onSelectionChange={props.setSelectedStores}
        selectedStores={props.selectedStores}
        storeSearch={props.storeSearch}
      />

      <ParseLocationsDialog
        open={props.parseLocationsDialog}
        onOpenChange={props.setParseLocationsDialog}
        storeSheetId={props.storeSheetId}
        category={props.getRowValue(["Category", "category"])}
        onStoresSelected={(stores) => {
          props.setSelectedStores((prev: any[]) => {
            const newStores = stores.filter((s: any) => !prev.some((existing) => existing.link === s.link));
            return [...prev, ...newStores];
          });
        }}
      />
    </>
  );
}
