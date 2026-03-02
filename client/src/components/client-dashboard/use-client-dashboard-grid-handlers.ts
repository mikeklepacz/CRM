import { canAccessAdminFeatures } from "@/lib/authUtils";
import { apiRequest } from "@/lib/queryClient";
import { getLinkValue } from "@/components/client-dashboard/region-utils";
import type { MergedDataRow } from "@/components/client-dashboard/client-dashboard.types";

interface UseClientDashboardGridHandlersProps {
  currentUser: any;
  expandedCell: { row: any; column: string; value: string; isEditable: boolean } | null;
  selectedFranchise: any;
  setEditedCells: (value: any) => void;
  setExpandedCell: (value: any) => void;
  setLoadDefaultScriptTrigger: (value: any) => void;
  setStoreDetailsDialog: (value: any) => void;
  storeSheetId: string;
  toast: (props: { title: string; description: string; variant?: "default" | "destructive" }) => void;
  trackerHeaders: string[];
  trackerSheetId: string;
  upsertTrackerMutation: { mutate: (payload: any) => void };
  updateCellMutation: { mutate: (payload: any) => void };
  refetch: () => Promise<any>;
  userPreferences: any;
  mergedData: any;
  joinColumn: string;
}

export function useClientDashboardGridHandlers(props: UseClientDashboardGridHandlersProps) {
  const handleCellUpdate = (row: MergedDataRow, column: string, value: any) => {
    if (!canAccessAdminFeatures(props.currentUser)) {
      props.toast({
        title: "Editing Restricted",
        description: "Please use the Store Details popup to make changes.",
        variant: "default",
      });
      return;
    }

    const isStoreColumn = props.mergedData?.storeHeaders?.some((header: string) => header.toLowerCase() === column.toLowerCase());
    const isTrackerColumn = props.mergedData?.trackerHeaders?.some((header: string) => header.toLowerCase() === column.toLowerCase());
    const isUnclaimed = !row._trackerRowIndex;

    if (isTrackerColumn && row._trackerSheetId && row._trackerRowIndex) {
      props.updateCellMutation.mutate({
        sheetId: row._trackerSheetId,
        rowIndex: row._trackerRowIndex,
        column,
        value,
      });
      return;
    }

    if (isTrackerColumn && isUnclaimed) {
      const linkValue = getLinkValue(row);
      if (!linkValue || !props.trackerSheetId) {
        props.toast({
          title: "Error",
          description: "Cannot update tracker column: Missing link value",
          variant: "destructive",
        });
        return;
      }

      props.upsertTrackerMutation.mutate({
        trackerSheetId: props.trackerSheetId,
        link: linkValue,
        updates: { [column]: value },
        shouldAutoClaim: true,
        joinColumn: props.joinColumn,
      });
      return;
    }

    if (isStoreColumn && row._storeSheetId && row._storeRowIndex) {
      const linkValue = getLinkValue(row);
      props.updateCellMutation.mutate({
        sheetId: row._storeSheetId,
        rowIndex: row._storeRowIndex,
        column,
        value,
        shouldAutoClaimRow: isUnclaimed && !!linkValue,
        linkValue,
      });
      return;
    }

    props.toast({
      title: "Error",
      description: `Cannot determine which sheet to update. Column "${column}" not found in sheet headers.`,
      variant: "destructive",
    });
  };

  const handleCellEdit = (row: any, column: string, value: string) => {
    if (!canAccessAdminFeatures(props.currentUser)) {
      props.toast({
        title: "Editing Restricted",
        description: "Please use the Store Details popup to make changes.",
        variant: "default",
      });
      return;
    }

    const isTrackerColumn = props.trackerHeaders.some((header) => header.toLowerCase() === column.toLowerCase());
    const sheetId = isTrackerColumn ? props.trackerSheetId : props.storeSheetId;
    const rowIndex = isTrackerColumn ? row._trackerRowIndex : row._storeRowIndex;
    const rowLink = row.link || row.Link || `row-${rowIndex}`;

    if (!sheetId) return;

    const key = `${rowLink}-${column}-${sheetId}`;
    props.setEditedCells((prev: any) => ({
      ...prev,
      [key]: { link: rowLink, rowIndex, column, value, sheetId, isUnclaimed: !rowIndex },
    }));
  };

  const handleSave = async (editedCells: Record<string, any>) => {
    const edits = Object.values(editedCells);
    if (edits.length === 0) return;

    try {
      await Promise.all(
        edits.map(({ sheetId, rowIndex, column, value }: any) =>
          apiRequest("PUT", `/api/sheets/${sheetId}/update`, { rowIndex, column, value }),
        ),
      );

      props.toast({ title: "Success", description: `${edits.length} changes saved successfully` });
      props.setEditedCells({});
      props.refetch();
    } catch (error: any) {
      props.toast({
        title: "Error",
        description: error.message || "Failed to save some changes. Please try again.",
        variant: "destructive",
      });
    }
  };

  const openExpandedView = (row: any, column: string, value: string, isEditable: boolean) => {
    props.setExpandedCell({ row, column, value, isEditable });
  };

  const saveExpandedCell = () => {
    if (!props.expandedCell) return;
    handleCellUpdate(props.expandedCell.row, props.expandedCell.column, props.expandedCell.value);
    props.setExpandedCell(null);
  };

  const openStoreDetailsFromTableRow = (row: any, autoLoadAssistant: boolean) => {
    props.setStoreDetailsDialog({
      open: true,
      row,
      franchiseContext: props.selectedFranchise
        ? {
            brandName: props.selectedFranchise.brandName,
            allLocations: props.selectedFranchise.locations,
          }
        : undefined,
    });

    if (!autoLoadAssistant) return;
    const autoLoadEnabled = props.userPreferences?.autoLoadScript ?? true;
    if (autoLoadEnabled) {
      const saved = localStorage.getItem("storeDetailsShowAssistant");
      if (saved !== "true") {
        localStorage.setItem("storeDetailsShowAssistant", "true");
      }
      props.setLoadDefaultScriptTrigger((prev: number) => prev + 1);
    }
  };

  return {
    handleCellEdit,
    handleCellUpdate,
    handleSave,
    openExpandedView,
    openStoreDetailsFromTableRow,
    saveExpandedCell,
  };
}
