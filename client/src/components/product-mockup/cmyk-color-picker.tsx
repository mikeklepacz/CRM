import { useEffect, useState } from "react";
import { Plus, X } from "lucide-react";
import ColorPicker, { useColorPicker } from "@/vendor/react-best-gradient-color-picker";
import { Button } from "@/components/ui/button";
import type { ColorSwatch } from "@/components/product-mockup/product-mockup.types";

interface CMYKColorPickerProps {
  color: string;
  onChange: (color: string) => void;
  savedSwatches?: ColorSwatch[];
  onSaveSwatch?: (color: string, cmyk: string) => void;
  onUseSwatch?: (color: string) => void;
  onRemoveSwatch?: (id: string) => void;
}

export function CMYKColorPicker({
  color,
  onChange,
  savedSwatches = [],
  onSaveSwatch,
  onUseSwatch,
  onRemoveSwatch,
}: CMYKColorPickerProps) {
  const [localColor, setLocalColor] = useState(color);
  const { valueToCmyk } = useColorPicker(localColor, setLocalColor);

  useEffect(() => {
    setLocalColor(color);
  }, [color]);

  const handleChange = (newColor: string) => {
    setLocalColor(newColor);
    onChange(newColor);
  };

  const cmykRaw = valueToCmyk();
  const cmykMatch = cmykRaw.match(/cmyk\(([^,]+),\s*([^,]+),\s*([^,]+),\s*([^)]+)\)/);
  const formatCmyk = () => {
    if (!cmykMatch) return "C: 0%  M: 0%  Y: 0%  K: 0%";
    const c = Math.round(parseFloat(cmykMatch[1]) * 100);
    const m = Math.round(parseFloat(cmykMatch[2]) * 100);
    const y = Math.round(parseFloat(cmykMatch[3]) * 100);
    const k = Math.round(parseFloat(cmykMatch[4]) * 100);
    return `C: ${c}%  M: ${m}%  Y: ${y}%  K: ${k}%`;
  };

  const cmykString = formatCmyk();

  return (
    <div className="space-y-3">
      <ColorPicker
        value={localColor}
        onChange={handleChange}
        hideColorTypeBtns
        hideAdvancedSliders
        hidePresets
        hideOpacity
        width={220}
        height={150}
      />
      <div className="p-2 bg-muted rounded text-xs font-mono">
        <div className="text-muted-foreground mb-1">CMYK for Print:</div>
        <div className="text-foreground font-medium">{cmykString}</div>
      </div>

      {onSaveSwatch && (
        <Button
          size="sm"
          variant="outline"
          className="w-full"
          onClick={() => onSaveSwatch(localColor, cmykString)}
          data-testid="button-save-swatch"
        >
          <Plus className="w-3 h-3 mr-1" />
          Save to Swatches
        </Button>
      )}

      {savedSwatches.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs text-muted-foreground">Saved Swatches:</div>
          <div className="flex flex-wrap gap-1">
            {savedSwatches.map((swatch) => (
              <div key={swatch.id} className="relative group">
                <button
                  className="w-6 h-6 rounded border border-border cursor-pointer hover:ring-2 hover:ring-primary"
                  style={{ backgroundColor: swatch.color }}
                  onClick={() => onUseSwatch?.(swatch.color)}
                  title={swatch.cmyk}
                  data-testid={`swatch-${swatch.id}`}
                />
                {onRemoveSwatch && (
                  <button
                    className="absolute -top-1 -right-1 w-3 h-3 bg-destructive text-destructive-foreground rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center text-[8px]"
                    onClick={(event) => {
                      event.stopPropagation();
                      onRemoveSwatch(swatch.id);
                    }}
                  >
                    <X className="w-2 h-2" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
