type RunWickCoachAnalysisParams = {
  addCallsToThreadInMicroBatches: (
    openai: any,
    threadId: string,
    calls: any[],
    callsPerBatch?: number
  ) => Promise<void>;
  callsData: any[];
  openaiApiKey: string;
  wickCoachAssistantId: string;
};

function redactCallData(callsData: any[]): any[] {
  return callsData.map((call) => ({
    ...call,
    transcripts: call.transcripts.map((t: any) => ({
      ...t,
      message: t.message.replace(/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, "XXX-XXX-XXXX"),
    })),
  }));
}

function parseAssistantJson(responseText: string): any {
  const jsonMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/) || responseText.match(/```\s*([\s\S]*?)\s*```/);
  const jsonText = jsonMatch ? jsonMatch[1] : responseText;
  return JSON.parse(jsonText);
}

function enrichInsights(callsData: any[], insights: any) {
  const callIndexMap = new Map(
    callsData.map((call, idx) => [
      String(idx + 1),
      {
        conversationId: call.session.conversationId,
        duration: call.session.callDurationSecs,
        storeName: call.client.data?.Name || call.client.uniqueIdentifier,
        city: call.client.data?.City || "",
        state: call.client.data?.State || "",
        phoneNumber: call.session.phoneNumber,
      },
    ])
  );

  const enrichObjections = (objections: any[]) => {
    return objections.map((obj) => ({
      ...obj,
      exampleConversations:
        obj.exampleConversations
          ?.map((callNum: string) => callIndexMap.get(callNum) || { conversationId: callNum })
          .filter(Boolean) || [],
    }));
  };

  const enrichPatterns = (patterns: any[]) => {
    return patterns.map((pattern) => ({
      ...pattern,
      exampleConversations:
        pattern.exampleConversations
          ?.map((callNum: string) => callIndexMap.get(callNum) || { conversationId: callNum })
          .filter(Boolean) || [],
    }));
  };

  return {
    enrichedObjections: enrichObjections(insights.commonObjections || []),
    enrichedPatterns: enrichPatterns(insights.successPatterns || []),
  };
}

