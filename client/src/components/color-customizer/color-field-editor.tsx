import { Pipette, RotateCcw, Save, X } from "lucide-react";
import { HslColorPicker } from "react-colorful";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { FIELD_DESCRIPTIONS, FIELD_LABELS, hexToHsl, hslToHex } from "./color-utils";

interface ColorFieldEditorProps {
  field: string;
  customColors: any;
  colorPresets: Array<{ name: string; color: string }>;
  presetName: string;
  activeColorField: string | null;
  tempHslValues: Record<string, { h: string | number; s: string | number; l: string | number }>;
  onSetActiveColorField: (value: string | null) => void;
  onSetCustomColors: (value: any) => void;
  onSaveColors: (value: any) => void;
  onUseEyeDropper: (field: string) => void;
  onResetFieldToDefault: (field: string) => void;
  onPresetNameChange: (value: string) => void;
  onSavePreset: (color: string) => void;
  onDeleteColorPreset: (index: number) => void;
  onSetTempHslValues: (value: Record<string, { h: string | number; s: string | number; l: string | number }>) => void;
}

export function ColorFieldEditor({
  field,
  customColors,
  colorPresets,
  presetName,
  activeColorField,
  tempHslValues,
  onSetActiveColorField,
  onSetCustomColors,
  onSaveColors,
  onUseEyeDropper,
  onResetFieldToDefault,
  onPresetNameChange,
  onSavePreset,
  onDeleteColorPreset,
  onSetTempHslValues,
}: ColorFieldEditorProps) {
  const currentColor = customColors[field] || (field === "bodyBackground" ? "#f9fafb" : field === "headerBackground" ? "#ffffff" : "#000000");
  const hslColor = hexToHsl(currentColor);
  const hslString = customColors[field] ? `${Math.round(hslColor.h)}° ${Math.round(hslColor.s)}% ${Math.round(hslColor.l)}%` : "(Theme Default)";

  return (
    <div key={field} className="space-y-2">
      <Label className="text-sm font-medium">{FIELD_LABELS[field as keyof typeof FIELD_LABELS]}</Label>
      <p className="text-xs text-muted-foreground">{FIELD_DESCRIPTIONS[field as keyof typeof FIELD_DESCRIPTIONS]}</p>

      <Popover open={activeColorField === field} onOpenChange={(open) => onSetActiveColorField(open ? field : null)}>
        <PopoverTrigger asChild>
          <Button variant="outline" className="w-full justify-start gap-2" data-testid={`button-color-${field}`}>
            <div className="h-6 w-6 rounded border" style={{ backgroundColor: currentColor }} />
            <span className="font-mono text-sm">{hslString}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80" align="start">
          <div className="space-y-4">
            <HslColorPicker
              color={hslColor}
              onChange={(color) => {
                const hexColor = hslToHex(color.h, color.s, color.l);
                const next = { ...customColors, [field]: hexColor };
                onSetCustomColors(next);
                onSaveColors(next);
              }}
            />

            <div className="space-y-2">
              <Label className="text-xs">Hex Color</Label>
              <div className="flex gap-2">
                <Input
                  type="text"
                  value={currentColor}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (/^#[0-9A-F]{6}$/i.test(value)) {
                      const next = { ...customColors, [field]: value };
                      onSetCustomColors(next);
                      onSaveColors(next);
                    }
                  }}
                  className="font-mono text-xs flex-1"
                  placeholder="#000000"
                  data-testid={`input-hex-${field}`}
                />
                <Button variant="outline" size="icon" onClick={() => onUseEyeDropper(field)} data-testid={`button-eyedropper-${field}`} title="Pick color from screen">
                  <Pipette className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" onClick={() => onResetFieldToDefault(field)} data-testid={`button-reset-${field}`} title="Reset to default">
                  <RotateCcw className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {colorPresets.length > 0 && (
              <div className="space-y-2">
                <Label className="text-xs">Saved Presets</Label>
                <div className="flex flex-wrap gap-1">
                  {colorPresets.map((preset, pIndex) => (
                    <div key={pIndex} className="relative group">
                      <button
                        onClick={() => {
                          const next = { ...customColors, [field]: preset.color };
                          onSetCustomColors(next);
                          onSaveColors(next);
                        }}
                        className="w-8 h-8 rounded border border-border"
                        style={{ backgroundColor: preset.color }}
                        title={preset.name}
                        data-testid={`preset-${field}-${pIndex}`}
                      />
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteColorPreset(pIndex);
                        }}
                        className="absolute -top-1 -right-1 w-4 h-4 bg-destructive text-destructive-foreground rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center hover-elevate active-elevate-2"
                        title={`Delete ${preset.name}`}
                        data-testid={`delete-preset-${field}-${pIndex}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-2 pt-2 border-t">
              <Label className="text-xs">Save as Preset</Label>
              <div className="flex gap-2">
                <Input value={presetName} onChange={(e) => onPresetNameChange(e.target.value)} placeholder="Preset name..." className="flex-1 text-xs" data-testid={`input-preset-name-${field}`} />
                <Button size="sm" onClick={() => onSavePreset(currentColor)} disabled={!presetName.trim()} data-testid={`button-save-preset-${field}`}>
                  <Save className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs">HSL Values</Label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { key: "h", label: "H", min: 0, max: 360 },
                  { key: "s", label: "S%", min: 0, max: 100 },
                  { key: "l", label: "L%", min: 0, max: 100 },
                ].map((cfg) => (
                  <div key={cfg.key}>
                    <Label className="text-xs text-muted-foreground">{cfg.label}</Label>
                    <Input
                      type="number"
                      min={cfg.min}
                      max={cfg.max}
                      value={tempHslValues[field]?.[cfg.key as "h" | "s" | "l"] ?? Math.round(hslColor[cfg.key as "h" | "s" | "l"])}
                      onChange={(e) => {
                        const val = e.target.value;
                        onSetTempHslValues({
                          ...tempHslValues,
                          [field]: {
                            h: cfg.key === "h" ? val : tempHslValues[field]?.h ?? hslColor.h,
                            s: cfg.key === "s" ? val : tempHslValues[field]?.s ?? hslColor.s,
                            l: cfg.key === "l" ? val : tempHslValues[field]?.l ?? hslColor.l,
                          },
                        });
                      }}
                      onBlur={() => {
                        const temp = tempHslValues[field];
                        const h = temp?.h === "" || temp?.h === undefined ? hslColor.h : Math.max(0, Math.min(360, parseInt(String(temp.h), 10) || 0));
                        const s = temp?.s === "" || temp?.s === undefined ? hslColor.s : Math.max(0, Math.min(100, parseInt(String(temp.s), 10) || 0));
                        const l = temp?.l === "" || temp?.l === undefined ? hslColor.l : Math.max(0, Math.min(100, parseInt(String(temp.l), 10) || 0));
                        const hexColor = hslToHex(h, s, l);
                        const next = { ...customColors, [field]: hexColor };
                        onSetCustomColors(next);
                        onSaveColors(next);
                        onSetTempHslValues({ ...tempHslValues, [field]: undefined as any });
                      }}
                      className="font-mono text-xs"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
