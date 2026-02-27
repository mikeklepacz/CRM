import { GripVertical, Loader2, Pencil, Trash2 } from "lucide-react";
import { CSS } from "@dnd-kit/utilities";
import { useSortable } from "@dnd-kit/sortable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { PipelineStage } from "@/components/org-admin/org-admin.types";

type Props = {
  stage: PipelineStage;
  onEdit: () => void;
  onDelete: () => void;
  isDeleting: boolean;
};

export function SortableStageItem({ stage, onEdit, onDelete, isDeleting }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: stage.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const getStageTypeBadgeVariant = (type: string) => {
    switch (type) {
      case "action":
        return "default";
      case "decision":
        return "secondary";
      case "wait":
        return "outline";
      case "complete":
        return "default";
      default:
        return "outline";
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 p-3 border rounded-md bg-background"
      data-testid={`stage-item-${stage.id}`}
    >
      <button
        type="button"
        className="cursor-grab touch-none text-muted-foreground hover:text-foreground"
        {...attributes}
        {...listeners}
        data-testid={`drag-handle-${stage.id}`}
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <div className="flex-1 flex items-center gap-3">
        <span className="font-medium" data-testid={`stage-name-${stage.id}`}>{stage.name}</span>
        <Badge variant={getStageTypeBadgeVariant(stage.stageType)} className="no-default-hover-elevate no-default-active-elevate">
          {stage.stageType}
        </Badge>
        {stage.isTerminal && <Badge variant="outline" className="no-default-hover-elevate no-default-active-elevate text-xs">Terminal</Badge>}
      </div>
      <div className="flex items-center gap-1">
        <Button size="icon" variant="ghost" onClick={onEdit} data-testid={`button-edit-stage-${stage.id}`}>
          <Pencil className="h-4 w-4" />
        </Button>
        <Button size="icon" variant="ghost" onClick={onDelete} disabled={isDeleting} data-testid={`button-delete-stage-${stage.id}`}>
          {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4 text-destructive" />}
        </Button>
      </div>
    </div>
  );
}
