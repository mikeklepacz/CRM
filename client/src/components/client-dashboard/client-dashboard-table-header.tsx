import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight, EyeOff, SortAsc, SortDesc } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TableHead, TableHeader, TableRow } from "@/components/ui/table";

type ResizingColumnState = {
  column: string;
  startX: number;
  startWidth: number;
};

type ClientDashboardTableHeaderProps = {
  columnOrder: string[];
  columnWidths: Record<string, number>;
  contextMenuColumn: string | null;
  customColors: {
    background?: string;
    headerBackground?: string;
  };
  editableColumns: string[];
  freezeFirstColumn: boolean;
  nameFilter: string;
  cityFilter: string;
  sortColumn: string | null;
  sortDirection: "asc" | "desc";
  visibleHeaders: string[];
  onCityFilterChange: (value: string) => void;
  onContextMenuColumnChange: (value: string | null) => void;
  onNameFilterChange: (value: string) => void;
  onResizeColumnStart: (value: ResizingColumnState) => void;
  onSort: (header: string) => void;
  onSortColumnChange: (value: string) => void;
  onSortDirectionChange: (value: "asc" | "desc") => void;
  onToggleColumn: (header: string) => void;
  onMoveColumnLeft: (header: string) => void;
  onMoveColumnRight: (header: string) => void;
};

export function ClientDashboardTableHeader({
  columnOrder,
  columnWidths,
  contextMenuColumn,
  customColors,
  editableColumns,
  freezeFirstColumn,
  nameFilter,
  cityFilter,
  sortColumn,
  sortDirection,
  visibleHeaders,
  onCityFilterChange,
  onContextMenuColumnChange,
  onNameFilterChange,
  onResizeColumnStart,
  onSort,
  onSortColumnChange,
  onSortDirectionChange,
  onToggleColumn,
  onMoveColumnLeft,
  onMoveColumnRight,
}: ClientDashboardTableHeaderProps) {
  return (
    <TableHeader className="sticky top-0 z-10" style={{ backgroundColor: customColors.headerBackground || customColors.background }}>
      <TableRow>
        {visibleHeaders.map((header: string, index: number) => {
          const isNameColumn = header.toLowerCase() === "name" || header.toLowerCase() === "company";
          const isCityColumn = header.toLowerCase() === "city";
          const hasInlineSearch = isNameColumn || isCityColumn;
          const isFirstColumn = index === 0;

          return (
            <TableHead
              key={header}
              className="whitespace-nowrap relative group text-center"
              style={{
                width: columnWidths[header] || 200,
                ...(isFirstColumn && freezeFirstColumn
                  ? {
                      position: "sticky",
                      left: 0,
                      zIndex: 20,
                      backgroundColor: customColors.headerBackground || customColors.background,
                    }
                  : {}),
              }}
            >
              <div className="flex flex-col gap-1 pr-4">
                <div className="flex items-center justify-between">
                  <DropdownMenu
                    open={contextMenuColumn === header}
                    onOpenChange={(open) => onContextMenuColumnChange(open ? header : null)}
                  >
                    <DropdownMenuTrigger asChild>
                      <button
                        onClick={() => onSort(header)}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          onContextMenuColumnChange(header);
                        }}
                        className="flex items-center gap-2 hover:text-primary transition-colors cursor-pointer flex-1"
                        data-testid={`button-sort-${header}`}
                      >
                        <span>
                          {header}
                          {editableColumns.includes(header) && (
                            <span className="ml-1 text-xs text-muted-foreground">✏️</span>
                          )}
                        </span>
                        {sortColumn === header ? (
                          sortDirection === "asc" ? (
                            <ArrowUp className="h-4 w-4" />
                          ) : (
                            <ArrowDown className="h-4 w-4" />
                          )
                        ) : (
                          <ArrowUpDown className="h-4 w-4 opacity-30" />
                        )}
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-48">
                      <DropdownMenuItem
                        onClick={() => {
                          onSortColumnChange(header);
                          onSortDirectionChange("asc");
                          onContextMenuColumnChange(null);
                        }}
                        data-testid={`menu-sort-asc-${header}`}
                      >
                        <SortAsc className="mr-2 h-4 w-4" />
                        Sort A → Z
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => {
                          onSortColumnChange(header);
                          onSortDirectionChange("desc");
                          onContextMenuColumnChange(null);
                        }}
                        data-testid={`menu-sort-desc-${header}`}
                      >
                        <SortDesc className="mr-2 h-4 w-4" />
                        Sort Z → A
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => {
                          onToggleColumn(header);
                          onContextMenuColumnChange(null);
                        }}
                        data-testid={`menu-hide-${header}`}
                      >
                        <EyeOff className="mr-2 h-4 w-4" />
                        Hide Column
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => {
                          onMoveColumnLeft(header);
                          onContextMenuColumnChange(null);
                        }}
                        disabled={columnOrder.filter((h: string) => !["error", "title"].includes(h.toLowerCase())).indexOf(header) === 0}
                        data-testid={`menu-move-left-${header}`}
                      >
                        <ChevronLeft className="mr-2 h-4 w-4" />
                        Move Left
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => {
                          onMoveColumnRight(header);
                          onContextMenuColumnChange(null);
                        }}
                        disabled={columnOrder.filter((h: string) => !["error", "title"].includes(h.toLowerCase())).indexOf(header) === columnOrder.filter((h: string) => !["error", "title"].includes(h.toLowerCase())).length - 1}
                        data-testid={`menu-move-right-${header}`}
                      >
                        <ChevronRight className="mr-2 h-4 w-4" />
                        Move Right
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {hasInlineSearch && (
                  <Input
                    placeholder={`Filter ${header}...`}
                    value={isNameColumn ? nameFilter : cityFilter}
                    onChange={(e) => {
                      e.stopPropagation();
                      if (isNameColumn) {
                        onNameFilterChange(e.target.value);
                      } else {
                        onCityFilterChange(e.target.value);
                      }
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className="h-7 text-xs"
                    data-testid={`input-filter-${header.toLowerCase()}`}
                  />
                )}

                <div
                  className="absolute right-0 top-0 bottom-0 w-4 cursor-col-resize hover:bg-primary/50 transition-colors z-20 flex items-center justify-center"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    document.body.style.userSelect = "none";
                    onResizeColumnStart({
                      column: header,
                      startX: e.clientX,
                      startWidth: columnWidths[header] || 200,
                    });
                  }}
                  title="Drag to resize column"
                >
                  <div className="w-0.5 h-8 bg-border group-hover:bg-primary/50 transition-colors" />
                </div>
              </div>
            </TableHead>
          );
        })}
      </TableRow>
    </TableHeader>
  );
}
