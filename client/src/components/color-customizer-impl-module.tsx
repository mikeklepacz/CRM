import { useEffect, useState } from "react";
import { Palette, RotateCcw } from "lucide-react";

import { useTheme } from "@/components/theme-provider";
import { useCustomTheme, defaultDarkColors, defaultLightColors } from "@/hooks/use-custom-theme";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ColorFieldEditor } from "./color-customizer/color-field-editor";
import { COLOR_FIELDS, hexToHsl } from "./color-customizer/color-utils";
import type { ColorCustomizerProps } from "./color-customizer/types";

export function ColorCustomizer({ colorPresets, setColorPresets, deleteColorPreset }: ColorCustomizerProps) {
  const { actualTheme } = useTheme();
  const { currentColors, saveColors, resetColors, isSaving, isLoading } = useCustomTheme();
  const { toast } = useToast();

  const [customColors, setCustomColors] = useState(currentColors);
  const [activeColorField, setActiveColorField] = useState<string | null>(null);
  const [presetName, setPresetName] = useState("");
  const [hasLoadedInitialColors, setHasLoadedInitialColors] = useState(false);
  const [tempHslValues, setTempHslValues] = useState<Record<string, { h: string | number; s: string | number; l: string | number }>>({});

  useEffect(() => {
    if (!hasLoadedInitialColors && !isLoading) {
      setCustomColors(currentColors);
      setHasLoadedInitialColors(true);
    }
  }, [isLoading, currentColors, hasLoadedInitialColors]);

  useEffect(() => {
    if (hasLoadedInitialColors) {
      setCustomColors(currentColors);
    }
  }, [actualTheme, hasLoadedInitialColors]);

  useEffect(() => {
    const root = document.documentElement;

    const applyColorVar = (cssVar: string, hexColor: string) => {
      if (!hexColor) {
        root.style.removeProperty(cssVar);
        return;
      }
      const hsl = hexToHsl(hexColor);
      root.style.setProperty(cssVar, `${hsl.h} ${hsl.s}% ${hsl.l}%`);
    };

    if (customColors.background) {
      applyColorVar("--card", customColors.background);
      applyColorVar("--popover", customColors.background);
    }
    if (customColors.text) {
      applyColorVar("--card-foreground", customColors.text);
      applyColorVar("--popover-foreground", customColors.text);
    }
    if (customColors.primary) applyColorVar("--primary", customColors.primary);
    if (customColors.secondary) applyColorVar("--secondary", customColors.secondary);
    if (customColors.accent) applyColorVar("--accent", customColors.accent);
    if (customColors.border) {
      applyColorVar("--border", customColors.border);
      applyColorVar("--card-border", customColors.border);
      applyColorVar("--popover-border", customColors.border);
    }
  }, [customColors]);

  const handleResetColors = () => {
    resetColors();
    const defaultColors = actualTheme === "dark" ? defaultDarkColors : defaultLightColors;
    setCustomColors(defaultColors as any);
  };

  const resetFieldToDefault = (field: string) => {
    const defaultColors = actualTheme === "dark" ? defaultDarkColors : defaultLightColors;
    const defaultValue = (defaultColors as any)[field] || "";
    setCustomColors({ ...customColors, [field]: defaultValue });
  };

  const handleSavePreset = (color: string) => {
    if (!presetName.trim()) {
      toast({ title: "Error", description: "Please enter a preset name", variant: "destructive" });
      return;
    }

    const newPresets = [...colorPresets, { name: presetName.trim(), color }];
    setColorPresets(newPresets);
    setPresetName("");
    toast({ title: "Preset Saved", description: `"${presetName}" saved to your presets` });
  };

  const useEyeDropper = async (field: string) => {
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
      const next = { ...customColors, [field]: result.sRGBHex };
      setCustomColors(next);
      saveColors(next);
    } catch {
      // User cancelled.
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" data-testid="button-theme-customizer">
          <Palette className="h-5 w-5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 max-h-[600px] overflow-y-auto" align="end">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium">Customize Colors</h4>
            <div className="flex items-center gap-2 px-2 py-1 rounded-md bg-muted text-xs font-medium">{actualTheme === "dark" ? "🌙 Dark Mode" : "☀️ Light Mode"}</div>
          </div>
          <p className="text-xs text-muted-foreground">
            Currently editing colors for {actualTheme === "dark" ? "dark" : "light"} theme. Switch theme to customize the other color set.
          </p>

          <div className="space-y-4">
            {COLOR_FIELDS.map((field) => (
              <ColorFieldEditor
                key={field}
                field={field}
                customColors={customColors}
                colorPresets={colorPresets}
                presetName={presetName}
                activeColorField={activeColorField}
                tempHslValues={tempHslValues}
                onSetActiveColorField={setActiveColorField}
                onSetCustomColors={setCustomColors}
                onSaveColors={saveColors}
                onUseEyeDropper={useEyeDropper}
                onResetFieldToDefault={resetFieldToDefault}
                onPresetNameChange={setPresetName}
                onSavePreset={handleSavePreset}
                onDeleteColorPreset={deleteColorPreset}
                onSetTempHslValues={setTempHslValues}
              />
            ))}
          </div>

          <div className="flex gap-2 pt-4 border-t">
            <Button variant="outline" onClick={handleResetColors} disabled={isSaving} className="w-full" data-testid="button-reset-colors">
              <RotateCcw className="mr-2 h-4 w-4" />
              Reset to Defaults
            </Button>
          </div>

          {isSaving && <p className="text-xs text-muted-foreground text-center">Saving changes...</p>}
        </div>
      </PopoverContent>
    </Popover>
  );
}
