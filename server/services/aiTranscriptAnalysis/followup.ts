import * as chrono from 'chrono-node';
import type { AIAnalysisResponse } from './types';

export function parseFollowUpTimestamp(followUp: AIAnalysisResponse['followUp']): Date | null {
  let followUpTimestamp: Date | null = null;

  if (followUp.date || followUp.time) {
    try {
      const dateStr = followUp.date || '';
      const timeStr = followUp.time || '';
      const combinedStr = `${dateStr} ${timeStr}`.trim();

      if (combinedStr) {
        const parsedResults = chrono.parse(combinedStr, new Date(), { forwardDate: true });

        if (parsedResults.length > 0 && parsedResults[0].date()) {
          followUpTimestamp = parsedResults[0].date();

          const knownTime = parsedResults[0].start.isCertain('hour');
          if (!knownTime) {
            followUpTimestamp.setHours(10, 0, 0, 0);
          }
        } else {
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

  return followUpTimestamp;
}

export function hasValidFollowUp(followUp: AIAnalysisResponse['followUp'], followUpTimestamp: Date | null): boolean {
  if (followUp.needed && !followUpTimestamp) {
    console.log('[AI Analysis] Follow-up requested but no valid timestamp parsed. Setting followUpNeeded=false.');
  }
  return followUp.needed && followUpTimestamp !== null;
}
