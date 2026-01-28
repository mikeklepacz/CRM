import { storage } from '../storage';
import OpenAI from 'openai';
import * as chrono from 'chrono-node';
import type { CallSession, CallTranscript, QualificationLead, QualificationCampaign } from '@shared/schema';

interface FieldDefinition {
  key: string;
  label: string;
  type: 'text' | 'number' | 'choice' | 'multichoice' | 'date' | 'boolean';
  options?: string[];
  required?: boolean;
  weight?: number;
  validation?: string;
  order?: number;
  isKnockout?: boolean;
  knockoutAnswer?: any;
}

interface AIAnalysisResponse {
  poc: {
    name: string | null;
    email: string | null;
    phone: string | null;
    title: string | null;
  };
  answers: {
    [questionKey: string]: {
      value: any;
      confidence: 'high' | 'medium' | 'low';
    };
  };
  qualification: {
    result: 'qualified' | 'not_qualified' | 'needs_review';
    reason: string;
  };
  followUp: {
    needed: boolean;
    date: string | null;
    time: string | null;
    action: string | null;
  };
  interestLevel: 'hot' | 'warm' | 'cold' | 'not_interested' | null;
  notes: string | null;
}

interface ScoreBreakdown {
  [questionKey: string]: {
    weight: number;
    earned: number;
    answer: any;
  };
}

interface AnalyzeTranscriptResult {
  success: boolean;
  score: number;
  qualificationResult: 'qualified' | 'not_qualified' | 'needs_review';
  aiResponse: AIAnalysisResponse;
  scoreBreakdown: ScoreBreakdown;
  error?: string;
}

function buildTranscriptText(transcripts: CallTranscript[]): string {
  return transcripts
    .sort((a, b) => (a.timeInCallSecs || 0) - (b.timeInCallSecs || 0))
    .map(t => `${t.role === 'agent' ? 'Agent' : 'Prospect'}: ${t.message}`)
    .join('\n');
}

function buildQuestionsContext(fieldDefinitions: FieldDefinition[]): string {
  return fieldDefinitions
    .sort((a, b) => (a.order || 0) - (b.order || 0))
    .map((field, index) => {
      let questionDesc = `${index + 1}. Key: "${field.key}" - Question: "${field.label}"`;
      questionDesc += `\n   Type: ${field.type}`;
      if (field.options && field.options.length > 0) {
        questionDesc += `\n   Options: ${field.options.join(', ')}`;
      }
      if (field.weight !== undefined && field.weight > 0) {
        questionDesc += `\n   Weight: ${field.weight} points`;
      }
      if (field.isKnockout) {
        questionDesc += `\n   KNOCKOUT QUESTION: If answer is "${field.knockoutAnswer}", lead is disqualified`;
      }
      return questionDesc;
    })
    .join('\n\n');
}

function buildSystemPrompt(fieldDefinitions: FieldDefinition[]): string {
  const questionsContext = buildQuestionsContext(fieldDefinitions);
  
  return `You are analyzing a sales call transcript to extract qualification data. Your task is to:
1. Identify the Point of Contact (POC) information mentioned in the call
2. Extract answers to specific qualification questions based on the conversation
3. Determine the overall qualification status
4. Identify any follow-up needs and interest level

QUALIFICATION QUESTIONS TO ANSWER:
${questionsContext}

RESPONSE FORMAT:
You MUST respond with a valid JSON object in exactly this format:
{
  "poc": {
    "name": <string or null - the contact person's name>,
    "email": <string or null - the contact person's email if mentioned>,
    "phone": <string or null - phone number if different from called number>,
    "title": <string or null - job title/role, e.g. "Owner", "Fleet Manager">
  },
  "answers": {
    "<questionKey>": {
      "value": <the extracted answer - type depends on question type>,
      "confidence": <"high" | "medium" | "low">
    }
    // Include an entry for each question key from the questions list
  },
  "qualification": {
    "result": <"qualified" | "not_qualified" | "needs_review">,
    "reason": <brief explanation of the qualification decision>
  },
  "followUp": {
    "needed": <boolean - whether follow-up was discussed>,
    "date": <ISO date string or null - if specific date mentioned>,
    "time": <string or null - if specific time mentioned, e.g. "2pm">,
    "action": <string or null - what action to take in follow-up>
  },
  "interestLevel": <"hot" | "warm" | "cold" | "not_interested" | null>,
  "notes": <string or null - any important observations or additional context>
}

RULES:
- For boolean questions, return true/false
- For number questions, return a numeric value
- For choice/multichoice, return the selected option(s)
- If information is not mentioned or unclear, use null or mark confidence as "low"
- Pay attention to knockout questions - they determine qualification
- Extract the most accurate information possible from the conversation`;
}

