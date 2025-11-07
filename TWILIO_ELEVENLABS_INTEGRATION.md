# Twilio-ElevenLabs Voice Proxy Integration

## Overview

This document describes the complete integration between Twilio and ElevenLabs ConvAI for batch calling with continuous background audio mixing (office ambience). The integration ensures customers cannot distinguish AI agents from real representatives, preventing immediate hang-ups.

## Architecture

### Call Flow
```
User initiates batch call
    ↓
CallDispatcher (server/call_dispatcher.ts)
    ↓
Twilio SDK initiates outbound call (server/twilio-service.ts)
    ↓
TwiML routes to WebSocket Proxy (wss://domain/media-stream)
    ↓
Voice Proxy (server/voice-proxy.ts) 
    ↓
ElevenLabs ConvAI API with background audio
    ↓
Real-time bidirectional audio streaming
```

### Key Components

1. **CallDispatcher** (`server/call_dispatcher.ts`)
   - Schedules and initiates batch calls
   - Combines IVR instructions with base prompts
   - Calls Twilio SDK with all parameters in TwiML

2. **Twilio Service** (`server/twilio-service.ts`)
   - Generates TwiML with Stream verb for WebSocket routing
   - Passes parameters: agentId, phoneNumberId, ivrBehavior, dynamicVariables, clientData, basePrompt
   - Initiates outbound calls via Twilio SDK

3. **Voice Proxy** (`server/voice-proxy.ts`)
   - WebSocket server at `/media-stream`
   - Extracts TwiML parameters from Twilio start message
   - Connects to ElevenLabs ConvAI with background audio enabled
   - Handles bidirectional audio streaming (μ-law ↔ PCM conversion)
   - Persists conversation IDs for webhook correlation

4. **Twilio Webhooks** (`server/twilio-webhook.ts`, `server/routes.ts`)
   - Receives call status updates from Twilio
   - Validates signatures for security
   - Maps Twilio statuses to internal states

## Configuration Requirements

### Environment Variables

**Production (Required):**
```bash
TWILIO_ACCOUNT_SID=<from Twilio connector>
TWILIO_AUTH_TOKEN=<from Twilio connector>
REPLIT_DOMAINS=<your-repl-domain>.replit.app
```

**Development (Optional):**
```bash
TWILIO_ACCOUNT_SID=<test account>
TWILIO_AUTH_TOKEN=<test token>
REPLIT_DOMAINS=localhost:5000
```

### Twilio Webhook Configuration

Configure in Twilio Console for each phone number:

**Call Status Callback URL:**
```
https://<your-domain>/api/twilio/call-status
```

**Status Callback Events:**
- initiated
- ringing
- answered
- in-progress
- completed
- busy
- no-answer
- failed
- canceled

## Feature Preservation

All existing batch calling features are maintained:

✅ **IVR Flagging** - Instructions passed via basePrompt parameter
✅ **Scheduling** - CallDispatcher background worker unchanged
✅ **Webhooks** - ElevenLabs conversation webhooks with auto-analysis
✅ **AI Analytics** - OpenAI reflection on transcripts
✅ **Conversation Tracking** - All calls persist conversationId
✅ **Background Audio** - Continuous office ambience mixing

## Security

### Twilio Signature Validation
- All webhooks validate `X-Twilio-Signature` header
- Uses `twilio.validateRequest()` with TWILIO_AUTH_TOKEN
- Development fallback: allows through if token not configured
- Production: rejects requests with invalid signatures

### ElevenLabs Signature Validation
- Validates `elevenlabs-signature` header
- Uses HMAC-SHA256 with signing secret
- Prevents spoofed conversation webhooks

## Status Mapping

### Twilio → Internal Status
```javascript
'initiated', 'ringing'     → 'initiated'
'answered', 'in-progress'  → 'in-progress'
'completed'                → 'completed'
'busy', 'no-answer', 
'failed', 'canceled'       → 'failed'
```

## Testing Checklist

### Pre-Production Testing
1. ✅ Verify TWILIO_AUTH_TOKEN is set in production
2. ⏳ Perform end-to-end live call test
3. ⏳ Confirm Twilio "answered" status triggers correctly
4. ⏳ Verify conversation IDs propagate to analytics
5. ⏳ Validate background audio mixing is continuous
6. ⏳ Test IVR instructions are followed
7. ⏳ Confirm webhook signatures validate correctly

### Documentation
1. ✅ REPLIT_DOMAINS must match Twilio webhook URL
2. ✅ Signature validation requires exact URL match
3. ⏳ Document any environment-specific configurations

## API Endpoints

### WebSocket
- `wss://<domain>/media-stream` - Voice proxy for Twilio Media Streams

### HTTP Webhooks
- `POST /api/twilio/call-status` - Twilio call status updates
- `POST /api/elevenlabs/webhook` - ElevenLabs conversation events

## Conversation ID Tracking

All calls persist conversation IDs for reliable webhook correlation:

1. **Call Initiation**: CallDispatcher creates session without conversationId
2. **Voice Proxy Connection**: Stores conversationId when ElevenLabs responds
3. **Webhook Processing**: Links transcripts/analysis via conversationId
4. **Auto-Analysis**: Triggers OpenAI reflection after threshold reached

## Background Audio Implementation

Voice proxy enables continuous background audio mixing:

```javascript
audio_enabled: true,
background_audio_enabled: true,
background_audio_url: config.backgroundAudioUrl || 'default_office_ambience.wav'
```

Critical for preventing customer detection of AI agents.

## Troubleshooting

### Call Status Not Updating
- Verify REPLIT_DOMAINS matches Twilio webhook URL exactly
- Check Twilio Console for webhook delivery attempts
- Confirm TWILIO_AUTH_TOKEN is set (signature validation)

### Conversation ID Missing
- Voice proxy stores conversationId on ElevenLabs connection
- Check logs for "[VoiceProxy] Stored conversation ID"
- Verify callSid exists in call_sessions table

### Signature Validation Failures
- Ensure webhook URL in Twilio matches exactly
- Protocol must match (https in production, http in dev)
- Check TWILIO_AUTH_TOKEN is correct

## Implementation Notes

### Why Twilio SDK Instead of Direct ElevenLabs?
1. **Background Audio**: Voice proxy enables continuous mixing
2. **Customer Detection Prevention**: Office ambience critical for success
3. **Flexibility**: Can add call recording, transcription, IVR trees
4. **Reliability**: Twilio handles carrier compatibility

### IVR Instructions Flow
IVR instructions are combined with base prompts in CallDispatcher before sending to Twilio. The voice proxy forwards the complete basePrompt to ElevenLabs via conversation_config_override.

### Status Mapping Rationale
Twilio emits "answered" when call is picked up, before media stream connects. We map both "answered" and "in-progress" to internal "in-progress" state for consistency.

## Architecture Decisions

**Approved by Architect (2025-11-07):**
- ✅ IVR instructions passed via basePrompt (already combined in CallDispatcher)
- ✅ Twilio "answered" status mapped to "in-progress"
- ✅ Signature validation on all webhooks
- ✅ Conversation ID tracking for all call types
- ✅ Complete feature preservation (scheduling, IVR, webhooks, analytics)

