import twilio from 'twilio';

const authToken = process.env.TWILIO_AUTH_TOKEN;

/**
 * Validates Twilio request signature to prevent spoofed webhooks
 * @param signature - X-Twilio-Signature header value
 * @param url - Full URL of the webhook endpoint
 * @param params - POST body parameters
 * @returns true if signature is valid
 */
export function validateTwilioSignature(
  signature: string | undefined,
  url: string,
  params: Record<string, any>
): boolean {
  if (!authToken) {
    return true; // Allow through if not configured (for development)
  }

  if (!signature) {
    return false;
  }

  try {
    const validator = twilio.validateRequest(
      authToken,
      signature,
      url,
      params
    );
    
    return validator;
  } catch (error) {
    return false;
  }
}
