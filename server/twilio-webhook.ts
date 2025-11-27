import { storage } from './storage';
import { validateTwilioSignature } from './twilio-signature-validation';

export async function handleTwilioCallStatus(payload: any, signature?: string, url?: string): Promise<void> {
  const receiveTime = Date.now();
  
  // ========== COMPREHENSIVE DEBUG LOGGING ==========
  console.log('[Twilio Webhook][DEBUG] ========== INCOMING WEBHOOK ==========');
  console.log('[Twilio Webhook][DEBUG] Timestamp:', new Date().toISOString());
  console.log('[Twilio Webhook][DEBUG] === FULL PAYLOAD ===');
  console.log(JSON.stringify(payload, null, 2));
  console.log('[Twilio Webhook][DEBUG] === KEY FIELDS ===');
  console.log('[Twilio Webhook][DEBUG] CallSid:', payload.CallSid);
  console.log('[Twilio Webhook][DEBUG] CallStatus:', payload.CallStatus);
  console.log('[Twilio Webhook][DEBUG] CallDuration:', payload.CallDuration);
  console.log('[Twilio Webhook][DEBUG] Duration:', payload.Duration);
  console.log('[Twilio Webhook][DEBUG] ErrorCode:', payload.ErrorCode || 'none');
  console.log('[Twilio Webhook][DEBUG] ErrorMessage:', payload.ErrorMessage || 'none');
  console.log('[Twilio Webhook][DEBUG] SipResponseCode:', payload.SipResponseCode || 'none');
  console.log('[Twilio Webhook][DEBUG] To:', payload.To);
  console.log('[Twilio Webhook][DEBUG] From:', payload.From);
  console.log('[Twilio Webhook][DEBUG] Direction:', payload.Direction);
  console.log('[Twilio Webhook][DEBUG] AnsweredBy:', payload.AnsweredBy || 'unknown');
  console.log('[Twilio Webhook][DEBUG] CallerName:', payload.CallerName || 'none');
  console.log('[Twilio Webhook][DEBUG] Timestamp field:', payload.Timestamp);
  console.log('[Twilio Webhook][DEBUG] SequenceNumber:', payload.SequenceNumber);
  console.log('[Twilio Webhook][DEBUG] =====================');
  
  // Validate Twilio signature if provided (production only)
  if (signature && url && process.env.TWILIO_AUTH_TOKEN) {
    const isValid = validateTwilioSignature(url, payload, signature);
    if (!isValid) {
      console.error('[Twilio Webhook][DEBUG] SIGNATURE VALIDATION FAILED');
      console.error('[Twilio Webhook][DEBUG] URL used:', url);
      throw new Error('Invalid Twilio signature');
    }
    console.log('[Twilio Webhook][DEBUG] Signature validated OK');
  }
  
  const callSid = payload.CallSid;
  const callStatus = payload.CallStatus; // 'initiated', 'ringing', 'in-progress', 'completed', 'busy', 'no-answer', 'failed', 'canceled'
  const callDuration = parseInt(payload.CallDuration || '0', 10); // Duration in seconds from Twilio
  
  try {
    // Find the call session by callSid
    console.log(`[Twilio Webhook][DEBUG] Looking up session for CallSid: ${callSid}`);
    const session = await storage.getCallSessionByCallSid(callSid);
    
    if (!session) {
      console.warn(`[Twilio Webhook][DEBUG] *** NO SESSION FOUND ***`);
      console.warn(`[Twilio Webhook][DEBUG] CallSid: ${callSid}`);
      console.warn(`[Twilio Webhook][DEBUG] This may indicate the call was initiated but session wasn't created`);
      return;
    }
    
    console.log(`[Twilio Webhook][DEBUG] Found session:`, {
      id: session.id,
      currentStatus: session.status,
      callSid: session.callSid,
      conversationId: session.conversationId,
    });
    
    // Map Twilio statuses to our internal statuses
    let newStatus = session.status;
    const now = new Date();
    
    console.log(`[Twilio Webhook][DEBUG] Status transition: ${session.status} -> (Twilio: ${callStatus})`);
    
    switch (callStatus) {
      case 'initiated':
      case 'ringing':
        newStatus = 'initiated';
        console.log(`[Twilio Webhook][DEBUG] Call is ${callStatus}, keeping as initiated`);
        break;
      case 'answered':
      case 'in-progress':
        newStatus = 'in-progress';
        console.log(`[Twilio Webhook][DEBUG] Call answered/in-progress!`);
        break;
      case 'completed':
        // If call completed with 0 seconds, it means the call never connected (e.g., blocked, rejected)
        // Mark as "no-answer" instead of "completed"
        if (callDuration === 0) {
          newStatus = 'failed';
          console.log(`[Twilio Webhook][DEBUG] *** CALL COMPLETED WITH 0 SECONDS ***`);
          console.log(`[Twilio Webhook][DEBUG] This usually means: call rejected, blocked, or WebSocket failed`);
          console.log(`[Twilio Webhook][DEBUG] ErrorCode: ${payload.ErrorCode || 'none'}`);
          console.log(`[Twilio Webhook][DEBUG] SipResponseCode: ${payload.SipResponseCode || 'none'}`);
        } else {
          newStatus = 'completed';
          console.log(`[Twilio Webhook][DEBUG] Call completed successfully, duration: ${callDuration}s`);
        }
        await storage.updateCallSession(session.id, {
          status: newStatus,
          endedAt: now,
        });
        console.log(`[Twilio Webhook][DEBUG] Session updated to: ${newStatus}`);
        return;
      case 'busy':
        console.log(`[Twilio Webhook][DEBUG] Call BUSY - line is occupied`);
        newStatus = 'failed';
        await storage.updateCallSession(session.id, {
          status: newStatus,
          endedAt: now,
        });
        return;
      case 'no-answer':
        console.log(`[Twilio Webhook][DEBUG] NO ANSWER - call wasn't picked up`);
        newStatus = 'failed';
        await storage.updateCallSession(session.id, {
          status: newStatus,
          endedAt: now,
        });
        return;
      case 'failed':
        console.log(`[Twilio Webhook][DEBUG] *** CALL FAILED ***`);
        console.log(`[Twilio Webhook][DEBUG] ErrorCode: ${payload.ErrorCode || 'none'}`);
        console.log(`[Twilio Webhook][DEBUG] ErrorMessage: ${payload.ErrorMessage || 'none'}`);
        console.log(`[Twilio Webhook][DEBUG] SipResponseCode: ${payload.SipResponseCode || 'none'}`);
        newStatus = 'failed';
        await storage.updateCallSession(session.id, {
          status: newStatus,
          endedAt: now,
        });
        return;
      case 'canceled':
        console.log(`[Twilio Webhook][DEBUG] Call CANCELED`);
        newStatus = 'failed';
        await storage.updateCallSession(session.id, {
          status: newStatus,
          endedAt: now,
        });
        return;
    }
    
    // Update status for initiated/in-progress
    if (newStatus !== session.status) {
      console.log(`[Twilio Webhook][DEBUG] Updating session status: ${session.status} -> ${newStatus}`);
      await storage.updateCallSession(session.id, {
        status: newStatus,
      });
    }
    
    console.log(`[Twilio Webhook][DEBUG] Webhook processing took ${Date.now() - receiveTime}ms`);
  } catch (error) {
    console.error(`[Twilio Webhook][DEBUG] *** ERROR PROCESSING WEBHOOK ***`);
    console.error(`[Twilio Webhook][DEBUG] CallSid: ${callSid}`);
    console.error(`[Twilio Webhook][DEBUG] Error:`, error);
  }
}
