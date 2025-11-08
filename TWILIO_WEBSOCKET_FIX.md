# Twilio WebSocket Media Stream Fix

## Problem
Twilio voice calls are failing with error `31603: Media Streams Invalid Application SID or Script URL`. The WebSocket endpoint is publicly accessible (verified by 400 response on non-WS requests), but Twilio cannot establish Media Streams connection.

## Root Cause
TwiML is being passed inline via the `twiml` parameter in the call creation request. However, **WebSocket Media Streams require TwiML to be served via a publicly accessible URL endpoint**, not passed inline.

From Twilio documentation:
> "When using Media Streams with WebSocket, the TwiML must be fetched from a URL. Inline TwiML is not supported for Media Streams."

## Current Implementation
```typescript
// server/twilio-service.ts - INCORRECT APPROACH
const call = await twilioClient.calls.create({
  twiml: twimlContent,  // ❌ Inline TwiML doesn't work with Media Streams
  to: phoneNumber,
  from: twilioPhoneNumber,
  // ...
});
```

## Solution
Create a dedicated endpoint to serve TwiML dynamically based on call SID:

### 1. Add TwiML Endpoint
```typescript
// server/routes.ts
app.get('/api/twilio/twiml/:callSid', (req, res) => {
  const { callSid } = req.params;
  
  // Retrieve WebSocket URL and agent config for this call
  // (store in memory or database when initiating call)
  const callConfig = getCallConfig(callSid);
  
  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Connect>
    <Stream url="${callConfig.wsUrl}">
      <Parameter name="agentId" value="${callConfig.agentId}" />
      <Parameter name="conversationId" value="${callConfig.conversationId}" />
    </Stream>
  </Connect>
</Response>`;
  
  res.type('text/xml');
  res.send(twiml);
});
```

### 2. Update Call Creation
```typescript
// server/twilio-service.ts - CORRECT APPROACH
const callSid = generateUniqueCallSid();

// Store call configuration for TwiML endpoint to retrieve
storeCallConfig(callSid, {
  wsUrl: webSocketUrl,
  agentId: agentId,
  conversationId: conversationId
});

const call = await twilioClient.calls.create({
  url: `https://${process.env.REPLIT_DEV_DOMAIN}/api/twilio/twiml/${callSid}`,  // ✅ URL-based TwiML
  to: phoneNumber,
  from: twilioPhoneNumber,
  statusCallback: webhookUrl,
  statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
  statusCallbackMethod: 'POST',
});
```

### 3. Call Configuration Storage
Options for storing call configs:
- **In-memory Map**: Simple, works for single-instance deployments
- **Database**: Persistent, works for multi-instance deployments
- **Redis**: Fast, scalable, auto-expiring keys

Example in-memory approach:
```typescript
const callConfigs = new Map<string, CallConfig>();

function storeCallConfig(callSid: string, config: CallConfig) {
  callConfigs.set(callSid, config);
  // Auto-cleanup after 1 hour
  setTimeout(() => callConfigs.delete(callSid), 3600000);
}

function getCallConfig(callSid: string): CallConfig | undefined {
  return callConfigs.get(callSid);
}
```

## Implementation Checklist
- [ ] Create `/api/twilio/twiml/:callSid` GET endpoint
- [ ] Add call configuration storage mechanism
- [ ] Update `initiateCall()` to use URL-based TwiML
- [ ] Test call initiation with WebSocket Media Streams
- [ ] Verify ElevenLabs receives audio stream
- [ ] Handle edge cases (expired configs, invalid callSid)

## References
- Twilio Media Streams: https://www.twilio.com/docs/voice/twiml/stream
- TwiML URL requirement for Media Streams
- Current working WebSocket endpoint: `/api/voice/ws`

## Status
🔴 **Not Yet Implemented** - Documented for future work, currently back-burnered per user request
