import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { Palette, Save, RotateCcw } from "lucide-react";
import { HslColorPicker } from "react-colorful";
import { useTheme } from "@/components/theme-provider";
import { useCustomTheme, defaultLightColors, defaultDarkColors } from "@/hooks/use-custom-theme";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

// Color conversion helpers
const hexToHsl = (hex: string) => {
  // Remove # if present
  hex = hex.replace(/^#/, '');
  
  // Convert hex to RGB
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;
  
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
};

const hslToHex = (h: number, s: number, l: number) => {
  h = h / 360;
  s = s / 100;
  l = l / 100;
  
  let r, g, b;
  
  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };
    
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }
  
  const toHex = (x: number) => {
    const hex = Math.round(x * 255).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };
  
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
};

export function ColorCustomizerButton() {
  const { toast } = useToast();
  const { theme, actualTheme } = useTheme();
  const { currentColors } = useCustomTheme();
  const queryClient = useQueryClient();
  
  const [customColors, setCustomColors] = useState(currentColors);
  const [activeColorField, setActiveColorField] = useState<string | null>(null);
  const [presetName, setPresetName] = useState("");
  const [colorPresets, setColorPresets] = useState<Array<{ name: string; color: string }>>([]);

  // Sync customColors with currentColors when they change
  useEffect(() => {
    setCustomColors(currentColors);
  }, [currentColors]);

  // Save color mutation
  const saveColorsMutation = useMutation({
    mutationFn: async (colors: typeof customColors) => {
      // Save colors for the current theme
      const payload = actualTheme === 'dark'
        ? { darkModeColors: colors, hasDarkOverrides: true }
        : { lightModeColors: colors, hasLightOverrides: true };
      
      return apiRequest('/api/user/preferences', {
        method: 'PUT',
        body: JSON.stringify(payload),
        headers: { 'Content-Type': 'application/json' },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/user/preferences'] });
      toast({
        title: "Colors saved",
        description: `Your ${actualTheme} mode colors have been saved.`,
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save color preferences",
        variant: "destructive",
      });
    },
  });

  // Reset colors mutation
  const resetColorsMutation = useMutation({
    mutationFn: async () => {
      // Reset colors for the current theme
      const payload = actualTheme === 'dark'
        ? { darkModeColors: defaultDarkColors, hasDarkOverrides: false }
        : { lightModeColors: defaultLightColors, hasLightOverrides: false };
      
      return apiRequest('/api/user/preferences', {
        method: 'PUT',
        body: JSON.stringify(payload),
        headers: { 'Content-Type': 'application/json' },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/user/preferences'] });
      const defaults = actualTheme === 'dark' ? defaultDarkColors : defaultLightColors;
      setCustomColors(defaults);
      toast({
        title: "Colors reset",
        description: `${actualTheme} mode colors have been reset to defaults.`,
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to reset colors",
        variant: "destructive",
      });
    },
  });

  const handleSaveColors = () => {
    saveColorsMutation.mutate(customColors);
  };

  const handleResetColors = () => {
    resetColorsMutation.mutate();
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" data-testid="button-color-customizer">
          <Palette className="h-5 w-5" />
          <span className="sr-only">Customize Colors</span>
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
                          }}
                        />

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
                                  setCustomColors({ ...customColors, [field]: hexColor });
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
                                  setCustomColors({ ...customColors, [field]: hexColor });
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
                                  setCustomColors({ ...customColors, [field]: hexColor });
                                }}
                                className="font-mono text-xs"
                              />
                            </div>
                          </div>
                        </div>

                        {colorPresets.length > 0 && (
                          <div className="space-y-2">
                            <Label className="text-xs text-muted-foreground">Saved Presets</Label>
                            <div className="grid grid-cols-5 gap-2">
                              {colorPresets.map((preset, idx) => (
                                <div key={idx} className="relative group">
                                  <button
                                    onClick={() => setCustomColors({ ...customColors, [field]: preset.color })}
                                    className="h-10 w-full rounded border hover:ring-2 hover:ring-primary transition-all"
                                    style={{ backgroundColor: preset.color }}
                                    title={preset.name}
                                  />
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setColorPresets(colorPresets.filter((_, i) => i !== idx));
                                      toast({ title: "Preset deleted", description: `"${preset.name}" removed` });
                                    }}
                                    className="absolute -top-1 -right-1 h-4 w-4 bg-destructive text-destructive-foreground rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-xs"
                                  >
                                    ×
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="space-y-2">
                          <Label className="text-xs text-muted-foreground">Save as Preset</Label>
                          <div className="flex gap-2">
                            <Input
                              placeholder="Preset name"
                              value={presetName}
                              onChange={(e) => setPresetName(e.target.value)}
                              className="flex-1 text-sm"
                            />
                            <Button
                              size="sm"
                              onClick={() => {
                                if (presetName.trim()) {
                                  const colorValue = customColors[field as keyof typeof customColors];
                                  const colorString = typeof colorValue === 'string' ? colorValue : JSON.stringify(colorValue);
                                  setColorPresets([...colorPresets, { name: presetName, color: colorString }]);
                                  setPresetName("");
                                  toast({ title: "Preset saved", description: `"${presetName}" added to presets` });
                                }
                              }}
                              disabled={!presetName.trim()}
                            >
                              <Save className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>

                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full"
                          onClick={() => {
                            if (field === 'bodyBackground' || field === 'headerBackground') {
                              setCustomColors({ ...customColors, [field]: '' });
                            } else {
                              // Use the correct defaults based on current theme
                              const defaultColors = actualTheme === 'dark' ? defaultDarkColors : defaultLightColors;
                              setCustomColors({ ...customColors, [field]: defaultColors[field] });
                            }
                          }}
                        >
                          <RotateCcw className="h-4 w-4 mr-2" />
                          {field === 'bodyBackground' || field === 'headerBackground' ? 'Reset to Theme Default' : 'Reset to Default'}
                        </Button>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              );
            })}

            <Separator className="my-4" />

            <div className="flex gap-2">
              <Button 
                onClick={handleSaveColors} 
                className="flex-1" 
                data-testid="button-save-colors"
                style={customColors.actionButtons ? { backgroundColor: customColors.actionButtons, borderColor: customColors.actionButtons } : undefined}
              >
                <Save className="h-4 w-4 mr-2" />
                Save Colors
              </Button>
              <Button onClick={handleResetColors} variant="outline" data-testid="button-reset-colors">
                <RotateCcw className="h-4 w-4 mr-2" />
                Reset
              </Button>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
