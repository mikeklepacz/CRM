import { storage } from '../storage';
import OpenAI from 'openai';
import { buildQuestionsContext, buildSystemPrompt, calculateScore } from './aiTranscriptAnalysis/promptAndScoring';
import { hasValidFollowUp, parseFollowUpTimestamp } from './aiTranscriptAnalysis/followup';
import { buildTranscriptText, type AIAnalysisResponse, type AnalyzeTranscriptResult, type FieldDefinition } from './aiTranscriptAnalysis/types';
export type { AIAnalysisResponse, AnalyzeTranscriptResult, FieldDefinition, ScoreBreakdown } from './aiTranscriptAnalysis/types';

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

    const followUpTimestamp = parseFollowUpTimestamp(aiResponse.followUp);
    const validFollowUp = hasValidFollowUp(aiResponse.followUp, followUpTimestamp);

    const sessionUpdates: Partial<any> = {
      interestLevel: aiResponse.interestLevel,
      followUpNeeded: validFollowUp,
      followUpDate: followUpTimestamp,
      nextAction: aiResponse.followUp.action,
      aiAnalysis: {
        ...(session.aiAnalysis || {}),
        summary: aiResponse.notes,
        extractedPoc: aiResponse.poc,
        analysisCompletedAt: new Date().toISOString()
      }
    };

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
      followUpNeeded: validFollowUp,
      followUpDate: followUpTimestamp,
      callbackNote: validFollowUp ? aiResponse.followUp.action : null,
      callSessionId: callSessionId,
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
