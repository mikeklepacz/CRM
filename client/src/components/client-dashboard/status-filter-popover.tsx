import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Settings2 } from "lucide-react";

type StatusFilterPopoverProps = {
  onClearAllStatuses: () => void;
  onSelectAllStatuses: () => void;
  onToggleStatus: (status: string) => void;
  selectedStatuses: Set<string>;
  statusButtonColor?: string;
  statusOptions: string[];
};

export function StatusFilterPopover({
  onClearAllStatuses,
  onSelectAllStatuses,
  onToggleStatus,
  selectedStatuses,
  statusButtonColor,
  statusOptions,
}: StatusFilterPopoverProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          data-testid="button-status-filter"
          style={
            statusButtonColor
              ? { backgroundColor: statusButtonColor, borderColor: statusButtonColor }
              : undefined
          }
        >
          <Settings2 className="mr-2 h-4 w-4" />
          Status ({selectedStatuses.size > 0 ? selectedStatuses.size : "All"})
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium">Filter by Status</h4>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={onSelectAllStatuses}
                data-testid="button-select-all-statuses"
              >
                All
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClearAllStatuses}
                data-testid="button-clear-all-statuses"
              >
                None
              </Button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">Select which statuses to display</p>
          <ScrollArea className="h-64">
            <div className="space-y-2">
              {statusOptions.map((status) => (
                <div key={status} className="flex items-center gap-2">
                  <Checkbox
                    id={`status-${status}`}
                    checked={selectedStatuses.has(status)}
                    onCheckedChange={() => onToggleStatus(status)}
                    data-testid={`checkbox-status-${status}`}
                  />
                  <Label htmlFor={`status-${status}`} className="text-sm cursor-pointer flex-1">
                    {status}
                  </Label>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      </PopoverContent>
    </Popover>
  );
}
