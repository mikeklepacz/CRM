import { useEffect, useState } from "react";
import { ExternalLink, Loader2, Palette, Save } from "lucide-react";
import { canAccessAdminFeatures } from "@/lib/authUtils";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useTheme } from "@/components/theme-provider";
import { useToast } from "@/hooks/use-toast";
import { defaultDarkColors, defaultLightColors } from "@/hooks/use-custom-theme";
import { SharedColorPicker } from "@/components/shared-color-picker";
import { StatusManagementDialog } from "@/components/status-management-dialog";

type StatusEditorPopoverProps = {
  statusOptions: string[];
  statusColors: { [status: string]: { background: string; text: string } };
  colorRowByStatus: boolean;
  setColorRowByStatus: (value: boolean) => void;
  saveAllStatusColors: (allColors: { [status: string]: { background: string; text: string } }) => Promise<any>;
  colorPresets: Array<{ name: string; color: string }>;
  setColorPresets: (presets: Array<{ name: string; color: string }>) => void;
  deleteColorPreset: (index: number) => void;
  currentUser: any;
};

export function StatusEditorPopover({
  statusOptions,
  statusColors,
  colorRowByStatus,
  setColorRowByStatus,
  saveAllStatusColors,
  colorPresets,
  setColorPresets,
  deleteColorPreset,
  currentUser,
}: StatusEditorPopoverProps) {
  const { toast } = useToast();
  const { actualTheme } = useTheme();
  const [localStatuses, setLocalStatuses] = useState(statusOptions);
  const [localColors, setLocalColors] = useState(statusColors);
  const [isSaving, setIsSaving] = useState(false);
  const [statusManagementOpen, setStatusManagementOpen] = useState(false);

  const isAdmin = canAccessAdminFeatures(currentUser);

  useEffect(() => {
    setLocalStatuses(statusOptions);
    setLocalColors(statusColors);
  }, [statusOptions, statusColors]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const colorsToSave: { [status: string]: { background: string; text: string } } = {};
      for (const statusName of localStatuses) {
        colorsToSave[statusName] = localColors[statusName] || { background: "#e5e7eb", text: "#000000" };
      }
      await saveAllStatusColors(colorsToSave);

      toast({
        title: "Success",
        description: "Status colors saved successfully",
      });
    } catch (_error) {
      toast({
        title: "Error",
        description: "Failed to save status colors",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSavePreset = (color: string, name: string) => {
    const newPresets = [...colorPresets, { name, color }];
    setColorPresets(newPresets);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" data-testid="button-status">
          <Palette className="mr-2 h-4 w-4" />
          Status
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[500px] max-h-[600px] overflow-y-auto" align="end">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium">Status Customization</h4>
          </div>
          <p className="text-xs text-muted-foreground">Customize status colors{isAdmin ? " and names" : ""}. Changes apply everywhere.</p>

          {isAdmin && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setStatusManagementOpen(true)}
              className="w-full"
              data-testid="button-edit-statuses"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Edit Statuses
            </Button>
          )}

          <div className="flex items-center gap-2 p-3 rounded-md border">
            <Checkbox
              id="status-color-rows"
              checked={colorRowByStatus}
              onCheckedChange={(checked) => setColorRowByStatus(!!checked)}
              data-testid="checkbox-status-color-rows"
            />
            <Label htmlFor="status-color-rows" className="text-sm cursor-pointer">
              Color Rows by Status
            </Label>
          </div>

          <div className="space-y-3">
            <Label className="text-sm font-medium">Edit Status Colors</Label>
            {localStatuses.map((statusName, index) => {
              const statusNumber = index + 1;
              const colors = localColors[statusName] || { background: "#e5e7eb", text: "#000000" };

              return (
                <div key={index} className="space-y-2 p-3 rounded-md border">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-muted-foreground w-4">{statusNumber}</span>
                    <div className="flex-1 text-sm">{statusName}</div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <SharedColorPicker
                      label="Background"
                      value={colors.background}
                      onChange={(color) => {
                        setLocalColors({
                          ...localColors,
                          [statusName]: { ...colors, background: color },
                        });
                      }}
                      onReset={() => {
                        const defaultColors = actualTheme === "dark" ? defaultDarkColors : defaultLightColors;
                        const defaultStatusColors = defaultColors.statusColors?.[statusName];
                        if (defaultStatusColors) {
                          setLocalColors({
                            ...localColors,
                            [statusName]: { ...colors, background: defaultStatusColors.background },
                          });
                        }
                      }}
                      colorPresets={colorPresets}
                      onSavePreset={(color, name) => handleSavePreset(color, name)}
                      onDeletePreset={deleteColorPreset}
                      testId={`input-status-bg-${index}`}
                    />

                    <SharedColorPicker
                      label="Text"
                      value={colors.text}
                      onChange={(color) => {
                        setLocalColors({
                          ...localColors,
                          [statusName]: { ...colors, text: color },
                        });
                      }}
                      onReset={() => {
                        const defaultColors = actualTheme === "dark" ? defaultDarkColors : defaultLightColors;
                        const defaultStatusColors = defaultColors.statusColors?.[statusName];
                        if (defaultStatusColors) {
                          setLocalColors({
                            ...localColors,
                            [statusName]: { ...colors, text: defaultStatusColors.text },
                          });
                        }
                      }}
                      colorPresets={colorPresets}
                      onSavePreset={(color, name) => handleSavePreset(color, name)}
                      onDeletePreset={deleteColorPreset}
                      testId={`input-status-text-${index}`}
                    />
                  </div>
                  <div
                    className="px-3 py-2 rounded-sm text-sm text-center"
                    style={{
                      backgroundColor: colors.background,
                      color: colors.text,
                    }}
                    data-testid={`preview-status-${index}`}
                  >
                    {statusName}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-4 border-t">
            <Button onClick={handleSave} disabled={isSaving} className="w-full" data-testid="button-save-status-colors">
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Colors
                </>
              )}
            </Button>
          </div>
        </div>
      </PopoverContent>

      <StatusManagementDialog open={statusManagementOpen} onOpenChange={setStatusManagementOpen} />
    </Popover>
  );
}
