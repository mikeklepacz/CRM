import { Button } from "@/components/ui/button";

interface ResultsActionsProps {
  selectedCount: number;
  onCancel: () => void;
  onStartOver: () => void;
  onAddSelected: () => void;
}

export const ResultsActions = ({
  selectedCount,
  onCancel,
  onStartOver,
  onAddSelected,
}: ResultsActionsProps) => {
  return (
    <div className="flex justify-between gap-2 pt-2 border-t">
      <Button variant="outline" onClick={onCancel} data-testid="button-cancel-results">
        Cancel
      </Button>
      <div className="flex gap-2">
        <Button variant="outline" onClick={onStartOver} data-testid="button-start-over">
          Start Over
        </Button>
        <Button onClick={onAddSelected} disabled={selectedCount === 0} data-testid="button-add-selected">
          Add Selected ({selectedCount})
        </Button>
      </div>
    </div>
  );
};
