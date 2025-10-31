import OpenAI from 'openai';
import { storage } from './storage';

export async function analyzeCallTranscript(conversationId: string): Promise<void> {
  try {
    console.log(`Starting AI reflection for conversation: ${conversationId}`);

    // Get OpenAI API key from storage
    const openaiSettings = await storage.getOpenaiSettings();
    if (!openaiSettings || !openaiSettings.apiKey) {
      console.error('No OpenAI API key configured - skipping AI reflection');
      return;
    }

    const apiKey = openaiSettings.apiKey;
    const openai = new OpenAI({ apiKey });

    // Fetch the call session and transcripts
    const session = await storage.getCallSessionByConversationId(conversationId);
    if (!session) {
      console.error(`Call session not found for conversation: ${conversationId}`);
      return;
    }

    const transcripts = await storage.getCallTranscripts(conversationId);
    if (transcripts.length === 0) {
      console.log(`No transcripts to analyze for conversation: ${conversationId}`);
      return;
    }

    // Build the full transcript text
    const transcriptText = transcripts
      .map(t => `${t.role === 'agent' ? 'AI Agent' : 'Customer'}: ${t.message}`)
      .join('\n');

    // Call OpenAI to analyze the transcript
    const prompt = `Analyze this sales call transcript for context.

TRANSCRIPT:
${transcriptText}

Provide a structured analysis in JSON format with the following fields:
- summary: A concise summary of the call (2-3 sentences)
- sentiment: Overall sentiment (positive, neutral, or negative)
- customerMood: Customer's mood (interested, skeptical, hostile, friendly, indifferent)
- mainObjection: The primary objection raised by the customer (if any, otherwise null)
- keyMoment: The critical moment or phrase that influenced the conversation direction
- agentStrengths: What the AI agent did well in this call
- lessonLearned: One actionable improvement for future calls

Return ONLY valid JSON, no markdown formatting.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are an expert sales call analyst. Analyze transcripts to help improve future sales performance.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3,
    });

    const responseText = completion.choices[0]?.message?.content || '{}';
    
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

    console.log(`✅ AI reflection completed for conversation: ${conversationId}`);
    console.log(`Analysis: ${analysis.summary}`);
  } catch (error: any) {
    console.error(`Error analyzing call transcript for ${conversationId}:`, error.message);
  }
}
