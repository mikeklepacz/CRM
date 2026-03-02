import { Button } from "@/components/ui/button";
import { TableCell, TableRow } from "@/components/ui/table";
import { GripVertical, Edit, Trash2 } from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Status } from "./types";

export function SortableStatusRow({
  status,
  previewMode,
  onEdit,
  onDelete,
}: {
  status: Status;
  previewMode: "light" | "dark";
  onEdit: (status: Status) => void;
  onDelete: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: status.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <TableRow ref={setNodeRef} style={style} data-testid={`row-status-${status.id}`}>
      <TableCell className="w-12">
        <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing p-1 hover-elevate rounded" data-testid={`drag-handle-${status.id}`}>
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </div>
      </TableCell>
      <TableCell className="font-medium">{status.name}</TableCell>
      <TableCell>
        <div
          className="inline-flex items-center justify-center px-3 py-1 rounded-md text-xs font-medium"
          style={{
            backgroundColor: previewMode === "light" ? status.lightBgColor : status.darkBgColor,
            color: previewMode === "light" ? status.lightTextColor : status.darkTextColor,
          }}
        >
          {status.name}
        </div>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-1">
          <Button size="icon" variant="ghost" onClick={() => onEdit(status)} data-testid={`button-edit-${status.id}`}>
            <Edit className="h-4 w-4" />
          </Button>
          <Button size="icon" variant="ghost" onClick={() => onDelete(status.id)} data-testid={`button-delete-${status.id}`}>
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}
