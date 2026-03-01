import type { CallTranscript } from '@shared/schema';

export interface FieldDefinition {
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

export interface AIAnalysisResponse {
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

export interface ScoreBreakdown {
  [questionKey: string]: {
    weight: number;
    earned: number;
    answer: any;
  };
}

export interface AnalyzeTranscriptResult {
  success: boolean;
  score: number;
  qualificationResult: 'qualified' | 'not_qualified' | 'needs_review';
  aiResponse: AIAnalysisResponse;
  scoreBreakdown: ScoreBreakdown;
  error?: string;
}

export function buildTranscriptText(transcripts: CallTranscript[]): string {
  return transcripts
    .sort((a, b) => (a.timeInCallSecs || 0) - (b.timeInCallSecs || 0))
    .map(t => `${t.role === 'agent' ? 'Agent' : 'Prospect'}: ${t.message}`)
    .join('\n');
}
