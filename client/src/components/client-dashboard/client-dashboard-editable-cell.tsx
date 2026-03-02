import { format, isValid, parse } from "date-fns";
import { Calendar as CalendarIcon, Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type StatusColorMap = Record<string, { background: string; text: string }>;

type ClientDashboardEditableCellProps = {
  cellValue: string;
  comboboxKey: string;
  header: string;
  isAdmin: boolean;
  isDateColumn: boolean;
  isStateColumn: boolean;
  isStatusColumn: boolean;
  openCombobox: string | null;
  row: any;
  rowKey: string | number;
  statusColors: StatusColorMap;
  statusOptions: string[];
  uniqueStates: string[];
  onCellEdit: (row: any, header: string, value: string) => void;
  onCellUpdate: (row: any, header: string, value: string) => void;
  onOpenComboboxChange: (value: string | null) => void;
};

export function ClientDashboardEditableCell({
  cellValue,
  comboboxKey,
  header,
  isAdmin,
  isDateColumn,
  isStateColumn,
  isStatusColumn,
  openCombobox,
  row,
  rowKey,
  statusColors,
  statusOptions,
  uniqueStates,
  onCellEdit,
  onCellUpdate,
  onOpenComboboxChange,
}: ClientDashboardEditableCellProps) {
  const hasData = cellValue.length > 0;
  const isComboboxOpen = isAdmin && openCombobox === comboboxKey;

  const closeCombobox = () => onOpenComboboxChange(null);

  const renderDateInput = () => (
    <Popover open={isComboboxOpen} onOpenChange={(open) => isAdmin && onOpenComboboxChange(open ? comboboxKey : null)}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="w-full justify-start text-left font-normal"
          data-testid={`button-date-${rowKey}-${header}`}
          disabled={!isAdmin}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {hasData ? (cellValue || "Pick a date") : "Pick a date"}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={hasData && cellValue ? (() => {
            try {
              const parsed = parse(cellValue, "M/d/yyyy", new Date());
              return isValid(parsed) ? parsed : undefined;
            } catch {
              return undefined;
            }
          })() : undefined}
          onSelect={(date) => {
            if (date) {
              onCellUpdate(row, header, format(date, "M/d/yyyy"));
            }
            closeCombobox();
          }}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );

  const renderStatusInput = () => (
    <Select value={cellValue || ""} onValueChange={(value) => onCellUpdate(row, header, value)} disabled={!isAdmin}>
      <SelectTrigger
        className="w-full"
        data-testid={`button-status-${rowKey}-${header}`}
        disabled={!isAdmin}
        style={hasData && cellValue && statusColors[cellValue] ? {
          backgroundColor: statusColors[cellValue].background,
          color: statusColors[cellValue].text,
        } : undefined}
      >
        <SelectValue placeholder="Select status..." />
      </SelectTrigger>
      <SelectContent>
        {statusOptions.map((status) => {
          const statusColor = statusColors[status];
          return (
            <SelectItem
              key={status}
              value={status}
              data-testid={`option-status-${status}`}
              style={statusColor ? {
                backgroundColor: statusColor.background,
                color: statusColor.text,
              } : undefined}
            >
              {status}
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );

  const renderStateInput = () => (
    <Popover open={isComboboxOpen} onOpenChange={(open) => isAdmin && onOpenComboboxChange(open ? comboboxKey : null)}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={isComboboxOpen}
          className="w-full justify-between"
          data-testid={`button-state-${rowKey}-${header}`}
          disabled={!isAdmin}
        >
          {cellValue || "Select state..."}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0">
        <Command>
          <CommandInput placeholder="Search state..." />
          <CommandList>
            <CommandEmpty>No state found.</CommandEmpty>
            <CommandGroup>
              {uniqueStates.map((state) => (
                <CommandItem
                  key={state}
                  value={state}
                  onSelect={() => {
                    onCellUpdate(row, header, state);
                    closeCombobox();
                  }}
                  data-testid={`option-state-${state}`}
                >
                  <Check className={`mr-2 h-4 w-4 ${cellValue === state ? "opacity-100" : "opacity-0"}`} />
                  {state}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );

  if (isDateColumn) return renderDateInput();
  if (isStatusColumn) return renderStatusInput();
  if (isStateColumn) return renderStateInput();

  return (
    <Input
      value={cellValue}
      onChange={(e) => onCellEdit(row, header, e.target.value)}
      placeholder={hasData ? undefined : "Enter value..."}
      className="w-full"
      data-testid={`input-cell-${rowKey}-${header}`}
      disabled={!isAdmin}
      readOnly={!isAdmin}
    />
  );
}
