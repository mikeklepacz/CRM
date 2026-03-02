import { AlignCenter, AlignJustify, AlignLeft, AlignRight, EyeOff, RotateCcw, Type } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { StatusEditorPopover } from "@/components/client-dashboard/status-editor-popover";

interface DisplaySettingsCardProps {
  fontSize: number;
  rowHeight: number;
  textAlign: "left" | "center" | "right" | "justify";
  verticalAlign: "top" | "middle" | "bottom";
  freezeFirstColumn: boolean;
  selectedStatesCount: number;
  allStatesCount: number;
  searchTerm: string;
  statusOptions: string[];
  statusColors: { [status: string]: { background: string; text: string } };
  colorRowByStatus: boolean;
  colorPresets: Array<{ name: string; color: string }>;
  currentUser: any;
  onResetColumns: () => void;
  onResetDisplay: () => void;
  onResetAlignment: () => void;
  onResetFilters: () => void;
  onFontSizeChange: (value: number) => void;
  onRowHeightChange: (value: number) => void;
  onTextAlignChange: (value: "left" | "center" | "right" | "justify") => void;
  onVerticalAlignChange: (value: "top" | "middle" | "bottom") => void;
  onFreezeFirstColumnChange: (checked: boolean) => void;
  setColorRowByStatus: (value: boolean) => void;
  saveAllStatusColors: (allColors: { [status: string]: { background: string; text: string } }) => Promise<any>;
  setColorPresets: (presets: Array<{ name: string; color: string }>) => void;
  deleteColorPreset: (index: number) => void;
}