export async function runWickCoachAnalysis(params: RunWickCoachAnalysisParams): Promise<{
  insights: any;
  enrichedObjections: any[];
  enrichedPatterns: any[];
}> {
  const { addCallsToThreadInMicroBatches, callsData, openaiApiKey, wickCoachAssistantId } = params;

  const redactedCalls = redactCallData(callsData);
  console.log(`[Wick Coach] Analyzing ${redactedCalls.length} calls using Assistants API with micro-batching`);

  const OpenAI = (await import("openai")).default;
  const openai = new OpenAI({ apiKey: openaiApiKey });

  const thread = await openai.beta.threads.create();
  console.log("[Wick Coach] Thread created:", thread.id);

  const initialPrompt = `You are an expert sales coach analyzing AI voice call performance data. I will drip-feed you call transcripts in small batches (1-2 calls at a time) so you can analyze each one carefully.

After I've given you all the calls, I'll ask you to provide a comprehensive analysis.

Provide your final analysis in this exact JSON format:
{
  "commonObjections": [
    { "objection": "string", "frequency": number, "exampleConversations": ["conversationId1", "conversationId2"] }
  ],
  "successPatterns": [
    { "pattern": "string", "frequency": number, "exampleConversations": ["conversationId1"] }
  ],
  "sentimentAnalysis": {
    "positiveCount": number (count of calls with positive sentiment),
    "neutralCount": number (count of calls with neutral sentiment),
    "negativeCount": number (count of calls with negative sentiment),
    "trends": "string description of sentiment trends"
  },
  "coachingRecommendations": [
    { "title": "string", "description": "string", "priority": "high" | "medium" | "low" }
  ]
}

Focus on:
1. Common objections prospects raise and how to handle them better
2. Patterns in successful vs unsuccessful calls
3. Sentiment trends and customer mood analysis
4. Specific, actionable coaching recommendations for the AI agent

Ready to receive calls?`;

  await openai.beta.threads.messages.create(thread.id, {
    role: "user",
    content: initialPrompt,
  });

  await addCallsToThreadInMicroBatches(openai, thread.id, redactedCalls, 2);

  await openai.beta.threads.messages.create(thread.id, {
    role: "user",
    content: `All ${redactedCalls.length} calls have been provided. Please analyze them comprehensively and provide your response in the JSON format specified earlier.`,
  });

  const run = await openai.beta.threads.runs.create(thread.id, {
    assistant_id: wickCoachAssistantId,
    response_format: { type: "json_object" },
  });
  console.log("[Wick Coach] Run started with JSON mode:", run.id);

  let runStatus = await openai.beta.threads.runs.retrieve(run.id, { thread_id: thread.id });
  let attempts = 0;
  const maxAttempts = 120;

  while (runStatus.status !== "completed" && runStatus.status !== "failed" && attempts < maxAttempts) {
    await new Promise((resolve) => setTimeout(resolve, 500));
    runStatus = await openai.beta.threads.runs.retrieve(run.id, { thread_id: thread.id });
    attempts++;
  }

  if (runStatus.status !== "completed") {
    console.error("[Wick Coach] Run did not complete:", runStatus.status);
    throw new Error(`Analysis failed: ${runStatus.status}`);
  }

  console.log("[Wick Coach] Run completed successfully");
  const messages = await openai.beta.threads.messages.list(thread.id);
  const assistantMessage = messages.data.find((m: any) => m.role === "assistant");

  if (!assistantMessage || !assistantMessage.content[0] || assistantMessage.content[0].type !== "text") {
    throw new Error("No response from Wick Coach assistant");
  }

  const responseText = assistantMessage.content[0].text.value;
  console.log("[Wick Coach] Response received, parsing JSON...");

  let insights: any;
  try {
    insights = parseAssistantJson(responseText);
  } catch (error) {
    console.error("[Wick Coach] Failed to parse JSON response:", error);
    console.error("[Wick Coach] Raw response:", responseText);
    throw new Error("Failed to parse Wick Coach response. Response was not valid JSON.");
  }

  if (insights.sentimentAnalysis) {
    const positiveCount = insights.sentimentAnalysis.positiveCount || 0;
    const neutralCount = insights.sentimentAnalysis.neutralCount || 0;
    const negativeCount = insights.sentimentAnalysis.negativeCount || 0;
    const totalCalls = callsData.length;

    if (!Number.isInteger(positiveCount) || !Number.isInteger(neutralCount) || !Number.isInteger(negativeCount)) {
      console.error("[Wick Coach] ERROR: OpenAI returned non-integer sentiment counts:", {
        positiveCount,
        neutralCount,
        negativeCount,
      });
      throw new Error("OpenAI returned invalid sentiment data - expected integer counts");
    }

    insights.sentimentAnalysis.positive = totalCalls > 0 ? Math.round((positiveCount / totalCalls) * 100) : 0;
    insights.sentimentAnalysis.neutral = totalCalls > 0 ? Math.round((neutralCount / totalCalls) * 100) : 0;
    insights.sentimentAnalysis.negative = totalCalls > 0 ? Math.round((negativeCount / totalCalls) * 100) : 0;

    console.log("[Wick Coach] Sentiment counts from OpenAI:", {
      positiveCount,
      neutralCount,
      negativeCount,
      totalCalls,
    });
    console.log("[Wick Coach] Calculated percentages:", {
      positive: insights.sentimentAnalysis.positive,
      neutral: insights.sentimentAnalysis.neutral,
      negative: insights.sentimentAnalysis.negative,
    });
  }

  const { enrichedObjections, enrichedPatterns } = enrichInsights(callsData, insights);
  return { insights, enrichedObjections, enrichedPatterns };
}
