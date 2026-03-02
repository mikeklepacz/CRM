import { DndContext, closestCenter, type DragEndEvent, type SensorDescriptor } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SortableStatusRow } from "./sortable-row";
import type { Status } from "./types";

interface StatusTableSectionProps {
  sensors: SensorDescriptor<any>[];
  isLoading: boolean;
  sortedStatuses: Status[];
  previewMode: "light" | "dark";
  onDragEnd: (event: DragEndEvent) => void;
  onEdit: (status: Status) => void;
  onDelete: (id: string) => void;
}

export function StatusTableSection({
  sensors,
  isLoading,
  sortedStatuses,
  previewMode,
  onDragEnd,
  onEdit,
  onDelete,
}: StatusTableSectionProps) {
  return (
    <div className="border rounded-lg">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12"></TableHead>
              <TableHead>Name</TableHead>
              <TableHead className="w-40">Preview</TableHead>
              <TableHead className="w-20">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground">
                  Loading statuses...
                </TableCell>
              </TableRow>
            ) : sortedStatuses.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground">
                  No statuses found. Create your first status above.
                </TableCell>
              </TableRow>
            ) : (
              <SortableContext items={sortedStatuses.map((s) => s.id)} strategy={verticalListSortingStrategy}>
                {sortedStatuses.map((status) => (
                  <SortableStatusRow key={status.id} status={status} previewMode={previewMode} onEdit={onEdit} onDelete={onDelete} />
                ))}
              </SortableContext>
            )}
          </TableBody>
        </Table>
      </DndContext>
    </div>
  );
}
