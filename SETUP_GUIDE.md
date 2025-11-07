# Voice AI System Setup Guide

This guide walks you through setting up the complete Twilio-ElevenLabs voice AI calling system.

---

## Step 1: Configure Twilio Credentials

✅ **DONE** - You've already connected Twilio through the Replit integration!

Your Twilio credentials are now securely stored and automatically available to the application through the Twilio connector.

---

## Step 2: Configure ElevenLabs API Key

1. **Get your ElevenLabs API Key:**
   - Go to https://elevenlabs.io
   - Navigate to your account settings
   - Copy your API key

2. **Add it to your application:**
   - In your app, go to **Settings** (sidebar)
   - Scroll to the **"ElevenLabs API Key"** section
   - Paste your API key
   - Click **Save**

---

## Step 3: Add Voice Agents

Voice agents are the AI personalities that will make calls.

1. **In Settings, find "Voice Agents" section**

2. **Click "Sync Phone Numbers"** first:
   - This pulls your ElevenLabs phone numbers into the system
   - Required before adding agents

3. **Click "Add Agent":**
   - **Agent Name:** Give it a descriptive name (e.g., "Sales Cold Caller")
   - **Agent ID:** Find this in your ElevenLabs dashboard under "Conversational AI"
     - Go to https://elevenlabs.io/app/conversational-ai
     - Click on your agent
     - Copy the agent ID from the URL or settings
   - **Description (optional):** Note what this agent is used for
   - Click **Add Agent**

4. **Set a default agent:**
   - Click the star icon next to an agent to make it the default
   - This agent will be used for quick calls

---

## Step 4: Upload Background Audio (Critical!)

**Why this matters:** Background audio (office ambience) prevents customers from immediately recognizing they're talking to an AI agent. Without it, hang-up rates are very high.

1. **Prepare your audio file:**
   - **Format:** Any common audio format (MP3, WAV, M4A, etc.)
   - **Content:** Office ambience, gentle background noise
   - **Duration:** 30-60 seconds recommended (will loop)
   - **Size:** Under 10MB

2. **Upload the file:**
   - In Settings, find **"Background Audio Mixing"** section
   - Click **"Upload Background Audio"**
   - Select your audio file
   - ✅ **FIXED:** The system will now accept audio files (not JSON)
   - The system automatically converts it to the correct format (PCM 16-bit, 16kHz, mono WAV)

3. **Adjust volume (optional):**
   - Use the slider to set background audio volume
   - Range: -40dB (quieter) to -10dB (louder)
   - Default: -25dB (recommended)

---

## Step 5: Configure Webhooks

Webhooks allow the system to track call status and run analytics.

### ElevenLabs Webhook

1. **In Settings, find "Webhook Configuration" section**

2. **Click "Register Webhook":**
   - This automatically registers your webhook URL with ElevenLabs
   - The URL is: `https://[your-domain]/api/elevenlabs/webhook`
   - ✅ You should see "Webhook is configured and ready"

### Twilio Webhook (Manual Configuration Required)

**Important:** You must configure this in the Twilio Console.

1. **Go to Twilio Console:**
   - Visit https://console.twilio.com/
   - Navigate to **Phone Numbers → Manage → Active Numbers**

2. **For EACH phone number you'll use:**
   - Click on the phone number
   - Scroll to **"Voice & Fax"** section
   - Find **"A CALL COMES IN"** webhook

3. **Set the Status Callback URL:**
   ```
   https://[your-repl-domain].replit.app/api/twilio/call-status
   ```
   
   **Example:**
   ```
   https://my-voice-ai.replit.app/api/twilio/call-status
   ```

4. **Select Status Callback Events:**
   - ✅ Initiated
   - ✅ Ringing
   - ✅ Answered
   - ✅ In-Progress
   - ✅ Completed
   - ✅ Busy
   - ✅ No Answer
   - ✅ Failed
   - ✅ Canceled

5. **Save Configuration**

---

## Step 6: Verify Environment (Testing)

Before making live calls, verify your setup:

### Check 1: API Keys Configured
- ✅ Twilio credentials (automatic via connector)
- ✅ ElevenLabs API key (manual in Settings)

### Check 2: Agents Created
- ✅ At least one voice agent added
- ✅ Phone number synced to agent
- ✅ Default agent set (star icon)

