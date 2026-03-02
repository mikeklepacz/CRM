import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, Loader2, PhoneCall } from "lucide-react";

interface VoiceHubBatchControlsCardProps {
  agents: Array<{ id: string; name: string }>;
  agentsLoading: boolean;
  ivrBehavior: "flag_and_end" | "flag_and_continue";
  onBatchCall: () => void;
  onIvrBehaviorChange: (value: "flag_and_end" | "flag_and_continue") => void;
  onScheduledTimeChange: (value: string) => void;
  onSchedulingModeChange: (value: "immediate" | "scheduled" | "auto") => void;
  onSelectedAgentChange: (value: string) => void;
  schedulingMode: "immediate" | "scheduled" | "auto";
  scheduledTime: string;
  selectedAgent: string;
  selectedStoresSize: number;
  submitting: boolean;
}

export function VoiceHubBatchControlsCard({
  agents,
  agentsLoading,
  ivrBehavior,
  onBatchCall,
  onIvrBehaviorChange,
  onScheduledTimeChange,
  onSchedulingModeChange,
  onSelectedAgentChange,
  schedulingMode,
  scheduledTime,
  selectedAgent,
  selectedStoresSize,
  submitting,
}: VoiceHubBatchControlsCardProps) {
  return (
    <Card data-testid="card-batch-controls">
      <CardHeader>
        <CardTitle>Batch Calling</CardTitle>
        <CardDescription>Select an AI agent and queue multiple calls at once</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium mb-2 block">Select Agent</label>
              <Select
                value={selectedAgent}
                onValueChange={(value) => {
                  console.log("[CallManager] Agent selected:", value);
                  onSelectedAgentChange(value);
                }}
                disabled={agentsLoading}
              >
                <SelectTrigger data-testid="select-agent">
                  <SelectValue placeholder={agentsLoading ? "Loading agents..." : "Choose an agent"} />
                </SelectTrigger>
                <SelectContent>
                  {agents.map((agent) => (
                    <SelectItem key={agent.id} value={agent.id} data-testid={`select-agent-${agent.id}`}>
                      {agent.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Scheduling</label>
              <RadioGroup
                value={schedulingMode}
                onValueChange={(v) => onSchedulingModeChange(v as "immediate" | "scheduled" | "auto")}
                data-testid="radio-scheduling-mode"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="immediate" id="immediate" data-testid="radio-immediate" />
                  <Label htmlFor="immediate">Call Immediately</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="scheduled" id="scheduled" data-testid="radio-scheduled" />
                  <Label htmlFor="scheduled">Schedule for Later</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="auto" id="auto" data-testid="radio-auto" />
                  <Label htmlFor="auto">Auto Schedule (Smart Hours)</Label>
                </div>
              </RadioGroup>
            </div>
          </div>

          {schedulingMode === "scheduled" && (
            <div>
              <label className="text-sm font-medium mb-2 block">Schedule Date & Time</label>
              <Input
                type="datetime-local"
                value={scheduledTime}
                onChange={(e) => onScheduledTimeChange(e.target.value)}
                step="300"
                min={(() => {
                  const now = new Date();
                  const offset = now.getTimezoneOffset();
                  const localTime = new Date(now.getTime() - offset * 60 * 1000);
                  return localTime.toISOString().slice(0, 16);
                })()}
                data-testid="input-scheduled-time"
              />
            </div>
          )}

          {schedulingMode === "auto" && (
            <div className="rounded-md bg-muted p-3">
              <p className="text-sm text-muted-foreground">
                Calls will be automatically scheduled during each store's business hours based on their timezone and operating schedule.
              </p>
            </div>
          )}

          <div>
            <label className="text-sm font-medium mb-2 block">IVR & Voicemail Handling</label>
            <RadioGroup
              value={ivrBehavior}
              onValueChange={(v) => onIvrBehaviorChange(v as "flag_and_end" | "flag_and_continue")}
              data-testid="radio-ivr-behavior"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="flag_and_end" id="flag_and_end" data-testid="radio-flag-end" />
                <Label htmlFor="flag_and_end" className="font-normal">
                  Flag & End Call
                  <span className="block text-xs text-muted-foreground">Mark store as automated line and hang up immediately</span>
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="flag_and_continue" id="flag_and_continue" data-testid="radio-flag-continue" />
                <Label htmlFor="flag_and_continue" className="font-normal">
                  Flag & Navigate Menu
                  <span className="block text-xs text-muted-foreground">Mark store as automated line but try to navigate IVR system</span>
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div className="flex justify-end">
            <Button
              onClick={onBatchCall}
              disabled={selectedStoresSize === 0 || !selectedAgent || submitting}
              data-testid="button-queue-calls"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Queueing...
                </>
              ) : schedulingMode === "scheduled" ? (
                <>
                  <Calendar className="h-4 w-4 mr-2" />
                  Schedule {selectedStoresSize > 0 ? `${selectedStoresSize} ` : ""}Calls
                </>
              ) : schedulingMode === "auto" ? (
                <>
                  <Clock className="h-4 w-4 mr-2" />
                  Auto Schedule {selectedStoresSize > 0 ? `${selectedStoresSize} ` : ""}Calls
                </>
              ) : (
                <>
                  <PhoneCall className="h-4 w-4 mr-2" />
                  Queue {selectedStoresSize > 0 ? `${selectedStoresSize} ` : ""}Calls
                </>
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
