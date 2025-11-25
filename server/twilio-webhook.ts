import { storage } from './storage';
import { validateTwilioSignature } from './twilio-signature-validation';

export async function handleTwilioCallStatus(payload: any, signature?: string, url?: string): Promise<void> {
  // Validate Twilio signature if provided (production only)
  if (signature && url && process.env.TWILIO_AUTH_TOKEN) {
    const isValid = validateTwilioSignature(url, payload, signature);
    if (!isValid) {
      console.error('[Twilio Webhook] Invalid signature - rejecting webhook');
      throw new Error('Invalid Twilio signature');
    }
  }
  const callSid = payload.CallSid;
  const callStatus = payload.CallStatus; // 'initiated', 'ringing', 'in-progress', 'completed', 'busy', 'no-answer', 'failed', 'canceled'
  
  console.log(`[Twilio Webhook] Call ${callSid} status: ${callStatus}`);
  
  try {
    // Find the call session by callSid
    const session = await storage.getCallSessionByCallSid(callSid);
    
    if (!session) {
      console.warn(`[Twilio Webhook] No session found for callSid: ${callSid}`);
      return;
    }
    
    // Map Twilio statuses to our internal statuses
    let newStatus = session.status;
    const now = new Date();
    
    switch (callStatus) {
      case 'initiated':
      case 'ringing':
        newStatus = 'initiated';
        break;
      case 'answered':
      case 'in-progress':
        newStatus = 'in-progress';
        break;
      case 'completed':
        newStatus = 'completed';
        await storage.updateCallSession(session.id, {
          status: newStatus,
          endedAt: now,
        });
        console.log(`[Twilio Webhook] Call ${callSid} marked as ${newStatus}`);
        return;
      case 'busy':
      case 'no-answer':
      case 'failed':
      case 'canceled':
        newStatus = 'failed';
        await storage.updateCallSession(session.id, {
          status: newStatus,
          endedAt: now,
        });
        console.log(`[Twilio Webhook] Call ${callSid} marked as ${newStatus} (${callStatus})`);
        return;
    }
    
    // Update status for initiated/in-progress
    if (newStatus !== session.status) {
      await storage.updateCallSession(session.id, {
        status: newStatus,
      });
      console.log(`[Twilio Webhook] Call ${callSid} status updated to ${newStatus}`);
    }
  } catch (error) {
    console.error(`[Twilio Webhook] Error handling status for ${callSid}:`, error);
  }
}
