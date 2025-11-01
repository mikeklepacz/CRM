# AI Insights Feature - Implementation Checklist

## Overview
Build a third top-level tab "AI Insights" in Call Manager that uses OpenAI to analyze call performance data, identify patterns, objections, and generate coaching recommendations.

## Database & Storage Layer
- [x] Add index on call_transcripts(conversation_id, created_at) for efficient retrieval
- [x] Add getCallsWithTranscripts() to IStorage interface
- [x] Implement getCallsWithTranscripts() in PostgresStorage with filters (date range, agent, limit 100)
- [ ] Test storage method with sample data

## Backend API Layer
- [ ] Create POST /api/elevenlabs/analyze-calls endpoint
- [ ] Add request validation schema (startDate, endDate, agentId, limit max 100)
- [ ] Add authentication check (admin only)
- [ ] Implement PII redaction for phone numbers in transcripts
- [ ] Add rate limiting (prevent abuse)
- [ ] Create helper to aggregate call data for OpenAI

## OpenAI Integration
- [ ] Design prompt template for call analysis (3 sections: objections, success patterns, coaching)
- [ ] Use existing user's OpenAI API key from user_integrations table
- [ ] Implement OpenAI chat completion with structured output
- [ ] Add retry logic (3 attempts with exponential backoff)
- [ ] Parse OpenAI response into structured insights object
- [ ] Add simple caching (30 min TTL) to avoid redundant API calls

## Response Structure
```typescript
{
  commonObjections: [
    { objection: string, frequency: number, exampleConversations: string[] }
  ],
  successPatterns: [
    { pattern: string, frequency: number, exampleConversations: string[] }
  ],
  sentimentAnalysis: {
    positive: number,
    neutral: number,
    negative: number,
    trends: string
  },
  coachingRecommendations: [
    { title: string, description: string, priority: 'high' | 'medium' | 'low' }
  ],
  callCount: number,
  dateRange: { start: string, end: string }
}
```

## Frontend - Call Manager Tab
- [ ] Add "AI Insights" as third TabsTrigger in top-level Tabs
- [ ] Create TabsContent section for AI Insights
- [ ] Add date range filter (last 7 days, 30 days, custom)
- [ ] Add agent filter dropdown
- [ ] Add "Analyze Calls" button with loading state
- [ ] Create state management for insights data

## Frontend - Insight Cards UI
- [ ] Create CommonObjectionsCard component (list with frequency bars)
- [ ] Create SuccessP atternsCard component (timeline or list view)
- [ ] Create SentimentAnalysisCard component (pie chart or bar chart)
- [ ] Create CoachingRecommendationsCard component (priority badges)
- [ ] Add transcript example modal/dialog (click to view full conversation)
- [ ] Add data-testid attributes to all interactive elements

## React Query Integration
- [ ] Create useAnalyzeCalls mutation hook
- [ ] Add loading/error states to UI
- [ ] Implement toast notifications for success/errors
- [ ] Add query cache invalidation on new calls

## Testing & Polish
- [ ] Test with no data (empty state)
- [ ] Test with <5 calls (insufficient data message)
- [ ] Test with 100+ calls (ensure limit works)
- [ ] Verify PII redaction
- [ ] Test error states (API key missing, OpenAI errors, rate limits)
- [ ] Verify mobile responsiveness
- [ ] Add loading skeletons

## Documentation
- [ ] Update replit.md with AI Insights feature description
- [ ] Document OpenAI API key requirement
- [ ] Add usage guidelines (when to run analysis, interpreting insights)

## Notes
- Use existing user's OpenAI API key from Sales Assistant integration
- Limit to 100 calls max to control OpenAI costs
- Cache results for 30 minutes to reduce redundant API calls
- PII redaction: replace phone numbers with "XXX-XXX-XXXX" pattern
- Admin-only feature for now (can expand to agents later)
