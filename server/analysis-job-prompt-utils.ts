export function buildWickCoachSection(insight: any): string {
  if (!insight) {
    return "";
  }

  const objections = insight.objections
    .map((obj: any) => `- ${obj.objection} (frequency: ${obj.frequency})`)
    .join("\n");
  const patterns = insight.patterns
    .map((pat: any) => `- ${pat.pattern} (frequency: ${pat.frequency})`)
    .join("\n");
  const recommendations = insight.recommendations
    .map((rec: any) => `- [${rec.priority.toUpperCase()}] ${rec.title}: ${rec.description}`)
    .join("\n");

  return `

----

## WICK COACH ANALYSIS:
**Date Range:** ${insight.dateRangeStart} to ${insight.dateRangeEnd}
**Total Calls:** ${insight.callCount}
**Sentiment:** ${insight.sentimentPositive} positive, ${insight.sentimentNeutral} neutral, ${insight.sentimentNegative} negative

**Common Objections Identified:**
${objections || "(none)"}

**Success Patterns Identified:**
${patterns || "(none)"}

**Wick Coach Recommendations:**
${recommendations || "(none)"}`;
}

export function buildAnalysisVariables(transcriptContext: string, kbContext: string, insight: any, wickCoachSection: string) {
  return {
    transcriptContext,
    kbContext,
    wickCoachSection,
    insightIntro: insight ? " You have TWO sources of information:" : " You have access to:",
    wickCoachIntro: insight
      ? '\n2. **WICK COACH ANALYSIS** - Another AI (the "Wick Coach") has already analyzed these calls and provided recommendations'
      : "",
    dualPerspective: insight ? "DUAL-PERSPECTIVE " : "",
    synthesisSection: insight
      ? "**Second, review the Wick Coach's analysis** to see if it caught things you missed or has different insights.\n\n**Then, synthesize BOTH perspectives** to propose KB improvements that address:\n- Issues YOU identified from transcripts\n- Valid points from the Wick Coach's recommendations\n- Any contradictions between the two analyses (explain your reasoning)"
      : "**Then, propose KB improvements** based on your analysis of the transcripts.",
    analysisSource: insight ? "BOTH your transcript analysis AND the Wick Coach's insights" : "your analysis of the transcripts",
    wickCoachCitation: insight ? "\n   - Relevant Wick Coach recommendations" : "",
  } as Record<string, string>;
}
