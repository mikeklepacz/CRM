import { eventGateway } from '../services/events/gateway.js';

export function maskPhone(phone: string | undefined): string {
  if (!phone) return 'N/A';
  return phone.length > 4 ? `***${phone.slice(-4)}` : '****';
}

export function maskSid(sid: string | undefined): string {
  if (!sid) return 'N/A';
  return sid.length > 8 ? `${sid.slice(0, 4)}...${sid.slice(-4)}` : sid;
}

export function emitDebug(stage: string, message: string, details: Record<string, any> = {}, level: 'info' | 'warn' | 'error' = 'info') {
  const sanitizedDetails = { ...details };
  if (sanitizedDetails.toNumber) sanitizedDetails.toNumber = maskPhone(sanitizedDetails.toNumber);
  if (sanitizedDetails.phoneNumber) sanitizedDetails.phoneNumber = maskPhone(sanitizedDetails.phoneNumber);
  if (sanitizedDetails.callSid) sanitizedDetails.callSid = maskSid(sanitizedDetails.callSid);
  if (sanitizedDetails.streamSid) sanitizedDetails.streamSid = maskSid(sanitizedDetails.streamSid);

  console.log(`[VoiceProxy Debug] ${stage}: ${message}`, sanitizedDetails);
  eventGateway.emit('call:debug', {
    stage,
    message,
    details: sanitizedDetails,
    level,
    timestamp: new Date().toISOString(),
  });
}
