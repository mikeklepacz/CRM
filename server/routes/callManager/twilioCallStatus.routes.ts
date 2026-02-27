import type { Express } from "express";
import { handleTwilioCallStatus } from "../../twilio-webhook";
import { validateTwilioSignature } from "../../twilio-signature-validation";
import type { TwilioVoipDeps } from "./twilioVoip.types";

export function registerTwilioCallStatusRoute(app: Express, _deps: TwilioVoipDeps): void {
  app.post("/api/twilio/call-status", async (req, res) => {
    try {
      const signature = req.headers["x-twilio-signature"] as string | undefined;
      const replitDomain = process.env.REPLIT_DOMAINS?.split(",")[0] || "localhost:5000";
      const protocol = replitDomain.includes("localhost") ? "http" : "https";
      const url = `${protocol}://${replitDomain}/api/twilio/call-status`;

      const isValid = validateTwilioSignature(signature, url, req.body);
      if (!isValid) {
        console.error("[Twilio] Invalid webhook signature - rejecting request");
        return res.status(401).send("Unauthorized");
      }

      await handleTwilioCallStatus(req.body);
      res.status(200).send("OK");
    } catch (error: any) {
      console.error("[Twilio] Error processing call status webhook:", error);
      res.status(500).send("Error");
    }
  });
}
