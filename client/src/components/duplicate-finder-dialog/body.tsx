import { DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Trash2 } from "lucide-react";
import { type DuplicateGroup, type StatusHierarchy } from "@shared/duplicateUtils";
import { DuplicateFinderToolbar } from "./toolbar";
import { DuplicateGroupsList } from "./groups-list";

interface DuplicateFinderBodyProps {
  isDetecting: boolean;
  duplicateGroups: DuplicateGroup[];
  filteredDuplicateGroups: DuplicateGroup[];
  selectedStates: string[];
  allStates: string[];
  showCanadaOnly: boolean;
  stateCounts: Record<string, number>;
  selectedForDeletion: Set<string>;
  markedAsNotDuplicate: Set<string>;
  isSaving: boolean;
  isDeleting: boolean;
  statusHierarchy?: StatusHierarchy;
  onSmartSelect: () => void;
  onSelectedStatesChange: (states: string[]) => void;
  onShowCanadaOnlyChange: (value: boolean) => void;
  onStateChange: (state: string, isChecked: boolean) => void;
  onSaveAllNotDuplicates: () => void;
  onToggleSelection: (link: string, group: DuplicateGroup) => void;
  onToggleNotDuplicate: (link: string) => void;
  onCancel: () => void;
  onDelete: () => void;
}

export function DuplicateFinderBody({
  isDetecting,
  duplicateGroups,
  filteredDuplicateGroups,
  selectedStates,
  allStates,
  showCanadaOnly,
  stateCounts,
  selectedForDeletion,
  markedAsNotDuplicate,
  isSaving,
  isDeleting,
  statusHierarchy,
  onSmartSelect,
  onSelectedStatesChange,
  onShowCanadaOnlyChange,
  onStateChange,
  onSaveAllNotDuplicates,
  onToggleSelection,
  onToggleNotDuplicate,
  onCancel,
  onDelete,
}: DuplicateFinderBodyProps) {
  if (isDetecting) {
    return (
      <div className="py-12 text-center text-muted-foreground">
        <p className="text-lg font-medium">Analyzing stores...</p>
        <p className="text-sm mt-2">This may take a moment for large datasets</p>
      </div>
    );
  }

  if (duplicateGroups.length === 0) {
    return (
      <div className="py-12 text-center text-muted-foreground">
        <AlertTriangle className="mx-auto h-12 w-12 mb-4 opacity-50" />
        <p className="text-lg font-medium">No duplicates found</p>
        <p className="text-sm mt-2">Your store data looks clean!</p>
      </div>
    );
  }

  return (
    <>
      <DuplicateFinderToolbar
        selectedStates={selectedStates}
        allStates={allStates}
        showCanadaOnly={showCanadaOnly}
        stateCounts={stateCounts}
        selectedForDeletionCount={selectedForDeletion.size}
        markedAsNotDuplicateCount={markedAsNotDuplicate.size}
        isSaving={isSaving}
        onSmartSelect={onSmartSelect}
        onSelectedStatesChange={onSelectedStatesChange}
        onShowCanadaOnlyChange={onShowCanadaOnlyChange}
        onStateChange={onStateChange}
        onSaveAllNotDuplicates={onSaveAllNotDuplicates}
      />

      <DuplicateGroupsList
        groups={filteredDuplicateGroups}
        statusHierarchy={statusHierarchy}
        selectedForDeletion={selectedForDeletion}
        markedAsNotDuplicate={markedAsNotDuplicate}
        onToggleSelection={onToggleSelection}
        onToggleNotDuplicate={onToggleNotDuplicate}
      />

      <DialogFooter>
        <Button variant="outline" onClick={onCancel} data-testid="button-cancel">
          Cancel
        </Button>
        <Button
          variant="destructive"
          onClick={onDelete}
          disabled={selectedForDeletion.size === 0 || isDeleting}
          data-testid="button-delete-selected"
        >
          {isDeleting ? (
            <>Deleting...</>
          ) : (
            <>
              <Trash2 className="mr-2 h-4 w-4" />
              Delete {selectedForDeletion.size} {selectedForDeletion.size === 1 ? "Store" : "Stores"}
            </>
          )}
        </Button>
      </DialogFooter>
    </>
  );
}
