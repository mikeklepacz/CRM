import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Ban, Sparkles } from "lucide-react";
import { StateFilterPopover } from "./state-filter-popover";

interface ToolbarProps {
  selectedStates: string[];
  allStates: string[];
  showCanadaOnly: boolean;
  stateCounts: Record<string, number>;
  selectedForDeletionCount: number;
  markedAsNotDuplicateCount: number;
  isSaving: boolean;
  onSmartSelect: () => void;
  onSelectedStatesChange: (states: string[]) => void;
  onShowCanadaOnlyChange: (value: boolean) => void;
  onStateChange: (state: string, isChecked: boolean) => void;
  onSaveAllNotDuplicates: () => void;
}

export function DuplicateFinderToolbar({
  selectedStates,
  allStates,
  showCanadaOnly,
  stateCounts,
  selectedForDeletionCount,
  markedAsNotDuplicateCount,
  isSaving,
  onSmartSelect,
  onSelectedStatesChange,
  onShowCanadaOnlyChange,
  onStateChange,
  onSaveAllNotDuplicates,
}: ToolbarProps) {
  return (
    <div className="flex items-center justify-between gap-4 pb-4">
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={onSmartSelect} data-testid="button-smart-select">
          <Sparkles className="mr-2 h-4 w-4" />
          Smart Select
        </Button>
        <StateFilterPopover
          allStates={allStates}
          selectedStates={selectedStates}
          showCanadaOnly={showCanadaOnly}
          stateCounts={stateCounts}
          onSelectedStatesChange={onSelectedStatesChange}
          onShowCanadaOnlyChange={onShowCanadaOnlyChange}
          onStateChange={onStateChange}
        />
      </div>
      <div className="flex items-center gap-2">
        {markedAsNotDuplicateCount > 0 && (
          <Button
            variant="default"
            size="sm"
            onClick={onSaveAllNotDuplicates}
            disabled={isSaving}
            data-testid="button-save-all-not-duplicates"
          >
            <Ban className="mr-2 h-3 w-3" />
            {isSaving ? "Saving..." : `Save All (${markedAsNotDuplicateCount})`}
          </Button>
        )}
        <Badge variant="secondary" data-testid="badge-selection-count">
          {selectedForDeletionCount} selected for deletion
        </Badge>
      </div>
    </div>
  );
}
