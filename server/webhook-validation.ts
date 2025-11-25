import crypto from 'crypto';

/**
 * Validate ElevenLabs webhook signature using HMAC authentication
 * @param signature - The ElevenLabs-Signature header value (format: "timestamp.signature")
 * @param requestBody - The raw request body as a string
 * @param webhookSecret - The shared secret configured in ElevenLabs dashboard
 * @returns true if signature is valid, false otherwise
 */
export function validateElevenLabsSignature(
  signature: string | undefined,
  requestBody: string,
  webhookSecret: string
): boolean {
  if (!signature || !webhookSecret) {
    return false;
  }

  try {
    // Parse signature format: "timestamp.signature"
    const [timestamp, sig] = signature.split('.');
    if (!timestamp || !sig) {
      return false;
    }

    // Reconstruct the signed payload: timestamp.request_body
    const signedPayload = `${timestamp}.${requestBody}`;

    // Compute HMAC-SHA256
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(signedPayload)
      .digest('hex');

    // Constant-time comparison to prevent timing attacks
    return crypto.timingSafeEqual(
      Buffer.from(sig, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );
  } catch (error) {
    return false;
  }
}
