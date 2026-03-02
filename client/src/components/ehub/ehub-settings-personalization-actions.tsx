import { AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type EhubSettingsPersonalizationActionsProps = {
  isPending: boolean;
  isSettingsDirty: boolean;
  settingsForm: any;
  onDiscardSettings: () => void;
  onSaveSettings: () => void;
  onSettingsFormChange: (next: any) => void;
};

export function EhubSettingsPersonalizationActions({
  isPending,
  isSettingsDirty,
  settingsForm,
  onDiscardSettings,
  onSaveSettings,
  onSettingsFormChange,
}: EhubSettingsPersonalizationActionsProps) {
  return (
    <>
      <div className="space-y-2">
        <Label>Active Days</Label>
        <p className="text-sm text-muted-foreground">
          Select which days emails can be sent (green = active, red = excluded)
        </p>
        <div className="grid grid-cols-7 gap-2">
          {["S", "M", "T", "W", "T", "F", "S"].map((dayLetter, index) => {
            const isExcluded = settingsForm.excludedDays.includes(index);
            return (
              <Button
                key={index}
                type="button"
                size="default"
                data-testid={`button-day-${index}`}
                className={`min-h-9 ${
                  isExcluded
                    ? "bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800 text-white border-red-700 dark:border-red-800"
                    : "bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-800 text-white border-green-700 dark:border-green-800"
                }`}
                onClick={() => {
                  const newExcludedDays = isExcluded
                    ? settingsForm.excludedDays.filter((d: number) => d !== index)
                    : [...settingsForm.excludedDays, index].sort((a: number, b: number) => a - b);
                  onSettingsFormChange({ ...settingsForm, excludedDays: newExcludedDays });
                }}
              >
                {dayLetter}
              </Button>
            );
          })}
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="font-semibold">AI Personalization</h3>
        <div>
          <Label htmlFor="promptInjection">AI Prompt Injection</Label>
          <Textarea
            id="promptInjection"
            data-testid="input-settings-prompt"
            value={settingsForm.promptInjection}
            onChange={(e) => onSettingsFormChange({ ...settingsForm, promptInjection: e.target.value })}
            placeholder="Custom AI instructions for email personalization..."
            rows={4}
          />
          <p className="text-sm text-muted-foreground mt-1">
            Global AI instructions used to personalize all outreach emails
          </p>
        </div>

        <div>
          <Label htmlFor="keywordBin">Keyword Bin</Label>
          <Textarea
            id="keywordBin"
            data-testid="input-settings-keywords"
            value={settingsForm.keywordBin}
            onChange={(e) => onSettingsFormChange({ ...settingsForm, keywordBin: e.target.value })}
            placeholder="Context keywords for AI (comma-separated)..."
            rows={3}
          />
          <p className="text-sm text-muted-foreground mt-1">
            Additional context keywords to help AI understand your business
          </p>
        </div>
      </div>

      {isSettingsDirty && (
        <div className="rounded-md bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 p-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-500" />
            <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
              You have unsaved changes
            </p>
          </div>
          <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
            Save your changes or discard them before switching tabs.
          </p>
        </div>
      )}

      <div className="flex justify-end gap-2">
        {isSettingsDirty && (
          <Button
            variant="outline"
            onClick={onDiscardSettings}
            data-testid="button-discard-settings"
          >
            Discard Changes
          </Button>
        )}
        <Button
          onClick={onSaveSettings}
          disabled={isPending || !isSettingsDirty}
          data-testid="button-save-settings"
        >
          {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          Save Settings
        </Button>
      </div>
    </>
  );
}
