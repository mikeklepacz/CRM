import type { Express } from "express";
import type { TwilioVoipDeps } from "./twilioVoip.types";
import { getTwilioVoipConfig } from "./twilioVoipConfig";
import twilio from "twilio";

export function registerTwilioVoipCheckRoute(app: Express, _deps: TwilioVoipDeps): void {
  app.get("/api/twilio/voip-check", async (_req: any, res) => {
    const { config, missing, invalidFormat, warnings } = getTwilioVoipConfig();
    const canProbe = missing.length === 0 && invalidFormat.length === 0;

    let credentialProbe: {
      accountAuthOk: boolean;
      twimlAppOk: boolean;
      accountError?: string;
      twimlAppError?: string;
    } | null = null;

    if (canProbe) {
      const client = twilio(config.apiKeySid, config.apiKeySecret, { accountSid: config.accountSid });

      credentialProbe = {
        accountAuthOk: false,
        twimlAppOk: false,
      };

      try {
        await client.api.v2010.accounts(config.accountSid).fetch();
        credentialProbe.accountAuthOk = true;
      } catch (error: any) {
        credentialProbe.accountError = error?.message || "Account auth probe failed";
      }

      try {
        await client.api.v2010.accounts(config.accountSid).applications(config.twimlAppSid).fetch();
        credentialProbe.twimlAppOk = true;
      } catch (error: any) {
        credentialProbe.twimlAppError = error?.message || "TwiML app probe failed";
      }
    }

    res.json({
      hasAccountSid: !!config.accountSid,
      hasApiKey: !!config.apiKeySid,
      hasApiSecret: !!config.apiKeySecret,
      hasTwimlAppSid: !!config.twimlAppSid,
      missing,
      invalidFormat,
      warnings,
      allConfigured: missing.length === 0 && invalidFormat.length === 0,
      credentialProbe,
    });
  });
}
