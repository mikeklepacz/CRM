import type { Express } from "express";
import type { TwilioVoipDeps } from "./twilioVoip.types";

export function registerTwilioVoipStatusRoute(app: Express, _deps: TwilioVoipDeps): void {
  app.post("/api/twilio/voip-status", async (req: any, res) => {
    console.log("[VoIP Status]", req.body.CallSid, req.body.CallStatus);
    res.sendStatus(200);
  });
}
