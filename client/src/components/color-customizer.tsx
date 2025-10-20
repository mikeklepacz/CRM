import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Palette, Save, RotateCcw } from "lucide-react";
import { HslColorPicker } from "react-colorful";
import { useCustomTheme } from "@/hooks/use-custom-theme";
import { useTheme } from "@/components/theme-provider";

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

export function ColorCustomizer() {
  const { actualTheme } = useTheme();
  const { currentColors, saveColors, resetColors, isSaving } = useCustomTheme();
  const [customColors, setCustomColors] = useState(currentColors);
  const [activeColorField, setActiveColorField] = useState<string | null>(null);
  const [colorPresets, setColorPresets] = useState<Array<{ name: string; color: string }>>([]);
  const [presetName, setPresetName] = useState("");

  // Sync customColors when currentColors changes (theme switch or initial load)
  useEffect(() => {
    setCustomColors(currentColors);
  }, [currentColors]);

  const handleSaveColors = () => {
    saveColors(customColors);
  };

  const handleResetColors = () => {
    resetColors();
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
                                }
                              }}
                              className="font-mono text-xs flex-1"
                              placeholder="#000000"
                            />
                            <Input
                              type="color"
                              value={currentColor}
                              onChange={(e) => {
                                setCustomColors({ ...customColors, [field]: e.target.value });
                              }}
                              className="w-16 h-9 p-1 cursor-pointer"
                              data-testid={`eyedropper-${field}`}
                            />
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
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              );
            })}
          </div>

          <div className="flex gap-2 pt-4 border-t">
            <Button
              onClick={handleSaveColors}
              disabled={isSaving}
              className="flex-1"
              data-testid="button-save-colors"
            >
              <Save className="mr-2 h-4 w-4" />
              {isSaving ? 'Saving...' : 'Save Colors'}
            </Button>
            <Button
              variant="outline"
              onClick={handleResetColors}
              disabled={isSaving}
              data-testid="button-reset-colors"
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              Reset
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}