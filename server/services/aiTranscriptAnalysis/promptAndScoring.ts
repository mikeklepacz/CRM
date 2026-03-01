import type { AIAnalysisResponse, FieldDefinition, ScoreBreakdown } from './types';

export function buildQuestionsContext(fieldDefinitions: FieldDefinition[]): string {
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

export function buildSystemPrompt(fieldDefinitions: FieldDefinition[]): string {
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
    if (normalized.startsWith(phrase + ' ') || normalized === phrase) return 'negative';
  }
  for (const phrase of POSITIVE_PHRASES) {
    if (normalized.startsWith(phrase + ' ') || normalized === phrase) return 'positive';
  }

  return 'neutral';
}

function normalizeToSet(value: any): Set<string> {
  const result = new Set<string>();

  if (Array.isArray(value)) {
    for (const item of value) {
      const parts = String(item).toLowerCase().split(/[,;]+/).map(s => s.trim()).filter(s => s.length > 0);
      for (const part of parts) result.add(part);
    }
  } else if (typeof value === 'string') {
    const parts = value.toLowerCase().split(/[,;]+/).map(s => s.trim()).filter(s => s.length > 0);
    for (const part of parts) result.add(part);
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
    if (knockoutSet.has(v)) return true;
  }

  return false;
}

export function calculateScore(
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
