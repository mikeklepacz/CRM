import type { Express } from "express";
import twilio from "twilio";
import type { TwilioVoipDeps } from "./twilioVoip.types";

export function registerTwilioVoipTwimlRoute(app: Express, _deps: TwilioVoipDeps): void {
  app.post("/api/twilio/voip-twiml", async (req: any, res) => {
    try {
      const rawTo = req.body.To;
      const rawCallerId = req.body.CallerId;

      const to = rawTo ? rawTo.replace(/[\s()\-.]/g, "") : "";
      const callerId = rawCallerId ? rawCallerId.replace(/[\s()\-.]/g, "") : "";

      if (!to) {
        const twiml = new twilio.twiml.VoiceResponse();
        twiml.say("No destination number provided.");
        res.type("text/xml");
        return res.send(twiml.toString());
      }

      const twiml = new twilio.twiml.VoiceResponse();
      const dial = twiml.dial({ callerId: callerId || undefined });
      dial.number(to);

      res.type("text/xml");
      res.send(twiml.toString());
    } catch (error: any) {
      console.error("[VoIP TwiML] Error:", error);
      const twiml = new twilio.twiml.VoiceResponse();
      twiml.say("An error occurred.");
      res.type("text/xml");
      res.send(twiml.toString());
    }
  });
}
