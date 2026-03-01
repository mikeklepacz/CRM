import { Button } from "@/components/ui/button";
import { DtmfDialpad } from "@/components/dtmf-dialpad";
import { Loader2, Phone, PhoneOff, Save } from "lucide-react";

export function StoreDetailsActionButtons(props: any) {
  const p = props;

  return (
    <>
      <Button variant="outline" onClick={p.onCancel} data-testid="button-cancel">
        Cancel
      </Button>
      <Button onClick={p.onCall} data-testid="button-call" variant={p.voip.isCallActive ? "destructive" : "outline"}>
        {p.voip.isCallActive ? (
          <>
            <PhoneOff className="h-4 w-4 mr-2" />
            End
            {p.voip.status === "connected"
              ? ` (${Math.floor(p.voip.duration / 60)}:${(p.voip.duration % 60).toString().padStart(2, "0")})`
              : p.voip.status === "connecting"
                ? " (connecting...)"
                : p.voip.status === "ringing"
                  ? " (ringing...)"
                  : ""}
          </>
        ) : (
          <>
            <Phone className="h-4 w-4 mr-2" />
            Call
          </>
        )}
      </Button>
      <DtmfDialpad />
      <Button onClick={p.onSave} disabled={p.isSavePending} data-testid="button-save" variant="outline">
        {p.isSavePending ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Saving...
          </>
        ) : (
          <>
            <Save className="h-4 w-4 mr-2" />
            Save
          </>
        )}
      </Button>
      <Button
        onClick={p.onSaveAndExit}
        disabled={p.isSavePending}
        data-testid="button-save-and-exit"
        style={p.currentColors.actionButtons ? { backgroundColor: p.currentColors.actionButtons, borderColor: p.currentColors.actionButtons } : undefined}
      >
        {p.isSavePending ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Saving...
          </>
        ) : (
          <>
            <Save className="h-4 w-4 mr-2" />
            Save & Exit
          </>
        )}
      </Button>
    </>
  );
}