export function DisplaySettingsCard({
  fontSize,
  rowHeight,
  textAlign,
  verticalAlign,
  freezeFirstColumn,
  selectedStatesCount,
  allStatesCount,
  searchTerm,
  statusOptions,
  statusColors,
  colorRowByStatus,
  colorPresets,
  currentUser,
  onResetColumns,
  onResetDisplay,
  onResetAlignment,
  onResetFilters,
  onFontSizeChange,
  onRowHeightChange,
  onTextAlignChange,
  onVerticalAlignChange,
  onFreezeFirstColumnChange,
  setColorRowByStatus,
  saveAllStatusColors,
  setColorPresets,
  deleteColorPreset,
}: DisplaySettingsCardProps) {
  return (
    <Card className="w-auto">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-4">
          <CardTitle className="text-sm font-medium">Display Settings</CardTitle>
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={onResetColumns}
              data-testid="button-reset-columns-header"
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              Reset Columns
            </Button>

            {(fontSize !== 14 || rowHeight !== 48) && (
              <Button
                variant="outline"
                size="sm"
                onClick={onResetDisplay}
                data-testid="button-reset-display-header"
              >
                <Type className="mr-2 h-4 w-4" />
                Reset Display
              </Button>
            )}

            {(textAlign !== "left" || verticalAlign !== "middle") && (
              <Button
                variant="outline"
                size="sm"
                onClick={onResetAlignment}
                data-testid="button-reset-alignment-header"
              >
                <AlignLeft className="mr-2 h-4 w-4" />
                Reset Alignment
              </Button>
            )}

            {(selectedStatesCount < allStatesCount || searchTerm !== "") && (
              <Button
                variant="outline"
                size="sm"
                onClick={onResetFilters}
                data-testid="button-reset-filters-header"
              >
                <EyeOff className="mr-2 h-4 w-4" />
                Reset Filters
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <Type className="h-4 w-4 text-muted-foreground" />
            <Select
              value={fontSize.toString()}
              onValueChange={(value) => onFontSizeChange(parseInt(value))}
            >
              <SelectTrigger className="w-20" data-testid="select-font-size">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {["8","9","10","11","12","13","14","15","16","17","18","19","20","21","22","24","26","28","30"].map((size) => (
                  <SelectItem key={size} value={size}>{size}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="icon" data-testid="button-row-height">
                <AlignJustify className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Row Height</Label>
                  <span className="text-sm text-muted-foreground">{rowHeight}px</span>
                </div>
                <Slider
                  value={[rowHeight]}
                  onValueChange={(value) => onRowHeightChange(value[0])}
                  min={24}
                  max={200}
                  step={1}
                  className="w-full"
                  data-testid="slider-row-height"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Compact</span>
                  <span>Comfortable</span>
                  <span>Spacious</span>
                </div>
                {(() => {
                  const minRequired = Math.ceil(fontSize * 1.4 + Math.max(8, fontSize * 0.5) * 2);
                  return rowHeight < minRequired ? (
                    <p className="text-xs text-muted-foreground">
                      Note: Minimum {minRequired}px needed for {fontSize}px font
                    </p>
                  ) : null;
                })()}
              </div>
            </PopoverContent>
          </Popover>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="icon" data-testid="button-text-align">
                {textAlign === "left" && <AlignLeft className="h-4 w-4" />}
                {textAlign === "center" && <AlignCenter className="h-4 w-4" />}
                {textAlign === "right" && <AlignRight className="h-4 w-4" />}
                {textAlign === "justify" && <AlignJustify className="h-4 w-4" />}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-48">
              <div className="grid grid-cols-2 gap-2">
                <Button variant={textAlign === "left" ? "default" : "outline"} size="icon" onClick={() => onTextAlignChange("left")} data-testid="button-align-left">
                  <AlignLeft className="h-4 w-4" />
                </Button>
                <Button variant={textAlign === "center" ? "default" : "outline"} size="icon" onClick={() => onTextAlignChange("center")} data-testid="button-align-center">
                  <AlignCenter className="h-4 w-4" />
                </Button>
                <Button variant={textAlign === "right" ? "default" : "outline"} size="icon" onClick={() => onTextAlignChange("right")} data-testid="button-align-right">
                  <AlignRight className="h-4 w-4" />
                </Button>
                <Button variant={textAlign === "justify" ? "default" : "outline"} size="icon" onClick={() => onTextAlignChange("justify")} data-testid="button-align-justify">
                  <AlignJustify className="h-4 w-4" />
                </Button>
              </div>
            </PopoverContent>
          </Popover>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="icon" data-testid="button-vertical-align">
                {verticalAlign === "top" && (
                  <div className="flex flex-col justify-start h-4 w-4"><div className="w-1 h-1 bg-current rounded-full"></div></div>
                )}
                {verticalAlign === "middle" && (
                  <div className="flex flex-col justify-center h-4 w-4"><div className="w-1 h-1 bg-current rounded-full"></div></div>
                )}
                {verticalAlign === "bottom" && (
                  <div className="flex flex-col justify-end h-4 w-4"><div className="w-1 h-1 bg-current rounded-full"></div></div>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-48">
              <div className="grid grid-cols-1 gap-2">
                <Button variant={verticalAlign === "top" ? "default" : "outline"} size="icon" onClick={() => onVerticalAlignChange("top")} data-testid="button-valign-top">
                  <div className="flex flex-col justify-start h-4 w-4"><div className="w-1 h-1 bg-current rounded-full"></div></div>
                </Button>
                <Button variant={verticalAlign === "middle" ? "default" : "outline"} size="icon" onClick={() => onVerticalAlignChange("middle")} data-testid="button-valign-middle">
                  <div className="flex flex-col justify-center h-4 w-4"><div className="w-1 h-1 bg-current rounded-full"></div></div>
                </Button>
                <Button variant={verticalAlign === "bottom" ? "default" : "outline"} size="icon" onClick={() => onVerticalAlignChange("bottom")} data-testid="button-valign-bottom">
                  <div className="flex flex-col justify-end h-4 w-4"><div className="w-1 h-1 bg-current rounded-full"></div></div>
                </Button>
              </div>
            </PopoverContent>
          </Popover>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="freeze-first-column"
              checked={freezeFirstColumn}
              onCheckedChange={(checked) => onFreezeFirstColumnChange(!!checked)}
              data-testid="checkbox-freeze-column"
            />
            <Label htmlFor="freeze-first-column" className="text-sm cursor-pointer">Freeze Column</Label>
          </div>

          <StatusEditorPopover
            statusOptions={statusOptions}
            statusColors={statusColors}
            colorRowByStatus={colorRowByStatus}
            setColorRowByStatus={setColorRowByStatus}
            saveAllStatusColors={saveAllStatusColors}
            colorPresets={colorPresets}
            setColorPresets={setColorPresets}
            deleteColorPreset={deleteColorPreset}
            currentUser={currentUser}
          />
        </div>
      </CardContent>
    </Card>
  );
}
