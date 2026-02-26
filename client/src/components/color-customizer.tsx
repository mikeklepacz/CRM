import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Palette, Save, RotateCcw, Pipette, X } from "lucide-react";
import { HslColorPicker } from "react-colorful";
import { useCustomTheme, defaultLightColors, defaultDarkColors } from "@/hooks/use-custom-theme";
import { useTheme } from "@/components/theme-provider";
import { Checkbox } from "@/components/ui/checkbox";
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

interface ColorCustomizerProps {
  colorPresets: Array<{name: string, color: string}>;
  setColorPresets: (presets: Array<{name: string, color: string}>) => void;
  deleteColorPreset: (index: number) => void;
}

export function ColorCustomizer({ colorPresets, setColorPresets, deleteColorPreset }: ColorCustomizerProps) {
  const { actualTheme } = useTheme();
  const { currentColors, saveColors, resetColors, isSaving, isLoading } = useCustomTheme();
  const [customColors, setCustomColors] = useState(currentColors);
  const [activeColorField, setActiveColorField] = useState<string | null>(null);
  const [presetName, setPresetName] = useState("");
  const [hasLoadedInitialColors, setHasLoadedInitialColors] = useState(false);
  const { toast } = useToast();
  
  // Temporary HSL string values during typing (indexed by field name)
  const [tempHslValues, setTempHslValues] = useState<Record<string, {h: string | number, s: string | number, l: string | number}>>({});

  // Sync customColors when preferences finish loading for the first time
  useEffect(() => {
    if (!hasLoadedInitialColors && !isLoading) {
      setCustomColors(currentColors);
      setHasLoadedInitialColors(true);
    }
  }, [isLoading, currentColors, hasLoadedInitialColors]);

  // Sync customColors when theme changes (after initial load)
  useEffect(() => {
    if (hasLoadedInitialColors) {
      setCustomColors(currentColors);
    }
  }, [actualTheme, hasLoadedInitialColors]);

  // Apply colors to CSS variables for live preview
  useEffect(() => {
    const root = document.documentElement;

    // Helper function to convert hex to HSL
    const applyColorVar = (cssVar: string, hexColor: string) => {
      if (!hexColor) {
        root.style.removeProperty(cssVar);
        return;
      }
      const hsl = hexToHsl(hexColor);
      root.style.setProperty(cssVar, `${hsl.h} ${hsl.s}% ${hsl.l}%`);
    };

    // Apply live preview colors
    if (customColors.background) {
      applyColorVar('--card', customColors.background);
      applyColorVar('--popover', customColors.background);
    }
    if (customColors.text) {
      applyColorVar('--card-foreground', customColors.text);
      applyColorVar('--popover-foreground', customColors.text);
    }
    if (customColors.primary) {
      applyColorVar('--primary', customColors.primary);
    }
    if (customColors.secondary) {
      applyColorVar('--secondary', customColors.secondary);
    }
    if (customColors.accent) {
      applyColorVar('--accent', customColors.accent);
    }
    if (customColors.border) {
      applyColorVar('--border', customColors.border);
      applyColorVar('--card-border', customColors.border);
      applyColorVar('--popover-border', customColors.border);
    }
  }, [customColors]);

  const handleSaveColors = () => {
    saveColors(customColors);
  };

  const handleResetColors = () => {
    resetColors();
    const defaultColors = actualTheme === 'dark' ? defaultDarkColors : defaultLightColors;
    setCustomColors(defaultColors as any);
  };

  // Reset individual field to default
  const resetFieldToDefault = (field: keyof typeof customColors) => {
    const defaultColors = actualTheme === 'dark' ? defaultDarkColors : defaultLightColors;
    const defaultValue = defaultColors[field as keyof typeof defaultColors] || '';
    setCustomColors({ ...customColors, [field]: defaultValue });
  };

  // Save current color as a preset
  const handleSavePreset = (color: string) => {
    if (!presetName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a preset name",
        variant: "destructive",
      });
      return;
    }

    const newPresets = [...colorPresets, { name: presetName.trim(), color }];
    setColorPresets(newPresets);
    setPresetName("");
    toast({
      title: "Preset Saved",
      description: `"${presetName}" saved to your presets`,
    });
  };

  // Use browser's EyeDropper API if available
  const useEyeDropper = async (field: keyof typeof customColors) => {
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
      setCustomColors({ ...customColors, [field]: result.sRGBHex });
      saveColors(customColors) // Auto-save after eyedropper
    } catch (e) {
      // User cancelled
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
            <div className="flex items-center gap-2 px-2 py-1 rounded-md bg-muted text-xs font-medium">
              {actualTheme === 'dark' ? '🌙 Dark Mode' : '☀️ Light Mode'}
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Currently editing colors for {actualTheme === 'dark' ? 'dark' : 'light'} theme. Switch theme to customize the other color set.
          </p>

          <div className="space-y-4">
            {(['background', 'tableTextColor', 'text', 'primary', 'secondary', 'accent', 'border', 'bodyBackground', 'headerBackground', 'statesButton', 'franchiseButton', 'statusButton', 'columnsButton', 'actionButtons'] as const).map((field) => {
              const fieldLabels = {
                background: 'Table Background',
                tableTextColor: 'Table Text Color',
                text: 'Interface Text',
                primary: 'Table Links (Phone, Email, Website)',
                secondary: 'Card & Panel Background',
                accent: 'Accent Highlights',
                border: 'Borders & Dividers',
                bodyBackground: 'Page Background',
                headerBackground: 'Header Background',
                statesButton: 'States Filter Button',
                franchiseButton: 'Find Franchise Button',
                statusButton: 'Status Filter Button',
                columnsButton: 'Columns Button',
                actionButtons: 'Action Buttons (Save, Export, etc)',
              };

              const fieldDescriptions = {
                background: 'Background color of the main data table',
                tableTextColor: 'Text color inside table cells and data rows',
                text: 'Color of headings, labels, and interface text',
                primary: 'Color for clickable phone numbers, emails, and website links in table',
                secondary: 'Secondary buttons and card backgrounds',
                accent: 'Accent elements and secondary highlights',
                border: 'Border lines between rows and card edges',
                bodyBackground: 'Main page body background (leave empty for theme default)',
                headerBackground: 'Top header background (leave empty for theme default)',
                statesButton: 'Color for the States filter button',
                franchiseButton: 'Color for the Find Franchise button',
                statusButton: 'Color for the Status filter button',
                columnsButton: 'Color for the Columns visibility button',
                actionButtons: 'Color for Save, Export, and other action buttons',
              };

              const currentColor = customColors[field] || (field === 'bodyBackground' ? '#f9fafb' : field === 'headerBackground' ? '#ffffff' : '#000000');
              const hslColor = hexToHsl(currentColor);
              const hslString = customColors[field] ? `${Math.round(hslColor.h)}° ${Math.round(hslColor.s)}% ${Math.round(hslColor.l)}%` : '(Theme Default)';

              return (
                <div key={field} className="space-y-2">
                  <Label className="text-sm font-medium">{fieldLabels[field]}</Label>
                  <p className="text-xs text-muted-foreground">{fieldDescriptions[field]}</p>

                  <Popover open={activeColorField === field} onOpenChange={(open) => setActiveColorField(open ? field : null)}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start gap-2" data-testid={`button-color-${field}`}>
                        <div
                          className="h-6 w-6 rounded border"
                          style={{ backgroundColor: currentColor }}
                        />
                        <span className="font-mono text-sm">{hslString}</span>
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80" align="start">
                      <div className="space-y-4">
                        <HslColorPicker
                          color={hslColor}
                          onChange={(color) => {
                            const hexColor = hslToHex(color.h, color.s, color.l);
                            setCustomColors({ ...customColors, [field]: hexColor });
                            saveColors(customColors); // Auto-save when color changes
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
                                  setCustomColors({ ...customColors, [field]: value });
                                  saveColors(customColors); // Auto-save after hex input
                                }
                              }}
                              className="font-mono text-xs flex-1"
                              placeholder="#000000"
                              data-testid={`input-hex-${field}`}
                            />
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => useEyeDropper(field)}
                              data-testid={`button-eyedropper-${field}`}
                              title="Pick color from screen"
                            >
                              <Pipette className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => resetFieldToDefault(field)}
                              data-testid={`button-reset-${field}`}
                              title="Reset to default"
                            >
                              <RotateCcw className="h-4 w-4" />
                            </Button>
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
                                    onClick={() => {
                                      setCustomColors({ ...customColors, [field]: preset.color });
                                      saveColors(customColors); // Auto-save after applying preset
                                    }}
                                    className="w-8 h-8 rounded border border-border"
                                    style={{ backgroundColor: preset.color }}
                                    title={preset.name}
                                    data-testid={`preset-${field}-${pIndex}`}
                                  />
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      deleteColorPreset(pIndex);
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

                        {/* Save Preset */}
                        <div className="space-y-2 pt-2 border-t">
                          <Label className="text-xs">Save as Preset</Label>
                          <div className="flex gap-2">
                            <Input
                              value={presetName}
                              onChange={(e) => setPresetName(e.target.value)}
                              placeholder="Preset name..."
                              className="flex-1 text-xs"
                              data-testid={`input-preset-name-${field}`}
                            />
                            <Button
                              size="sm"
                              onClick={() => handleSavePreset(currentColor)}
                              disabled={!presetName.trim()}
                              data-testid={`button-save-preset-${field}`}
                            >
                              <Save className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label className="text-xs">HSL Values</Label>
                          <div className="grid grid-cols-3 gap-2">
                            <div>
                              <Label className="text-xs text-muted-foreground">H</Label>
                              <Input
                                type="number"
                                min="0"
                                max="360"
                                value={tempHslValues[field]?.h ?? Math.round(hslColor.h)}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setTempHslValues({
                                    ...tempHslValues,
                                    [field]: {
                                      h: val,
                                      s: tempHslValues[field]?.s ?? hslColor.s,
                                      l: tempHslValues[field]?.l ?? hslColor.l
                                    }
                                  });
                                }}
                                onBlur={() => {
                                  const h = tempHslValues[field]?.h;
                                  const hNum = h === '' || h === undefined ? 0 : Math.max(0, Math.min(360, parseInt(String(h), 10) || 0));
                                  const s = typeof tempHslValues[field]?.s === 'number' ? tempHslValues[field].s : hslColor.s;
                                  const l = typeof tempHslValues[field]?.l === 'number' ? tempHslValues[field].l : hslColor.l;
                                  const hexColor = hslToHex(hNum, s, l);
                                  setCustomColors({ ...customColors, [field]: hexColor });
                                  saveColors({ ...customColors, [field]: hexColor });
                                  setTempHslValues({ ...tempHslValues, [field]: undefined as any });
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
                                value={tempHslValues[field]?.s ?? Math.round(hslColor.s)}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setTempHslValues({
                                    ...tempHslValues,
                                    [field]: {
                                      h: tempHslValues[field]?.h ?? hslColor.h,
                                      s: val,
                                      l: tempHslValues[field]?.l ?? hslColor.l
                                    }
                                  });
                                }}
                                onBlur={() => {
                                  const s = tempHslValues[field]?.s;
                                  const sNum = s === '' || s === undefined ? 0 : Math.max(0, Math.min(100, parseInt(String(s), 10) || 0));
                                  const h = typeof tempHslValues[field]?.h === 'number' ? tempHslValues[field].h : hslColor.h;
                                  const l = typeof tempHslValues[field]?.l === 'number' ? tempHslValues[field].l : hslColor.l;
                                  const hexColor = hslToHex(h, sNum, l);
                                  setCustomColors({ ...customColors, [field]: hexColor });
                                  saveColors({ ...customColors, [field]: hexColor });
                                  setTempHslValues({ ...tempHslValues, [field]: undefined as any });
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
                                value={tempHslValues[field]?.l ?? Math.round(hslColor.l)}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setTempHslValues({
                                    ...tempHslValues,
                                    [field]: {
                                      h: tempHslValues[field]?.h ?? hslColor.h,
                                      s: tempHslValues[field]?.s ?? hslColor.s,
                                      l: val
                                    }
                                  });
                                }}
                                onBlur={() => {
                                  const l = tempHslValues[field]?.l;
                                  const lNum = l === '' || l === undefined ? 0 : Math.max(0, Math.min(100, parseInt(String(l), 10) || 0));
                                  const h = typeof tempHslValues[field]?.h === 'number' ? tempHslValues[field].h : hslColor.h;
                                  const s = typeof tempHslValues[field]?.s === 'number' ? tempHslValues[field].s : hslColor.s;
                                  const hexColor = hslToHex(h, s, lNum);
                                  setCustomColors({ ...customColors, [field]: hexColor });
                                  saveColors({ ...customColors, [field]: hexColor });
                                  setTempHslValues({ ...tempHslValues, [field]: undefined as any });
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
            })}
          </div>

          {/* Reset Button */}
          <div className="flex gap-2 pt-4 border-t">
            <Button
              variant="outline"
              onClick={handleResetColors}
              disabled={isSaving}
              className="w-full"
              data-testid="button-reset-colors"
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              Reset to Defaults
            </Button>
          </div>

          {isSaving && (
            <p className="text-xs text-muted-foreground text-center">
              Saving changes...
            </p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
