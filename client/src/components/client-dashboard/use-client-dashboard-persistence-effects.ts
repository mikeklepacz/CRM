import { useEffect } from "react";
import { apiRequest } from "@/lib/queryClient";

interface UseClientDashboardPersistenceEffectsProps {
  colorRowByStatus: boolean;
  columnOrder: string[];
  columnWidths: Record<string, number>;
  editedCells: Record<string, any>;
  fontSize: number;
  freezeFirstColumn: boolean;
  preferencesLoaded: boolean;
  resizingColumn: { column: string; startX: number; startWidth: number } | null;
  rowHeight: number;
  selectedCities: Set<string>;
  selectedStates: Set<string>;
  setColumnWidths: (value: any) => void;
  setEditedCells: (value: any) => void;
  setResizingColumn: (value: any) => void;
  showMyStoresOnly: boolean;
  showStateless: boolean;
  showUnclaimedOnly: boolean;
  statusOptions: string[];
  textAlign: "left" | "center" | "right" | "justify";
  toast: (props: { title: string; description: string; variant?: "default" | "destructive" }) => void;
  updateCellMutation: { mutateAsync: (payload: any) => Promise<any> };
  userPreferences: any;
  verticalAlign: "top" | "middle" | "bottom";
  visibleColumns: Record<string, boolean>;
}

export function useClientDashboardPersistenceEffects(props: UseClientDashboardPersistenceEffectsProps) {
  useEffect(() => {
    if (Object.keys(props.editedCells).length === 0) return;

    const saveChanges = async () => {
      try {
        const updates = Object.values(props.editedCells);
        for (const { sheetId, rowIndex, column, value } of updates as any[]) {
          await props.updateCellMutation.mutateAsync({ sheetId, rowIndex, column, value });
        }
        props.setEditedCells({});
      } catch (error: any) {
        props.toast({
          title: "Auto-save failed",
          description: error.message || "Failed to save changes",
          variant: "destructive",
        });
      }
    };

    const timeoutId = setTimeout(saveChanges, 500);
    return () => clearTimeout(timeoutId);
  }, [props.editedCells]);

  useEffect(() => {
    if (!props.preferencesLoaded) return;

    const timeoutId = setTimeout(async () => {
      try {
        await apiRequest("PUT", "/api/user/preferences", {
          visibleColumns: props.visibleColumns,
          columnOrder: props.columnOrder,
          columnWidths: props.columnWidths,
          selectedStates: Array.from(props.selectedStates),
          showStateless: props.showStateless,
          selectedCities: Array.from(props.selectedCities),
          fontSize: props.fontSize,
          rowHeight: props.rowHeight,
          textAlign: props.textAlign,
          verticalAlign: props.verticalAlign,
          statusOptions: props.statusOptions,
          freezeFirstColumn: props.freezeFirstColumn,
          showMyStoresOnly: props.showMyStoresOnly,
          showUnclaimedOnly: props.showUnclaimedOnly,
          colorRowByStatus: props.userPreferences?.colorRowByStatus ?? props.colorRowByStatus,
        });

        try {
          localStorage.setItem(
            "crm_table_preferences",
            JSON.stringify({
              visibleColumns: props.visibleColumns,
              columnOrder: props.columnOrder,
              columnWidths: props.columnWidths,
              timestamp: Date.now(),
            }),
          );
        } catch (error) {
          console.warn("Failed to save to localStorage:", error);
        }
      } catch (error) {
        console.error("Failed to save preferences:", error);
      }
    }, 1000);

    return () => clearTimeout(timeoutId);
  }, [
    props.visibleColumns,
    props.columnOrder,
    props.columnWidths,
    props.selectedStates,
    props.selectedCities,
    props.fontSize,
    props.rowHeight,
    props.preferencesLoaded,
    props.textAlign,
    props.verticalAlign,
    props.statusOptions,
    props.freezeFirstColumn,
    props.showMyStoresOnly,
    props.showUnclaimedOnly,
    props.showStateless,
  ]);

  useEffect(() => {
    if (!props.resizingColumn) return;

    document.body.style.cursor = "col-resize";

    const handleMouseMove = (event: MouseEvent) => {
      event.preventDefault();
      const diff = event.clientX - props.resizingColumn!.startX;
      const newWidth = Math.max(100, props.resizingColumn!.startWidth + diff);
      props.setColumnWidths((prev: Record<string, number>) => ({
        ...prev,
        [props.resizingColumn!.column]: newWidth,
      }));
    };

    const handleMouseUp = () => {
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      props.setResizingColumn(null);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [props.resizingColumn, props.setColumnWidths, props.setResizingColumn]);
}
