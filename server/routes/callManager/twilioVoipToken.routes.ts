import type { Express } from "express";
import twilio from "twilio";
import type { TwilioVoipDeps } from "./twilioVoip.types";
import { getTwilioVoipConfig } from "./twilioVoipConfig";

export function registerTwilioVoipTokenRoute(app: Express, deps: TwilioVoipDeps): void {
  app.get("/api/twilio/voip-token", deps.isAuthenticatedCustom, async (req: any, res) => {
    try {
      const userId = req.user.isPasswordAuth ? req.user.id : req.user.claims?.sub;
      console.log("[VoIP Token] Token requested by user:", userId);
      const { config, missing, invalidFormat } = getTwilioVoipConfig();
      console.log("[VoIP Token] ENV check - ACCOUNT_SID:", !!config.accountSid, "API_KEY:", !!config.apiKeySid, "API_SECRET:", !!config.apiKeySecret, "TWIML_APP_SID:", !!config.twimlAppSid);

      if (missing.length > 0 || invalidFormat.length > 0) {
        return res.status(500).json({
          error: "Twilio VoIP configuration invalid",
          missing,
          invalidFormat,
        });
      }

      const { AccessToken } = twilio.jwt;
      const { VoiceGrant } = AccessToken;

      const accessToken = new AccessToken(
        config.accountSid,
        config.apiKeySid,
        config.apiKeySecret,
        { identity: userId, ttl: 3600 }
      );
      const voiceGrant = new VoiceGrant({
        outgoingApplicationSid: config.twimlAppSid,
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
