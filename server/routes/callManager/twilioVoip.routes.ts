import type { Express } from "express";
import twilio from "twilio";
import { handleTwilioCallStatus } from "../../twilio-webhook";
import { validateTwilioSignature } from "../../twilio-signature-validation";

export function registerCallManagerTwilioVoipRoutes(
  app: Express,
  deps: { isAuthenticatedCustom: any }
): void {
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

  app.get("/api/twilio/voip-token", deps.isAuthenticatedCustom, async (req: any, res) => {
    try {
      const userId = req.user.isPasswordAuth ? req.user.id : req.user.claims?.sub;
      console.log("[VoIP Token] Token requested by user:", userId);
      console.log(
        "[VoIP Token] ENV check - ACCOUNT_SID:",
        !!process.env.TWILIO_ACCOUNT_SID,
        "API_KEY:",
        !!process.env.TWILIO_API_KEY,
        "API_SECRET:",
        !!process.env.TWILIO_API_SECRET,
        "TWIML_APP_SID:",
        !!process.env.TWILIO_TWIML_APP_SID
      );

      const { AccessToken } = twilio.jwt;
      const { VoiceGrant } = AccessToken;

      const accessToken = new AccessToken(
        process.env.TWILIO_ACCOUNT_SID!,
        process.env.TWILIO_API_KEY!,
        process.env.TWILIO_API_SECRET!,
        { identity: userId, ttl: 3600 }
      );
      const voiceGrant = new VoiceGrant({
        outgoingApplicationSid: process.env.TWILIO_TWIML_APP_SID,
        incomingAllow: false,
      });
      accessToken.addGrant(voiceGrant);

      console.log("[VoIP Token] Token generated successfully for identity:", userId);
      res.json({ token: accessToken.toJwt(), identity: userId });
    } catch (error: any) {
      console.error("[VoIP Token] Error generating token:", error.message, error.stack);
      res.status(500).json({ error: error.message || "Failed to generate VoIP token" });
    }
  });

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

  app.post("/api/twilio/voip-status", async (req: any, res) => {
    console.log("[VoIP Status]", req.body.CallSid, req.body.CallStatus);
    res.sendStatus(200);
  });
}
