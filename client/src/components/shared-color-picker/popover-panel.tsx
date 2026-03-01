import { Save, Pipette, RotateCcw, X } from "lucide-react";
import { HslColorPicker } from "react-colorful";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { hslToHex } from "./color-utils";

interface PopoverPanelProps {
  colorPresets: Array<{ name: string; color: string }>;
  currentColor: string;
  hslColor: { h: number; s: number; l: number };
  onChange: (color: string) => void;
  onDeletePreset?: (index: number) => void;
  onReset?: () => void;
  onSavePreset?: (color: string, name: string) => void;
  onUseEyeDropper: () => void;
  presetName: string;
  setIsOpen: (open: boolean) => void;
  setPresetName: (name: string) => void;
  setTempHslValues: (values: { h: string | number; s: string | number; l: string | number } | null) => void;
  tempHslValues: { h: string | number; s: string | number; l: string | number } | null;
  testId?: string;
}

export function PopoverPanel({
  colorPresets,
  currentColor,
  hslColor,
  onChange,
  onDeletePreset,
  onReset,
  onSavePreset,
  onUseEyeDropper,
  presetName,
  setIsOpen,
  setPresetName,
  setTempHslValues,
  tempHslValues,
  testId,
}: PopoverPanelProps) {
  const handleSavePreset = () => {
    if (!presetName.trim() || !onSavePreset) return;
    onSavePreset(currentColor, presetName.trim());
    setPresetName("");
  };

  return (
    <div className="space-y-4">
      <HslColorPicker
        color={hslColor}
        onChange={(color) => {
          const hexColor = hslToHex(color.h, color.s, color.l);
          onChange(hexColor);
        }}
      />

      <div className="space-y-2">
        <Label className="text-xs">Hex Color</Label>
        <div className="flex gap-2">
          <Input
            type="text"
            value={currentColor}
            onChange={(e) => {
              const val = e.target.value;
              if (/^#[0-9A-F]{6}$/i.test(val)) {
                onChange(val);
              }
            }}
            className="font-mono text-xs flex-1"
            placeholder="#000000"
            data-testid={`${testId}-hex-input`}
          />
          <Button
            variant="outline"
            size="icon"
            onClick={onUseEyeDropper}
            data-testid={`${testId}-eyedropper`}
            title="Pick color from screen"
          >
            <Pipette className="h-4 w-4" />
          </Button>
          {onReset && (
            <Button
              variant="outline"
              size="icon"
              onClick={() => {
                onReset();
                setIsOpen(false);
              }}
              data-testid={`${testId}-reset-inside`}
              title="Reset to default"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {colorPresets.length > 0 && (
        <div className="space-y-2">
          <Label className="text-xs">Saved Presets</Label>
          <div className="flex flex-wrap gap-1">
            {colorPresets.map((preset, pIndex) => (
              <div key={pIndex} className="relative group">
                <button
                  onClick={() => onChange(preset.color)}
                  className="w-8 h-8 rounded border border-border"
                  style={{ backgroundColor: preset.color }}
                  title={preset.name}
                  data-testid={`${testId}-preset-${pIndex}`}
                />
                {onDeletePreset && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeletePreset(pIndex);
                    }}
                    className="absolute -top-1 -right-1 w-4 h-4 bg-destructive text-destructive-foreground rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center hover-elevate active-elevate-2"
                    title={`Delete ${preset.name}`}
                    data-testid={`${testId}-delete-preset-${pIndex}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {onSavePreset && (
        <div className="space-y-2 pt-2 border-t">
          <Label className="text-xs">Save as Preset</Label>
          <div className="flex gap-2">
            <Input
              value={presetName}
              onChange={(e) => setPresetName(e.target.value)}
              placeholder="Preset name..."
              className="flex-1 text-xs"
              data-testid={`${testId}-preset-name`}
            />
            <Button size="sm" onClick={handleSavePreset} disabled={!presetName.trim()} data-testid={`${testId}-save-preset`}>
              <Save className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        <Label className="text-xs">HSL Values</Label>
        <div className="grid grid-cols-3 gap-2">
          <div>
            <Label className="text-xs text-muted-foreground">H</Label>
            <Input
              type="number"
              min="0"
              max="360"
              value={tempHslValues?.h ?? Math.round(hslColor.h)}
              onChange={(e) => {
                const val = e.target.value;
                setTempHslValues({
                  h: val,
                  s: tempHslValues?.s ?? hslColor.s,
                  l: tempHslValues?.l ?? hslColor.l,
                });
              }}
              onBlur={() => {
                const h = tempHslValues?.h;
                const hNum = h === "" || h === undefined ? 0 : Math.max(0, Math.min(360, parseInt(String(h), 10) || 0));
                const s = typeof tempHslValues?.s === "number" ? tempHslValues.s : hslColor.s;
                const l = typeof tempHslValues?.l === "number" ? tempHslValues.l : hslColor.l;
                const hexColor = hslToHex(hNum, s, l);
                onChange(hexColor);
                setTempHslValues(null);
              }}
              className="font-mono text-xs"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">S%</Label>
            <Input
              type="number"
              min="0"
              max="100"
              value={tempHslValues?.s ?? Math.round(hslColor.s)}
              onChange={(e) => {
                const val = e.target.value;
                setTempHslValues({
                  h: tempHslValues?.h ?? hslColor.h,
                  s: val,
                  l: tempHslValues?.l ?? hslColor.l,
                });
              }}
              onBlur={() => {
                const s = tempHslValues?.s;
                const sNum = s === "" || s === undefined ? 0 : Math.max(0, Math.min(100, parseInt(String(s), 10) || 0));
                const h = typeof tempHslValues?.h === "number" ? tempHslValues.h : hslColor.h;
                const l = typeof tempHslValues?.l === "number" ? tempHslValues.l : hslColor.l;
                const hexColor = hslToHex(h, sNum, l);
                onChange(hexColor);
                setTempHslValues(null);
              }}
              className="font-mono text-xs"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">L%</Label>
            <Input
              type="number"
              min="0"
              max="100"
              value={tempHslValues?.l ?? Math.round(hslColor.l)}
              onChange={(e) => {
                const val = e.target.value;
                setTempHslValues({
                  h: tempHslValues?.h ?? hslColor.h,
                  s: tempHslValues?.s ?? hslColor.s,
                  l: val,
                });
              }}
              onBlur={() => {
                const l = tempHslValues?.l;
                const lNum = l === "" || l === undefined ? 0 : Math.max(0, Math.min(100, parseInt(String(l), 10) || 0));
                const h = typeof tempHslValues?.h === "number" ? tempHslValues.h : hslColor.h;
                const s = typeof tempHslValues?.s === "number" ? tempHslValues.s : hslColor.s;
                const hexColor = hslToHex(h, s, lNum);
                onChange(hexColor);
                setTempHslValues(null);
              }}
              className="font-mono text-xs"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
