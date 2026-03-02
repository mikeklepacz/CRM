import { useState } from "react";
import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { hexToHsl } from "@/components/shared-color-picker/color-utils";
import { PopoverPanel } from "@/components/shared-color-picker/popover-panel";
import type { SharedColorPickerProps } from "@/components/shared-color-picker/types";

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
  const [tempHslValues, setTempHslValues] = useState<{ h: string | number; s: string | number; l: string | number } | null>(
    null,
  );

  const currentColor = value || "#000000";
  const hslColor = hexToHsl(currentColor);

  const useEyeDropper = async () => {
    if (!("EyeDropper" in window)) {
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

  const handleSavePreset = (color: string, name: string) => {
    if (!name.trim()) {
      toast({
        title: "Error",
        description: "Please enter a preset name",
        variant: "destructive",
      });
      return;
    }

    if (onSavePreset) {
      onSavePreset(color, name.trim());
      toast({
        title: "Preset Saved",
        description: `"${name}" saved to your presets`,
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
                color: hslColor.l > 50 ? "#000000" : "#ffffff",
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
          <PopoverPanel
            colorPresets={colorPresets}
            currentColor={currentColor}
            hslColor={hslColor}
            onChange={onChange}
            onDeletePreset={onDeletePreset}
            onReset={onReset}
            onSavePreset={onSavePreset ? handleSavePreset : undefined}
            onUseEyeDropper={useEyeDropper}
            presetName={presetName}
            setIsOpen={setIsOpen}
            setPresetName={setPresetName}
            setTempHslValues={setTempHslValues}
            tempHslValues={tempHslValues}
            testId={testId}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