const NEGATIVE_PHRASES = new Set([
  'no', 'nope', 'not', 'none', 'never', 'negative', 'declined', 'refused',
  'false', 'n/a', 'na', 'not yet', 'not interested', 'they declined',
  'don\'t know', 'dont know', 'unknown', 'unsure', 'maybe not', 'probably not',
  'not really', 'no thanks', 'no thank you', 'later', 'no way', 'unlikely',
  'we don\'t', 'we dont', 'i don\'t', 'i dont', 'can\'t', 'cant', 'won\'t', 'wont',
  'nie', 'nie wiem', 'nie mam', 'nie jestem', 'nie mamy', 'nie używamy',
  'chyba nie', 'raczej nie', 'niestety nie', 'nie dotyczy'
]);

const POSITIVE_PHRASES = new Set([
  'yes', 'yeah', 'yep', 'correct', 'confirmed', 'absolutely', 'definitely',
  'certainly', 'of course', 'sure', 'agreed', 'affirmative', 'right',
  'tak', 'oczywiście', 'pewnie', 'jasne', 'zgadza się', 'potwierdzam'
]);

function stripPunctuation(s: string): string {
  return s.replace(/[.,!?;:'"()]/g, '').trim();
}

function classifyResponse(value: string): 'positive' | 'negative' | 'neutral' {
  const normalized = stripPunctuation(value.toLowerCase().trim());
  
  if (POSITIVE_PHRASES.has(normalized)) return 'positive';
  if (NEGATIVE_PHRASES.has(normalized)) return 'negative';
  
  const firstWord = normalized.split(/\s+/)[0];
  if (firstWord && POSITIVE_PHRASES.has(firstWord)) return 'positive';
  if (firstWord && NEGATIVE_PHRASES.has(firstWord)) return 'negative';
  
  for (const phrase of NEGATIVE_PHRASES) {
    if (normalized.startsWith(phrase + ' ') || normalized === phrase) {
      return 'negative';
    }
  }
  for (const phrase of POSITIVE_PHRASES) {
    if (normalized.startsWith(phrase + ' ') || normalized === phrase) {
      return 'positive';
    }
  }
  
  return 'neutral';
}

function normalizeToSet(value: any): Set<string> {
  const result = new Set<string>();
  
  if (Array.isArray(value)) {
    for (const item of value) {
      const parts = String(item).toLowerCase().split(/[,;]+/).map(s => s.trim()).filter(s => s.length > 0);
      for (const part of parts) {
        result.add(part);
      }
    }
  } else if (typeof value === 'string') {
    const parts = value.toLowerCase().split(/[,;]+/).map(s => s.trim()).filter(s => s.length > 0);
    for (const part of parts) {
      result.add(part);
    }
  }
  
  return result;
}

function checkKnockout(value: any, knockoutAnswer: any): boolean {
  if (knockoutAnswer === undefined || knockoutAnswer === null) return false;
  
  if (typeof value === 'boolean') {
    return value === knockoutAnswer;
  }
  
  const valueSet = normalizeToSet(value);
  if (valueSet.size === 0) return false;
  
  const knockoutStr = String(knockoutAnswer).toLowerCase().trim();
  const knockoutSet = new Set(
    knockoutStr.split(',').map(s => s.trim().toLowerCase()).filter(s => s.length > 0)
  );
  
  for (const v of valueSet) {
    if (knockoutSet.has(v)) {
      return true;
    }
  }
  
  return false;
}

function calculateScore(
  answers: AIAnalysisResponse['answers'],
  fieldDefinitions: FieldDefinition[]
): { score: number; breakdown: ScoreBreakdown; hasKnockout: boolean } {
  const breakdown: ScoreBreakdown = {};
  let totalScore = 0;
  let hasKnockout = false;

  for (const field of fieldDefinitions) {
    const answer = answers[field.key];
    const weight = field.weight || 0;
    let earned = 0;

    if (answer && answer.value !== null && answer.value !== undefined) {
      const value = answer.value;

      if (field.isKnockout) {
        if (checkKnockout(value, field.knockoutAnswer)) {
          hasKnockout = true;
        }
      }

      let isPositive = false;
      
      if (typeof value === 'boolean') {
        isPositive = value === true;
      } else if (typeof value === 'number') {
        isPositive = value > 0;
      } else if (typeof value === 'string') {
        const classification = classifyResponse(value);
        isPositive = classification === 'positive';
      } else if (Array.isArray(value)) {
        isPositive = value.length > 0 && value.some(v => 
          typeof v === 'string' ? classifyResponse(v) !== 'negative' : !!v
        );
      }

      if (isPositive && weight > 0) {
        earned = weight;
      }
    }

    breakdown[field.key] = {
      weight,
      earned,
      answer: answer?.value ?? null
    };
    
    totalScore += earned;
  }

  return { score: totalScore, breakdown, hasKnockout };
}

export async function analyzeTranscript(
  callSessionId: string,
  tenantId: string
): Promise<AnalyzeTranscriptResult> {
  try {
    const context = await storage.getCallSessionWithContext(callSessionId, tenantId);
    
    if (!context) {
      throw new Error(`Call session ${callSessionId} not found or access denied`);
    }

    let { session, transcripts, lead, campaign } = context;

    // If no lead is linked, try to find an active campaign for this tenant
    // This allows analysis of calls that weren't started from the qualification module
    if (!lead && !campaign) {
      const activeCampaign = await storage.getActiveQualificationCampaign(tenantId);
      if (activeCampaign) {
        campaign = activeCampaign;
        console.log(`[AI Analysis] No lead linked, using active campaign: ${campaign.name}`);
      }
    }

    if (transcripts.length === 0) {
      throw new Error(`No transcripts found for call session ${callSessionId}`);
    }

    const openaiSettings = await storage.getOpenaiSettings(tenantId);
    if (!openaiSettings?.apiKey) {
      throw new Error('OpenAI API key not configured for this tenant');
    }

    const openai = new OpenAI({ apiKey: openaiSettings.apiKey });

    // Get field definitions from campaign (if available) or use empty array for basic POC extraction
    const fieldDefinitions: FieldDefinition[] = campaign?.fieldDefinitions || [];
    
    const transcriptText = buildTranscriptText(transcripts);
    const systemPrompt = buildSystemPrompt(fieldDefinitions);

    const userPrompt = `Please analyze the following sales call transcript and extract the qualification data.

TRANSCRIPT:
${transcriptText}

Remember to respond with ONLY a valid JSON object in the specified format.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3
    });

    const responseContent = completion.choices[0]?.message?.content;
    if (!responseContent) {
      throw new Error('Empty response from OpenAI');
    }

    let aiResponse: AIAnalysisResponse;
    try {
      aiResponse = JSON.parse(responseContent);
    } catch (parseError) {
      throw new Error(`Failed to parse OpenAI response as JSON: ${responseContent.substring(0, 200)}`);
    }

    const { score, breakdown, hasKnockout } = calculateScore(aiResponse.answers, fieldDefinitions);

    let qualificationResult: 'qualified' | 'not_qualified' | 'needs_review' = aiResponse.qualification.result;
    if (hasKnockout) {
      qualificationResult = 'not_qualified';
    }

    // Parse follow-up date and time into a proper timestamp using chrono-node for natural language
    // This MUST happen before building sessionUpdates and leadUpdates so both use the parsed value
    let followUpTimestamp: Date | null = null;
    if (aiResponse.followUp.date || aiResponse.followUp.time) {
      try {
        // Combine date and time info for parsing
        const dateStr = aiResponse.followUp.date || '';
        const timeStr = aiResponse.followUp.time || '';
        const combinedStr = `${dateStr} ${timeStr}`.trim();
        
        if (combinedStr) {
          // Use chrono-node for natural language date parsing (handles "Thursday", "next week", "10am", etc.)
          const parsedResults = chrono.parse(combinedStr, new Date(), { forwardDate: true });
          
          if (parsedResults.length > 0 && parsedResults[0].date()) {
            followUpTimestamp = parsedResults[0].date();
            
            // If no time was specified in the parsed result, default to 10am business hours
            const knownTime = parsedResults[0].start.isCertain('hour');
            if (!knownTime) {
              followUpTimestamp.setHours(10, 0, 0, 0);
            }
          } else {
            // Fallback: try standard Date parsing for ISO-8601 formats
            const isoAttempt = new Date(`${dateStr}T${timeStr || '10:00'}`);
            if (!isNaN(isoAttempt.getTime())) {
              followUpTimestamp = isoAttempt;
            }
          }
        }
        
        console.log(`[AI Analysis] Parsed follow-up: "${combinedStr}" -> ${followUpTimestamp?.toISOString() || 'null'}`);
      } catch (parseError) {
        console.error('[AI Analysis] Failed to parse follow-up date:', parseError);
        followUpTimestamp = null;
      }
    }

    // Only set followUpNeeded=true when we have a valid timestamp
    // If chrono-node couldn't parse a date (e.g., LLM returned "TBD"), leave followUpNeeded=false
    const hasValidFollowUp = aiResponse.followUp.needed && followUpTimestamp !== null;
    
    if (aiResponse.followUp.needed && !followUpTimestamp) {
      console.log(`[AI Analysis] Follow-up requested but no valid timestamp parsed. Setting followUpNeeded=false.`);
    }

    // Now use the chrono-derived timestamp for both session and lead updates
    const sessionUpdates: Partial<any> = {
      interestLevel: aiResponse.interestLevel,
      followUpNeeded: hasValidFollowUp,
      followUpDate: followUpTimestamp, // Use chrono-parsed timestamp (null if unparseable)
      nextAction: aiResponse.followUp.action,
      aiAnalysis: {
        ...(session.aiAnalysis || {}),
        summary: aiResponse.notes,
        extractedPoc: aiResponse.poc,
        analysisCompletedAt: new Date().toISOString()
      }
    };

    // Build call summary note
    const callDate = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const callSummaryNote = aiResponse.notes 
      ? `[${callDate}] AI Call Summary: ${aiResponse.notes}` 
      : null;
    
    const leadUpdates: Partial<any> = {
      answers: aiResponse.answers,
      score,
      scoreBreakdown: breakdown,
      qualificationResult,
      pocName: aiResponse.poc.name,
      pocEmail: aiResponse.poc.email,
      pocPhone: aiResponse.poc.phone,
      pocRole: aiResponse.poc.title,
      followUpNeeded: hasValidFollowUp,
      followUpDate: followUpTimestamp,
      callbackNote: hasValidFollowUp ? aiResponse.followUp.action : null,
      callSessionId: callSessionId, // Link call to lead for history
      lastCallAt: new Date(),
      rawAiOutput: {
        parsedAt: new Date().toISOString(),
        model: 'gpt-4o',
        confidence: aiResponse.qualification.result === 'needs_review' ? 0.5 : 0.8,
        rawResponse: aiResponse
      },
      status: qualificationResult === 'qualified' ? 'qualified' : 
              qualificationResult === 'not_qualified' ? 'disqualified' : 'contacted',
      ...(callSummaryNote && lead?.notes 
        ? { notes: `${lead.notes}\n\n${callSummaryNote}` }
        : callSummaryNote ? { notes: callSummaryNote } : {})
    };

    // Store extracted data in the session's aiAnalysis field including answers and POC
    const enrichedSessionUpdates = {
      ...sessionUpdates,
      aiAnalysis: {
        ...(session.aiAnalysis || {}),
        ...sessionUpdates.aiAnalysis,
        extractedAnswers: aiResponse.answers,
        campaignName: campaign?.name || null,
        campaignId: campaign?.id || null,
        score,
        scoreBreakdown: breakdown,
        qualificationResult,
      }
    };

    await storage.updateAnalysisResults(callSessionId, lead?.id || null, tenantId, enrichedSessionUpdates, leadUpdates);

    return {
      success: true,
      score,
      qualificationResult,
      aiResponse,
      scoreBreakdown: breakdown
    };

  } catch (error: any) {
    console.error('[AI Transcript Analysis] Error:', error);
    return {
      success: false,
      score: 0,
      qualificationResult: 'needs_review',
      aiResponse: {
        poc: { name: null, email: null, phone: null, title: null },
        answers: {},
        qualification: { result: 'needs_review', reason: error.message },
        followUp: { needed: false, date: null, time: null, action: null },
        interestLevel: null,
        notes: null
      },
      scoreBreakdown: {},
      error: error.message
    };
  }
}
