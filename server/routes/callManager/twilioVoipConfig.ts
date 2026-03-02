interface TwilioVoipConfig {
  accountSid: string;
  apiKeySid: string;
  apiKeySecret: string;
  twimlAppSid: string;
}

function normalizeEnv(value?: string): string {
  if (!value) return "";
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1).trim();
  }
  return trimmed;
}

function isAccountSid(value: string): boolean {
  return /^AC[0-9a-fA-F]{32}$/.test(value);
}

function isApiKeySid(value: string): boolean {
  return /^SK[0-9a-fA-F]{32}$/.test(value);
}

function isTwimlAppSid(value: string): boolean {
  return /^AP[0-9a-fA-F]{32}$/.test(value);
}

export function getTwilioVoipConfig() {
  const accountSid = normalizeEnv(process.env.TWILIO_ACCOUNT_SID);
  const apiKeySid = normalizeEnv(process.env.TWILIO_API_KEY);
  const apiKeySecret = normalizeEnv(process.env.TWILIO_API_SECRET);
  const twimlAppSid = normalizeEnv(process.env.TWILIO_TWIML_APP_SID);

  const missing = [];
  if (!accountSid) missing.push("TWILIO_ACCOUNT_SID");
  if (!apiKeySid) missing.push("TWILIO_API_KEY");
  if (!apiKeySecret) missing.push("TWILIO_API_SECRET");
  if (!twimlAppSid) missing.push("TWILIO_TWIML_APP_SID");

  const invalidFormat = [];
  if (accountSid && !isAccountSid(accountSid)) invalidFormat.push("TWILIO_ACCOUNT_SID");
  if (apiKeySid && !isApiKeySid(apiKeySid)) invalidFormat.push("TWILIO_API_KEY");
  if (twimlAppSid && !isTwimlAppSid(twimlAppSid)) invalidFormat.push("TWILIO_TWIML_APP_SID");

  const warnings = [];
  if (/^(AC|SK|AP)[0-9a-fA-F]{32}$/.test(apiKeySecret)) {
    warnings.push("TWILIO_API_SECRET looks like a SID value; this is usually a copied SID instead of the API key secret.");
  }
  if (apiKeySid && apiKeySecret && apiKeySid === apiKeySecret) {
    warnings.push("TWILIO_API_KEY and TWILIO_API_SECRET are identical; they should be different values.");
  }

  return {
    config: { accountSid, apiKeySid, apiKeySecret, twimlAppSid } as TwilioVoipConfig,
    missing,
    invalidFormat,
    warnings,
  };
}
