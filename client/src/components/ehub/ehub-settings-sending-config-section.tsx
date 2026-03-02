import type { Dispatch, SetStateAction } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { calculateOptimalDelays, type EhubSettings } from "@/components/ehub/ehub.types";

type EhubSettingsSendingConfigSectionProps = {
  setSettingsForm: Dispatch<SetStateAction<EhubSettings>>;
  settingsForm: EhubSettings;
};

export function EhubSettingsSendingConfigSection({
  setSettingsForm,
  settingsForm,
}: EhubSettingsSendingConfigSectionProps) {
  return (
    <>
      <div className="space-y-4">
        <h3 className="font-semibold">Sending Configuration</h3>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <Label htmlFor="startHour">Start Hour (24h)</Label>
            <Input
              id="startHour"
              data-testid="input-settings-start-hour"
              type="number"
              value={settingsForm.sendingHoursStart}
              onChange={(e) => {
                const val = e.target.value;
                if (val === "") {
                  setSettingsForm({ ...settingsForm, sendingHoursStart: "" as any });
                  return;
                }
                const newStart = parseInt(val, 10);
                if (isNaN(newStart)) return;

                const duration = settingsForm.sendingHoursDuration || 5;
                const optimal = calculateOptimalDelays(
                  newStart,
                  duration,
                  settingsForm.dailyEmailLimit,
                  settingsForm.jitterPercentage,
                );
                setSettingsForm({
                  ...settingsForm,
                  sendingHoursStart: newStart,
                  minDelayMinutes: optimal.minDelayMinutes,
                  maxDelayMinutes: optimal.maxDelayMinutes,
                });
              }}
              onBlur={() => {
                const duration = settingsForm.sendingHoursDuration || 5;
                if ((settingsForm.sendingHoursStart as any) === "" || settingsForm.sendingHoursStart === (null as any)) {
                  const optimal = calculateOptimalDelays(9, duration, settingsForm.dailyEmailLimit, settingsForm.jitterPercentage);
                  setSettingsForm({ ...settingsForm, sendingHoursStart: 9, minDelayMinutes: optimal.minDelayMinutes, maxDelayMinutes: optimal.maxDelayMinutes });
                } else if (settingsForm.sendingHoursStart < 0) {
                  const optimal = calculateOptimalDelays(0, duration, settingsForm.dailyEmailLimit, settingsForm.jitterPercentage);
                  setSettingsForm({ ...settingsForm, sendingHoursStart: 0, minDelayMinutes: optimal.minDelayMinutes, maxDelayMinutes: optimal.maxDelayMinutes });
                } else if (settingsForm.sendingHoursStart > 23) {
                  const optimal = calculateOptimalDelays(23, duration, settingsForm.dailyEmailLimit, settingsForm.jitterPercentage);
                  setSettingsForm({ ...settingsForm, sendingHoursStart: 23, minDelayMinutes: optimal.minDelayMinutes, maxDelayMinutes: optimal.maxDelayMinutes });
                }
              }}
              min={0}
              max={23}
            />
          </div>
          <div>
            <Label htmlFor="duration">Duration (hours, 1-24)</Label>
            <Input
              id="duration"
              data-testid="input-settings-duration"
              type="number"
              value={settingsForm.sendingHoursDuration || (settingsForm.sendingHoursEnd === settingsForm.sendingHoursStart ? 24 : ((settingsForm.sendingHoursEnd || 14) - settingsForm.sendingHoursStart + 24) % 24) || 5}
              onChange={(e) => {
                const val = e.target.value;
                if (val === "") {
                  setSettingsForm({ ...settingsForm, sendingHoursDuration: undefined });
                  return;
                }
                const newDuration = parseInt(val, 10);
                if (isNaN(newDuration) || newDuration < 1 || newDuration > 24) return;

                const endHour = (settingsForm.sendingHoursStart + newDuration) % 24;

                const optimal = calculateOptimalDelays(
                  settingsForm.sendingHoursStart,
                  newDuration,
                  settingsForm.dailyEmailLimit,
                  settingsForm.jitterPercentage,
                );
                setSettingsForm({
                  ...settingsForm,
                  sendingHoursDuration: newDuration,
                  sendingHoursEnd: endHour,
                  minDelayMinutes: optimal.minDelayMinutes,
                  maxDelayMinutes: optimal.maxDelayMinutes,
                });
              }}
              onBlur={() => {
                const currentDuration = settingsForm.sendingHoursDuration || 5;
                if (currentDuration < 1) {
                  const optimal = calculateOptimalDelays(settingsForm.sendingHoursStart, 1, settingsForm.dailyEmailLimit, settingsForm.jitterPercentage);
                  const endHour = (settingsForm.sendingHoursStart + 1) % 24;
                  setSettingsForm({ ...settingsForm, sendingHoursDuration: 1, sendingHoursEnd: endHour, minDelayMinutes: optimal.minDelayMinutes, maxDelayMinutes: optimal.maxDelayMinutes });
                } else if (currentDuration > 24) {
                  const optimal = calculateOptimalDelays(settingsForm.sendingHoursStart, 24, settingsForm.dailyEmailLimit, settingsForm.jitterPercentage);
                  const endHour = (settingsForm.sendingHoursStart + 24) % 24;
                  setSettingsForm({ ...settingsForm, sendingHoursDuration: 24, sendingHoursEnd: endHour, minDelayMinutes: optimal.minDelayMinutes, maxDelayMinutes: optimal.maxDelayMinutes });
                }
              }}
              min={1}
              max={24}
            />
            <p className="text-sm text-muted-foreground mt-1">
              {settingsForm.sendingHoursStart}:00 + {settingsForm.sendingHoursDuration || 5}h → {String((settingsForm.sendingHoursStart + (settingsForm.sendingHoursDuration || 5)) % 24).padStart(2, "0")}:00
              {(settingsForm.sendingHoursStart + (settingsForm.sendingHoursDuration || 5)) >= 24 && " (next day)"}
            </p>
          </div>
          <div>
            <Label htmlFor="dailyLimit">Daily Email Limit</Label>
            <Input
              id="dailyLimit"
              data-testid="input-settings-daily-limit"
              type="number"
              value={settingsForm.dailyEmailLimit}
              onChange={(e) => {
                const val = e.target.value;
                if (val === "") {
                  setSettingsForm({ ...settingsForm, dailyEmailLimit: "" as any });
                  return;
                }
                const newLimit = parseInt(val, 10);
                if (isNaN(newLimit)) return;

                const duration = settingsForm.sendingHoursDuration || 5;
                const optimal = calculateOptimalDelays(
                  settingsForm.sendingHoursStart,
                  duration,
                  newLimit,
                  settingsForm.jitterPercentage,
                );
                setSettingsForm({
                  ...settingsForm,
                  dailyEmailLimit: newLimit,
                  minDelayMinutes: optimal.minDelayMinutes,
                  maxDelayMinutes: optimal.maxDelayMinutes,
                });
              }}
              onBlur={() => {
                const duration = settingsForm.sendingHoursDuration || 5;
                if ((settingsForm.dailyEmailLimit as any) === "" || settingsForm.dailyEmailLimit === (null as any)) {
                  const optimal = calculateOptimalDelays(settingsForm.sendingHoursStart, duration, 200, settingsForm.jitterPercentage);
                  setSettingsForm({ ...settingsForm, dailyEmailLimit: 200, minDelayMinutes: optimal.minDelayMinutes, maxDelayMinutes: optimal.maxDelayMinutes });
                } else if (settingsForm.dailyEmailLimit < 1) {
                  const optimal = calculateOptimalDelays(settingsForm.sendingHoursStart, duration, 1, settingsForm.jitterPercentage);
                  setSettingsForm({ ...settingsForm, dailyEmailLimit: 1, minDelayMinutes: optimal.minDelayMinutes, maxDelayMinutes: optimal.maxDelayMinutes });
                } else if (settingsForm.dailyEmailLimit > 2000) {
                  const optimal = calculateOptimalDelays(settingsForm.sendingHoursStart, duration, 2000, settingsForm.jitterPercentage);
                  setSettingsForm({ ...settingsForm, dailyEmailLimit: 2000, minDelayMinutes: optimal.minDelayMinutes, maxDelayMinutes: optimal.maxDelayMinutes });
                }
              }}
              min={1}
              max={2000}
            />
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          Your sending window: when your team can send emails (Gmail limit: 500-2000/day)
        </p>

        <div className="rounded-md bg-muted/50 p-4 border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Calculated Email Spacing</p>
              <p className="text-xs text-muted-foreground">
                Based on company sending window and daily limit
              </p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold">
                {(() => {
                  const companyWindowHours = settingsForm.sendingHoursDuration ||
                    (((settingsForm.sendingHoursEnd ?? settingsForm.sendingHoursStart) - settingsForm.sendingHoursStart + 24) % 24) || 1;
                  const companyWindowMinutes = companyWindowHours * 60;
                  const averageSpacing = settingsForm.dailyEmailLimit > 0
                    ? companyWindowMinutes / settingsForm.dailyEmailLimit
                    : 5;
                  return Math.round(averageSpacing);
                })()}
                <span className="text-sm font-normal text-muted-foreground ml-1">min</span>
              </p>
              <p className="text-xs text-muted-foreground">
                {settingsForm.sendingHoursDuration || (((settingsForm.sendingHoursEnd ?? settingsForm.sendingHoursStart) - settingsForm.sendingHoursStart + 24) % 24) || 1}hr window ÷ {settingsForm.dailyEmailLimit} emails
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Random Jitter Range</p>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                Auto-calculated to create natural variation (±
                <Input
                  type="number"
                  value={settingsForm.jitterPercentage}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === "") {
                      setSettingsForm({ ...settingsForm, jitterPercentage: "" as any });
                      return;
                    }
                    const newJitter = parseInt(val, 10);
                    if (isNaN(newJitter)) return;

                    const duration = settingsForm.sendingHoursDuration || (((settingsForm.sendingHoursEnd ?? settingsForm.sendingHoursStart) - settingsForm.sendingHoursStart + 24) % 24) || 1;
                    const optimal = calculateOptimalDelays(
                      settingsForm.sendingHoursStart,
                      duration,
                      settingsForm.dailyEmailLimit,
                      newJitter,
                    );
                    setSettingsForm({
                      ...settingsForm,
                      jitterPercentage: newJitter,
                      minDelayMinutes: optimal.minDelayMinutes,
                      maxDelayMinutes: optimal.maxDelayMinutes,
                    });
                  }}
                  onBlur={() => {
                    const duration = settingsForm.sendingHoursDuration || (((settingsForm.sendingHoursEnd ?? settingsForm.sendingHoursStart) - settingsForm.sendingHoursStart + 24) % 24) || 1;
                    if ((settingsForm.jitterPercentage as any) === "" || settingsForm.jitterPercentage === (null as any)) {
                      const optimal = calculateOptimalDelays(settingsForm.sendingHoursStart, duration, settingsForm.dailyEmailLimit, 50);
                      setSettingsForm({ ...settingsForm, jitterPercentage: 50, minDelayMinutes: optimal.minDelayMinutes, maxDelayMinutes: optimal.maxDelayMinutes });
                    } else if (settingsForm.jitterPercentage < 1) {
                      const optimal = calculateOptimalDelays(settingsForm.sendingHoursStart, duration, settingsForm.dailyEmailLimit, 1);
                      setSettingsForm({ ...settingsForm, jitterPercentage: 1, minDelayMinutes: optimal.minDelayMinutes, maxDelayMinutes: optimal.maxDelayMinutes });
                    } else if (settingsForm.jitterPercentage > 100) {
                      const optimal = calculateOptimalDelays(settingsForm.sendingHoursStart, duration, settingsForm.dailyEmailLimit, 100);
                      setSettingsForm({ ...settingsForm, jitterPercentage: 100, minDelayMinutes: optimal.minDelayMinutes, maxDelayMinutes: optimal.maxDelayMinutes });
                    }
                  }}
                  min={1}
                  max={100}
                  className="w-14 h-6 px-2 text-xs text-center"
                  data-testid="input-jitter-percentage"
                />
                <span className="font-bold">%</span> of spacing)
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-md bg-muted/30 p-3 border border-dashed">
              <Label className="text-xs text-muted-foreground">Min Jitter</Label>
              <p className="text-lg font-semibold">{settingsForm.minDelayMinutes} min</p>
            </div>
            <div className="rounded-md bg-muted/30 p-3 border border-dashed">
              <Label className="text-xs text-muted-foreground">Max Jitter</Label>
              <p className="text-lg font-semibold">{settingsForm.maxDelayMinutes} min</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
