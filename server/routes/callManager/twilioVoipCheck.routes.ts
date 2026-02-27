import type { Express } from "express";
import type { TwilioVoipDeps } from "./twilioVoip.types";

export function registerTwilioVoipCheckRoute(app: Express, _deps: TwilioVoipDeps): void {
  app.get("/api/twilio/voip-check", async (_req: any, res) => {
    res.json({
      hasAccountSid: !!process.env.TWILIO_ACCOUNT_SID,
      hasApiKey: !!process.env.TWILIO_API_KEY,
      hasApiSecret: !!process.env.TWILIO_API_SECRET,
      hasTwimlAppSid: !!process.env.TWILIO_TWIML_APP_SID,
      allConfigured: !!(
        process.env.TWILIO_ACCOUNT_SID &&
        process.env.TWILIO_API_KEY &&
        process.env.TWILIO_API_SECRET &&
        process.env.TWILIO_TWIML_APP_SID
      ),
    });
  });
}
