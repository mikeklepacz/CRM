import crypto from 'crypto';

/**
 * Validate ElevenLabs webhook signature using HMAC authentication
 * Supports both old format (timestamp.signature) and new format (timestamp,signature)
 * @param signature - The ElevenLabs-Signature header value
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
    // Try new format first (timestamp,signature) then old format (timestamp.signature)
    let timestamp: string | undefined;
    let sig: string | undefined;

    if (signature.includes(',')) {
      // New format: "timestamp,signature"
      [timestamp, sig] = signature.split(',');
    } else if (signature.includes('.')) {
      // Old format: "timestamp.signature"
      [timestamp, sig] = signature.split('.');
    }

    if (!timestamp || !sig) {
      console.error('[Webhook Validation] Invalid signature format:', signature?.substring(0, 50));
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
    try {
      return crypto.timingSafeEqual(
        Buffer.from(sig, 'hex'),
        Buffer.from(expectedSignature, 'hex')
      );
    } catch (e) {
      // If buffers are different lengths, timingSafeEqual throws
      console.error('[Webhook Validation] Signature length mismatch');
      return false;
    }
  } catch (error) {
    console.error('[Webhook Validation] Error validating webhook signature:', error);
    return false;
  }
}