### Check 3: Background Audio
- ✅ Audio file uploaded successfully
- ✅ Volume configured (default -25dB is fine)

### Check 4: Webhooks
- ✅ ElevenLabs webhook registered (green checkmark in Settings)
- ✅ Twilio webhook URL configured in Twilio Console

### Check 5: Environment Variables
Your app needs to know its public URL. Check that `REPLIT_DOMAINS` is set:

```bash
# This should be automatic in Replit, but verify:
echo $REPLIT_DOMAINS
```

Should output something like: `your-app-name.replit.app`

---

## Step 7: Test Your Setup

### Option A: Single Test Call

1. **Navigate to Calls section** in your app
2. **Find a test contact** or add one
3. **Click the phone icon** to initiate a call
4. **Select your voice agent** from the dropdown
5. **Click "Call"**

### Option B: Batch Calling

1. **Navigate to Campaigns** (or batch calling section)
2. **Create a campaign:**
   - Select contacts
   - Choose voice agent
   - Set schedule (or "now")
   - Add any custom instructions
3. **Start campaign**

### What to Watch For During Testing

✅ **Call initiates successfully**
- Check call history for "initiated" status

✅ **Call connects and you hear the agent**
- Plus continuous background audio

✅ **Call completes and status updates**
- Status should change: initiated → in-progress → completed

✅ **Transcript appears after call**
- Check call history for transcript
- AI analytics should auto-trigger (if configured)

---

## Troubleshooting

### Background Audio Upload Failed
- ✅ **FIXED:** Make sure you're uploading an audio file (not JSON)
- Supported formats: MP3, WAV, M4A, OGG, FLAC
- Max file size: 10MB
- Max duration: 300 seconds (5 minutes)

### Call Status Not Updating
1. **Verify Twilio webhook URL:**
   - Must match your `REPLIT_DOMAINS` exactly
   - Use `https://` in production (not `http://`)
   - No trailing slash

2. **Check Twilio Console for webhook errors:**
   - Go to Monitor → Logs → Errors
   - Look for 401/403 errors (signature validation failure)

3. **Verify all status events are selected** in Twilio Console

### No Background Audio During Calls
1. **Check that audio file uploaded successfully**
   - Should show filename in Settings
   - Should show upload timestamp

2. **Volume not too low:**
   - Default -25dB should be audible
   - Try -20dB for testing

3. **Check voice proxy logs:**
   - Should see "[VoiceProxy] Background audio enabled"

### Conversation ID Missing in Analytics
- This should be automatic now
- All calls persist conversation IDs via callSid lookup
- Check call history - conversation ID should appear

### Webhook Signature Validation Failures
1. **Production:** Ensure `TWILIO_AUTH_TOKEN` is set via connector (automatic)
2. **Development:** System allows unsigned webhooks (for local testing)
3. **URL must match exactly:** Protocol (https), domain, path

---

## Production Checklist

Before going live with customer calls:

- [ ] ElevenLabs API key configured
- [ ] At least one voice agent created with phone number
- [ ] Background audio uploaded and tested
- [ ] ElevenLabs webhook registered
- [ ] Twilio webhook configured in Console (all events)
- [ ] `REPLIT_DOMAINS` environment variable set correctly
- [ ] Test call completed successfully
- [ ] Background audio audible during test call
- [ ] Call status updates working (initiated → in-progress → completed)
- [ ] Transcript appears after call
- [ ] AI analytics triggered (if configured)

---

## What's Next?

Once your setup is complete:

1. **Create calling campaigns** with your uploaded contact lists
2. **Monitor call analytics** to track success rates
3. **Refine agent prompts** based on conversation outcomes
4. **Schedule batch calls** for optimal contact times
5. **Review transcripts** for quality assurance

---

## Support

For issues specific to:
- **Twilio:** https://www.twilio.com/docs
- **ElevenLabs:** https://elevenlabs.io/docs
- **This Application:** Check logs in the application or contact your developer

---

**Current System Status:**
- ✅ Twilio integration connected
- ✅ Background audio upload fixed
- ⏳ Waiting for ElevenLabs API key
- ⏳ Waiting for voice agent configuration
- ⏳ Waiting for background audio upload
- ⏳ Waiting for webhook registration

