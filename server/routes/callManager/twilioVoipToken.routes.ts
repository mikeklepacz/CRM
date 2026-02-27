import type { Express } from "express";
import twilio from "twilio";
import type { TwilioVoipDeps } from "./twilioVoip.types";

export function registerTwilioVoipTokenRoute(app: Express, deps: TwilioVoipDeps): void {
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
}
