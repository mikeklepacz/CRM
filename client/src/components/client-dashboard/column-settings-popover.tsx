import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ChevronLeft,
  ChevronRight,
  Maximize2,
  RotateCcw,
  Settings2,
} from "lucide-react";

type ColumnSettingsPopoverProps = {
  autoFitColumns: () => void;
  columnOrder: string[];
  columnsButtonColor?: string;
  editableColumns: string[];
  moveColumnLeft: (header: string) => void;
  moveColumnRight: (header: string) => void;
  onResetColumns: () => void;
  toggleColumn: (header: string) => void;
  visibleColumns: Record<string, boolean>;
};

export function ColumnSettingsPopover({
  autoFitColumns,
  columnOrder,
  columnsButtonColor,
  editableColumns,
  moveColumnLeft,
  moveColumnRight,
  onResetColumns,
  toggleColumn,
  visibleColumns,
}: ColumnSettingsPopoverProps) {
  const filteredOrder = columnOrder.filter(
    (header) => !["error", "title"].includes(header.toLowerCase()),
  );

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          data-testid="button-column-settings"
          style={
            columnsButtonColor
              ? { backgroundColor: columnsButtonColor, borderColor: columnsButtonColor }
              : undefined
          }
        >
          <Settings2 className="mr-2 h-4 w-4" />
          Columns
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="font-medium">Manage Columns</h4>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={autoFitColumns}
                data-testid="button-autofit-columns"
              >
                <Maximize2 className="mr-2 h-3 w-3" />
                Auto-fit
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onResetColumns}
                data-testid="button-reset-columns"
              >
                <RotateCcw className="mr-2 h-3 w-3" />
                Reset
              </Button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Show/hide and reorder columns (doesn't affect Google Sheets)
          </p>
          <ScrollArea className="h-72">
            <div className="space-y-2">
              {filteredOrder.map((header) => {
                const filteredIndex = filteredOrder.indexOf(header);

                return (
                  <div key={header} className="flex items-center gap-2 group">
                    <Checkbox
                      id={`col-${header}`}
                      checked={visibleColumns[header]}
                      onCheckedChange={() => toggleColumn(header)}
                      data-testid={`checkbox-column-${header}`}
                    />
                    <Label htmlFor={`col-${header}`} className="text-sm cursor-pointer flex-1">
                      {header}
                      {editableColumns.includes(header) && (
                        <span className="ml-2 text-xs text-muted-foreground">✏️</span>
                      )}
                    </Label>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => moveColumnLeft(header)}
                        disabled={filteredIndex === 0}
                        data-testid={`button-move-left-${header}`}
                      >
                        <ChevronLeft className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => moveColumnRight(header)}
                        disabled={filteredIndex === filteredOrder.length - 1}
                        data-testid={`button-move-right-${header}`}
                      >
                        <ChevronRight className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </div>
      </PopoverContent>
    </Popover>
  );
}
