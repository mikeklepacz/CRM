import OpenAI from 'openai';
import { storage } from './storage';

export async function analyzeCallTranscript(conversationId: string, tenantId: string): Promise<void> {
  try {
    // Fetch the call session and transcripts first to get tenant context
    const session = await storage.getCallSessionByConversationId(conversationId, tenantId);
    if (!session) {
      console.error(`Call session not found for conversation: ${conversationId}`);
      return;
    }

    // Get OpenAI API key from storage (use session's tenantId for proper isolation)
    const openaiSettings = await storage.getOpenaiSettings(tenantId);
    if (!openaiSettings || !openaiSettings.apiKey) {
      console.error('No OpenAI API key configured - skipping AI reflection');
      return;
    }

    const apiKey = openaiSettings.apiKey;
    const openai = new OpenAI({ apiKey });

    const transcripts = await storage.getCallTranscripts(conversationId);
    if (transcripts.length === 0) {
      return;
    }

    // Build the full transcript text
    const transcriptText = transcripts
      .map(t => `${t.role === 'agent' ? 'AI Agent' : 'Customer'}: ${t.message}`)
      .join('\n');

    // Get Aligner assistant for call analysis
    const alignerAssistant = await storage.getAssistantBySlug('aligner', tenantId);
    if (!alignerAssistant || !alignerAssistant.assistantId) {
      console.error('Aligner assistant not configured - skipping AI reflection');
      return;
    }

    // Build analysis prompt for Aligner
    const analysisPrompt = `Analyze this sales call transcript for context.

TRANSCRIPT:
${transcriptText}

⚠️ CRITICAL OUTPUT FORMAT:
You MUST respond with valid JSON containing exactly these fields:
{
  "summary": "A concise summary of the call (2-3 sentences)",
  "sentiment": "positive, neutral, or negative",
  "customerMood": "interested, skeptical, hostile, friendly, or indifferent",
  "mainObjection": "The primary objection raised (or null if none)",
  "keyMoment": "The critical moment or phrase that influenced the conversation",
  "agentStrengths": "What the AI agent did well in this call",
  "lessonLearned": "One actionable improvement for future calls"
}

Return ONLY the JSON object - no markdown code fences, no explanations.`;


    // Create thread and run with Aligner
    const thread = await openai.beta.threads.create({
      messages: [{ role: 'user', content: analysisPrompt }],
    });

    const run = await openai.beta.threads.runs.create(thread.id, {
      assistant_id: alignerAssistant.assistantId,
      response_format: { type: 'json_object' },
    });

    // Poll for completion (2.5s interval, max 2 minutes)
    let runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
    let pollCount = 0;
    const maxPolls = 48; // 2 minutes max (48 * 2.5s)
    const POLL_INTERVAL = 2500;

    while (runStatus.status === 'queued' || runStatus.status === 'in_progress') {
      pollCount++;
      
      if (pollCount >= maxPolls) {
        throw new Error('[AI Reflection] Timeout: Aligner did not respond within 2 minutes');
      }

      await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL));
      runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
    }

    if (runStatus.status !== 'completed') {
      throw new Error(`[AI Reflection] Aligner run failed with status: ${runStatus.status}`);
    }

    // Get assistant's response
    const messages = await openai.beta.threads.messages.list(thread.id);
    const assistantMessage = messages.data.find(msg => msg.role === 'assistant');
    
    if (!assistantMessage) {
      throw new Error('[AI Reflection] No response from Aligner assistant');
    }

    const responseText = assistantMessage.content
      .filter((c: any) => c.type === 'text')
      .map((c: any) => c.text.value)
      .join('');
    
    // Parse the AI analysis
    let analysis;
    try {
      // Try to extract JSON from markdown code blocks if present
      const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)\s*```/) || 
                       responseText.match(/\{[\s\S]*\}/);
      const jsonText = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : responseText;
      analysis = JSON.parse(jsonText);
    } catch (parseError) {
      console.error('Failed to parse OpenAI response as JSON:', responseText);
      analysis = {
        summary: 'Error parsing AI analysis',
        sentiment: 'unknown',
        customerMood: 'unknown',
        mainObjection: null,
        keyMoment: null,
        agentStrengths: null,
        lessonLearned: null,
      };
    }

    // Update the call session with AI analysis
    await storage.updateCallSessionByConversationId(conversationId, {
      aiAnalysis: analysis,
    });

  } catch (error: any) {
    console.error(`Error analyzing call transcript for ${conversationId}:`, error.message);
  }
}
