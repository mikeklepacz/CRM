import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Save, RotateCcw, Pipette, X } from "lucide-react";
import { HslColorPicker } from "react-colorful";
import { useToast } from "@/hooks/use-toast";

// HSL <-> Hex conversion utilities
function hexToHsl(hex: string): { h: number; s: number; l: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return { h: 0, s: 0, l: 0 };

  let r = parseInt(result[1], 16) / 255;
  let g = parseInt(result[2], 16) / 255;
  let b = parseInt(result[3], 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }

  return { h: h * 360, s: s * 100, l: l * 100 };
}

function hslToHex(h: number, s: number, l: number): string {
  l /= 100;
  const a = s * Math.min(l, 1 - l) / 100;
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

interface SharedColorPickerProps {
  label: string;
  value: string;
  onChange: (color: string) => void;
  onReset?: () => void;
  colorPresets?: Array<{ name: string; color: string }>;
  onSavePreset?: (color: string, name: string) => void;
  onDeletePreset?: (index: number) => void;
  testId?: string;
}

export function SharedColorPicker({
  label,
  value,
  onChange,
  onReset,
  colorPresets = [],
  onSavePreset,
  onDeletePreset,
  testId,
}: SharedColorPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [presetName, setPresetName] = useState("");
  const { toast } = useToast();

  const currentColor = value || "#000000";
  const hslColor = hexToHsl(currentColor);

  // Use browser's EyeDropper API if available
  const useEyeDropper = async () => {
    if (!('EyeDropper' in window)) {
      toast({
        title: "Not Supported",
        description: "Your browser doesn't support the eyedropper tool. Try using Chrome or Edge.",
        variant: "destructive",
      });
      return;
    }

    try {
      const eyeDropper = new (window as any).EyeDropper();
      const result = await eyeDropper.open();
      onChange(result.sRGBHex);
    } catch (e) {
      // User cancelled
    }
  };

  const handleSavePreset = () => {
    if (!presetName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a preset name",
        variant: "destructive",
      });
      return;
    }
    
    if (onSavePreset) {
      onSavePreset(currentColor, presetName.trim());
      setPresetName("");
      toast({
        title: "Preset Saved",
        description: `"${presetName}" saved to your presets`,
      });
    }
  };

  return (
    <div className="space-y-2">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <div className="flex gap-1">
            <Input
              type="text"
              value={currentColor}
              readOnly
              className="flex-1 font-mono text-xs cursor-pointer"
              style={{
                backgroundColor: currentColor,
                color: hslColor.l > 50 ? '#000000' : '#ffffff',
              }}
              data-testid={testId}
            />
            {onReset && (
              <Button
                variant="outline"
                size="icon"
                onClick={onReset}
                title="Reset to default"
                data-testid={`${testId}-reset`}
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
            )}
          </div>
        </PopoverTrigger>
        <PopoverContent className="w-80" align="start">
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
                  onClick={useEyeDropper}
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

            {/* Color Presets/Swatches */}
            {colorPresets.length > 0 && (
              <div className="space-y-2">
                <Label className="text-xs">Saved Presets</Label>
                <div className="flex flex-wrap gap-1">
                  {colorPresets.map((preset, pIndex) => (
                    <div
                      key={pIndex}
                      className="relative group"
                    >
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

            {/* Save Preset */}
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
                  <Button
                    size="sm"
                    onClick={handleSavePreset}
                    disabled={!presetName.trim()}
                    data-testid={`${testId}-save-preset`}
                  >
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
                    value={Math.round(hslColor.h)}
                    onChange={(e) => {
                      const h = parseInt(e.target.value) || 0;
                      const hexColor = hslToHex(h, hslColor.s, hslColor.l);
                      onChange(hexColor);
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
                    value={Math.round(hslColor.s)}
                    onChange={(e) => {
                      const s = parseInt(e.target.value) || 0;
                      const hexColor = hslToHex(hslColor.h, s, hslColor.l);
                      onChange(hexColor);
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
                    value={Math.round(hslColor.l)}
                    onChange={(e) => {
                      const l = parseInt(e.target.value) || 0;
                      const hexColor = hslToHex(hslColor.h, hslColor.s, l);
                      onChange(hexColor);
                    }}
                    className="font-mono text-xs"
                  />
                </div>
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
