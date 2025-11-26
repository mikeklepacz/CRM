import OpenAI from 'openai';
import { storage } from '../storage';

/**
 * Normalize smart/curly quotes to standard ASCII quotes
 * Prevents encoding issues like "Ã¢Â€Â™" appearing instead of apostrophes
 */
function normalizeQuotes(text: string): string {
  return text
    .replace(/[\u2018\u2019\u201A\u201B\u2032\u2035]/g, "'")  // Single curly quotes → straight
    .replace(/[\u201C\u201D\u201E\u201F\u2033\u2036]/g, '"'); // Double curly quotes → straight
}

export interface EmailGenerationOptions {
  recipientName: string;
  recipientEmail: string;
  salesSummary: string;
  promptInjection: string;
  keywordBin: string;
}

/**
 * Generate a unique email subject line using OpenAI
 * Target: 3-5 words, <35 characters, title case
 */
export async function generateEmailSubject(
  options: EmailGenerationOptions
): Promise<string> {
  const { recipientName, promptInjection, keywordBin } = options;

  // Get OpenAI API key from storage
  const openaiSettings = await storage.getOpenaiSettings();
  if (!openaiSettings || !openaiSettings.apiKey) {
    throw new Error('OpenAI API key not configured. Please configure in Settings.');
  }

  const openai = new OpenAI({ apiKey: openaiSettings.apiKey });

  // Build the subject generation prompt
  const systemPrompt = `You are an expert email marketing copywriter specializing in cold outreach.
Generate compelling, professional email subject lines that encourage opens without being spammy.

Requirements:
- 3-5 words maximum
- Under 35 characters
- Use title case (capitalize first letter of each major word)
- Be specific and intriguing, not generic
- Avoid spam trigger words (Free, Act Now, Limited Time, etc.)
- Sound natural and conversational

${promptInjection ? `Additional Guidelines:\n${promptInjection}\n` : ''}`;

  const userPrompt = `Generate a unique email subject line for an outreach email to ${recipientName}.

${keywordBin ? `Context Keywords: ${keywordBin}\n` : ''}
Return ONLY the subject line, no quotes, no explanation.`;

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    temperature: 0.8, // Higher temperature for variety
    max_tokens: 20,
  });

  const subject = completion.choices[0]?.message?.content?.trim() || 'Quick Question';
  
  // Remove quotes if AI added them, then normalize smart quotes to ASCII
  const cleanSubject = subject.replace(/^["']|["']$/g, '');
  return normalizeQuotes(cleanSubject);
}

/**
 * Generate a unique email body using OpenAI
 * Target: <70 words, personalized, conversational
 */
export async function generateEmailBody(
  options: EmailGenerationOptions
): Promise<string> {
  const { recipientName, recipientEmail, salesSummary, promptInjection, keywordBin } = options;

  // Get OpenAI API key from storage
  const openaiSettings = await storage.getOpenaiSettings();
  if (!openaiSettings || !openaiSettings.apiKey) {
    throw new Error('OpenAI API key not configured. Please configure in Settings.');
  }

  const openai = new OpenAI({ apiKey: openaiSettings.apiKey });

  // Build the body generation prompt
  const systemPrompt = `You are an expert email marketing copywriter specializing in personalized cold outreach.
Generate natural, conversational email bodies that feel genuinely personal and valuable.

Requirements:
- Maximum 70 words
- Personalize using the recipient's name and any available context
- Sound like a real person reaching out, not a marketing template
- Include a clear but soft call-to-action
- Avoid pushy sales language or hype
- Be concise and respectful of their time
- Do not include a subject line, signature, or closing (just the body)

${promptInjection ? `Tone & Structure Guidelines:\n${promptInjection}\n` : ''}`;

  const userPrompt = `Generate a personalized email body for ${recipientName} (${recipientEmail}).

${salesSummary ? `Context about recipient's business:\n${salesSummary}\n` : ''}
${keywordBin ? `Additional context/keywords: ${keywordBin}\n` : ''}

Return ONLY the email body text, no subject, no signature, no quotes.`;

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    temperature: 0.9, // High temperature for uniqueness
    max_tokens: 150,
  });

  const body = completion.choices[0]?.message?.content?.trim() || 
    `Hi ${recipientName},\n\nI wanted to reach out with a quick question. Would you be open to a brief conversation?\n\nLooking forward to hearing from you.`;
  
  // Normalize smart quotes to ASCII to prevent encoding issues
  return normalizeQuotes(body);
}
