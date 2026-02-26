type PromptArgs = {
  insight: any;
  isAllAgents: boolean;
  kbFiles: any[];
  redactedCallsLength: number;
};

function buildWickCoachSection(insight: any): string {
  if (!insight) return "";

  const objections = insight.objections.map((obj: any) => `- ${obj.objection} (frequency: ${obj.frequency})`).join("\n");
  const patterns = insight.patterns.map((pat: any) => `- ${pat.pattern} (frequency: ${pat.frequency})`).join("\n");
  const recommendations = insight.recommendations
    .map((rec: any) => `- [${rec.priority.toUpperCase()}] ${rec.title}: ${rec.description}`)
    .join("\n");

  return `

---

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

export function buildKbAnalyzeInitialPrompt(args: PromptArgs): string {
  const { insight, kbFiles } = args;
  const kbContext = kbFiles
    .map((file: any) => `\n### ${file.filename}\n\`\`\`\n${file.currentContent || "(empty)"}\n\`\`\``)
    .join("\n");

  const wickCoachSection = buildWickCoachSection(insight);

  return `You are the Aligner assistant analyzing call performance data to improve the sales knowledge base.${
    insight ? " You have TWO sources of information:" : " You have access to:"
  }

1. **RAW CALL TRANSCRIPTS** - I will drip-feed you transcripts in small batches (1-2 calls at a time) so you can analyze each one carefully${
    insight
      ? '\n2. **WICK COACH ANALYSIS** - Another AI (the "Wick Coach") has already analyzed these calls and provided recommendations'
      : ""
  }

## YOUR ${insight ? "DUAL-PERSPECTIVE " : ""}MISSION:

**First, form your OWN independent opinion** by reading the actual call transcripts. Look for:
- What objections are prospects actually raising?
- What language/phrasing works well vs. poorly?
- What information seems to confuse prospects?
- What topics lead to successful outcomes?

${
  insight
    ? "**Second, review the Wick Coach's analysis** to see if it caught things you missed or has different insights.\n\n**Then, synthesize BOTH perspectives** to propose KB improvements that address:\n- Issues YOU identified from transcripts\n- Valid points from the Wick Coach's recommendations\n- Any contradictions between the two analyses (explain your reasoning)"
    : "**Then, propose KB improvements** based on your analysis of the transcripts."
}${wickCoachSection}

---

## CURRENT KNOWLEDGE BASE FILES:
${kbContext}

---

After I've given you all the transcripts, I'll ask you to propose KB improvements.

Ready to receive call transcripts?`;
}

export function buildKbAnalyzeFinalPrompt(args: PromptArgs): string {
  const { insight, isAllAgents, kbFiles, redactedCallsLength } = args;

  return `All ${redactedCallsLength} calls have been provided. Now propose specific improvements to the knowledge base files based on ${
    insight ? "BOTH your transcript analysis AND the Wick Coach's insights" : "your analysis of the transcripts"
  }.

For each proposed change:
1. Identify which file(s) should be updated
2. Explain the rationale, citing specific examples from transcripts${insight ? " or Wick Coach recommendations" : ""}
3. Provide the targeted edit

Respond in this exact JSON format:
{
  "edits": [
    {
      "file": "exact-filename.txt",
      "section": "Section name for context (e.g., 'Price Objection Responses')",
      "old": "The exact original text to replace",
      "new": "The improved replacement text",
      "reason": "Why this specific change improves the conversation",
      "principle": "The underlying principle (clarity, rhythm, trust, etc.)",
      "evidence": "Direct quote from transcript${insight ? " or Wick Coach insight" : ""} showing the issue"
    }
  ]
}

IMPORTANT:
- Propose SPECIFIC, TARGETED EDITS - not full file rewrites
- Each edit should change one thing for one clear reason
- Include enough context in "old" text to locate it precisely (a sentence or paragraph)
- Only propose changes supported by actual evidence from transcripts${insight ? " or Wick Coach analysis" : ""}
- Focus on ${
    isAllAgents
      ? "general KB files (shared across all agents)"
      : `files that belong to this specific agent (${kbFiles.map((f: any) => f.filename).join(", ")})`
  }${
    insight
      ? "\n- If transcripts reveal issues the Wick Coach missed, propose those fixes\n- If you disagree with a Wick Coach recommendation based on transcript evidence, explain why"
      : ""
  }
- Do not make superficial changes just for the sake of it
- Keep the vibe and voice intact - only fix what's broken`;
}
