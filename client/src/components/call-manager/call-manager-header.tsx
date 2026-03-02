import { Button } from "@/components/ui/button";
import { Bomb } from "lucide-react";

export function CallManagerHeader(props: any) {
  return (
    <>
      <div>
        <h1 className="text-3xl font-bold tracking-tight" data-testid="text-call-manager-title">
          Call Manager
        </h1>
        <p className="text-muted-foreground mt-2" data-testid="text-call-manager-description">
          Intelligently queue AI voice calls based on calling scenarios
        </p>
      </div>

      <div className="flex items-center gap-3">
        <div
          className="flex items-center gap-1.5"
          title={
            props.voiceProxyStatus?.healthy
              ? `Voice service online${props.voiceProxyStatus.sessions > 0 ? ` (${props.voiceProxyStatus.sessions} active)` : ""}`
              : `Voice service offline${props.voiceProxyStatus?.error ? `: ${props.voiceProxyStatus.error}` : ""}`
          }
          data-testid="indicator-voice-proxy"
        >
          <div className={`w-2.5 h-2.5 rounded-full ${props.voiceProxyStatus?.healthy ? "bg-green-500" : "bg-red-500"}`} />
        </div>

        {props.canAccessAdmin && (
          <Button
            variant="destructive"
            size="sm"
            onClick={() => props.setIsNukeCallDataDialogOpen(true)}
            data-testid="button-nuke-call-data"
          >
            <Bomb className="h-4 w-4 mr-2" />
            Nuke Call Data
          </Button>
        )}
      </div>
    </>
  );
}
