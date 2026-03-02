import type { Dispatch, SetStateAction } from "react";
import { AlertCircle, Loader2, Plus, Trash2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type SaveStepDelaysMutation = {
  isPending: boolean;
  mutate: (payload: { stepDelays: number[]; repeatLastStep: boolean }) => void;
};

type EhubStrategyStepDelaysCardProps = {
  repeatLastStep: boolean;
  saveStepDelaysMutation: SaveStepDelaysMutation;
  setRepeatLastStep: Dispatch<SetStateAction<boolean>>;
  setStepDelays: Dispatch<SetStateAction<number[]>>;
  stepDelays: number[];
  toast: (value: any) => void;
};

export function EhubStrategyStepDelaysCard({
  repeatLastStep,
  saveStepDelaysMutation,
  setRepeatLastStep,
  setStepDelays,
  stepDelays,
  toast,
}: EhubStrategyStepDelaysCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Step Delays</CardTitle>
        <CardDescription>
          Configure the delay (in days) before each email step
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {stepDelays.length > 0 ? (
          <div className="space-y-3">
            {stepDelays.map((delay, index) => {
              const isLastStep = index === stepDelays.length - 1;
              return (
                <div key={index} className="space-y-2">
                  <div className="flex gap-2 items-end">
                    <div className="flex-1">
                      <Label htmlFor={`delay-${index}`} className="text-xs">
                        {index === 0 ? "Delay before Email 1 (days)" : `Delay before Email ${index + 1} (days)`}
                      </Label>
                      <Input
                        id={`delay-${index}`}
                        type="number"
                        step="0.0001"
                        min="0"
                        value={delay}
                        onChange={(e) => {
                          const val = e.target.value;
                          const newDelays = [...stepDelays];
                          if (val === "" || val === ".") {
                            newDelays[index] = val as any;
                            setStepDelays(newDelays);
                            return;
                          }
                          const parsed = parseFloat(val);
                          if (isNaN(parsed)) return;
                          newDelays[index] = parsed;
                          setStepDelays(newDelays);
                        }}
                        onBlur={() => {
                          const newDelays = [...stepDelays];
                          if ((delay as any) === "" || (delay as any) === "." || delay === (null as any)) {
                            newDelays[index] = 0;
                            setStepDelays(newDelays);
                          } else {
                            const val = typeof delay === "string" ? parseFloat(delay) : delay;
                            if (val < 0) {
                              newDelays[index] = 0;
                              setStepDelays(newDelays);
                            }
                          }
                        }}
                        data-testid={`input-step-delay-${index}`}
                        className="mt-1"
                      />
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        const newDelays = stepDelays.filter((_, i) => i !== index);
                        setStepDelays(newDelays);
                      }}
                      data-testid={`button-remove-delay-${index}`}
                      title="Remove this step delay"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                  {isLastStep && stepDelays.length > 0 && (
                    <div className="flex items-center gap-2 pl-1">
                      <Checkbox
                        id="repeat-last-step"
                        checked={repeatLastStep}
                        onCheckedChange={(checked) => setRepeatLastStep(!!checked)}
                        data-testid="checkbox-repeat-last-step"
                      />
                      <Label htmlFor="repeat-last-step" className="text-xs text-muted-foreground cursor-pointer">
                        Repeat this step every {delay} days until reply
                      </Label>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">
            No step delays configured yet
          </p>
        )}

        {stepDelays.length > 0 && (() => {
          const hasNegative = stepDelays.some((d) => d < 0);

          if (hasNegative) {
            return (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  All delays must be non-negative (0 or greater).
                </AlertDescription>
              </Alert>
            );
          }
          return null;
        })()}

        <div className="flex gap-2 pt-2">
          <Button
            variant="outline"
            onClick={() => {
              const lastDelay = stepDelays.length > 0 ? stepDelays[stepDelays.length - 1] : 0;
              setStepDelays([...stepDelays, lastDelay + 1]);
            }}
            data-testid="button-add-delay"
            className="flex-1"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Delay
          </Button>
          <Button
            onClick={() => {
              const hasNegative = stepDelays.some((d) => d < 0);

              if (hasNegative) {
                toast({
                  title: "Invalid Delays",
                  description: "All delays must be non-negative (0 or greater)",
                  variant: "destructive",
                });
                return;
              }

              saveStepDelaysMutation.mutate({ stepDelays, repeatLastStep });
            }}
            disabled={
              saveStepDelaysMutation.isPending ||
              stepDelays.length === 0 ||
              stepDelays.some((d) => d < 0)
            }
            data-testid="button-save-delays"
            className="flex-1"
          >
            {saveStepDelaysMutation.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : null}
            Save Delays
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
