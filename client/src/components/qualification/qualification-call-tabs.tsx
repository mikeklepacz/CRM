import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { AlertCircle, CheckCircle2, Clock, FileText, Loader2, MessageSquare, Phone } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { CallSession, QualificationLead } from '@shared/schema';

type ParsedAnswersTabProps = {
  lead: QualificationLead;
  onViewTranscript: (conversationId: string) => void;
  isLoadingTranscript: boolean;
};

export function ParsedAnswersTab({ lead, onViewTranscript, isLoadingTranscript }: ParsedAnswersTabProps) {
  useQueryClient();

  const { data: callsData, isLoading: callsLoading, isError: callsError } = useQuery<CallSession[]>({
    queryKey: ['/api/call-sessions', { qualificationLeadId: lead.id }],
    queryFn: async () => {
      const response = await fetch(`/api/call-sessions?qualificationLeadId=${lead.id}`);
      if (!response.ok) throw new Error('Failed to fetch calls');
      return response.json();
    },
  });

  const calls = callsData || [];
  const sortedCalls = [...calls].sort((a, b) => {
    const aDate = a.startedAt ? new Date(a.startedAt).getTime() : 0;
    const bDate = b.startedAt ? new Date(b.startedAt).getTime() : 0;
    return bDate - aDate;
  });
  const latestCallWithAnalysis = sortedCalls.find((c) => c.aiAnalysis && (c.aiAnalysis as any).extractedAnswers);
  const extractedAnswers = latestCallWithAnalysis ? (latestCallWithAnalysis.aiAnalysis as any)?.extractedAnswers : null;
  const campaignName = latestCallWithAnalysis ? (latestCallWithAnalysis.aiAnalysis as any)?.campaignName : null;
  const analysisScore = latestCallWithAnalysis ? (latestCallWithAnalysis.aiAnalysis as any)?.score : null;
  const qualificationResult = latestCallWithAnalysis ? (latestCallWithAnalysis.aiAnalysis as any)?.qualificationResult : null;

  const displayAnswers = lead.answers && Object.keys(lead.answers).length > 0 ? lead.answers : extractedAnswers;

  const displayScore = lead.score ?? analysisScore;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant={displayScore !== null && displayScore !== undefined ? (displayScore >= 70 ? 'default' : displayScore >= 40 ? 'secondary' : 'destructive') : 'outline'}>
            Score: {displayScore !== null && displayScore !== undefined ? `${displayScore}%` : 'Not calculated'}
          </Badge>
          {qualificationResult && (
            <Badge variant={qualificationResult === 'qualified' ? 'default' : qualificationResult === 'not_qualified' ? 'destructive' : 'secondary'}>
              {qualificationResult.replace('_', ' ')}
            </Badge>
          )}
          {campaignName && <Badge variant="outline">{campaignName}</Badge>}
        </div>
        {latestCallWithAnalysis && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onViewTranscript(latestCallWithAnalysis.conversationId || '')}
            disabled={isLoadingTranscript || !latestCallWithAnalysis.conversationId}
            data-testid="button-view-transcript"
          >
            {isLoadingTranscript ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <FileText className="h-4 w-4 mr-2" />}
            View Transcript
          </Button>
        )}
      </div>

      {callsLoading ? (
        <div className="flex items-center justify-center p-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : callsError ? (
        <div className="text-center p-8 text-destructive">
          <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-70" />
          <p>Failed to load call data.</p>
          <p className="text-sm mt-1 text-muted-foreground">Please try again later.</p>
        </div>
      ) : displayAnswers && Object.keys(displayAnswers).length > 0 ? (
        <ScrollArea className="h-[300px]">
          <div className="space-y-3 pr-4">
            {Object.entries(displayAnswers).map(([key, value]) => {
              const answerData = typeof value === 'object' && value !== null && 'value' in value ? (value as { value: any; confidence?: string }) : { value, confidence: undefined };
              const displayValue = answerData.value;
              const confidence = answerData.confidence;

              return (
                <div key={key} className="border rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-muted-foreground capitalize">{key.replace(/_/g, ' ')}</Label>
                    {confidence && (
                      <Badge variant="outline" className="text-xs">
                        {confidence}
                      </Badge>
                    )}
                  </div>
                  <p className="font-medium mt-1">
                    {typeof displayValue === 'boolean' ? (displayValue ? 'Yes' : 'No') : Array.isArray(displayValue) ? displayValue.join(', ') : String(displayValue ?? '-')}
                  </p>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      ) : (
        <div className="text-center p-8 text-muted-foreground">
          <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No parsed answers available.</p>
          <p className="text-sm mt-1">Complete a qualification call to automatically extract answers using AI.</p>
        </div>
      )}
    </div>
  );
}

type CallHistoryTabProps = {
  leadId: string;
  onViewTranscript: (conversationId: string) => void;
  isLoadingTranscript: boolean;
};

export function CallHistoryTab({ leadId, onViewTranscript, isLoadingTranscript }: CallHistoryTabProps) {
  const { data: callsData, isLoading, isError } = useQuery<CallSession[]>({
    queryKey: ['/api/call-sessions', { qualificationLeadId: leadId }],
    queryFn: async () => {
      const response = await fetch(`/api/call-sessions?qualificationLeadId=${leadId}`);
      if (!response.ok) throw new Error('Failed to fetch calls');
      return response.json();
    },
  });

  const calls = callsData || [];
  const sortedCalls = [...calls].sort((a, b) => {
    const aDate = a.startedAt ? new Date(a.startedAt).getTime() : 0;
    const bDate = b.startedAt ? new Date(b.startedAt).getTime() : 0;
    return bDate - aDate;
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="text-center p-8 text-destructive">
        <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-70" />
        <p>Failed to load call history.</p>
        <p className="text-sm mt-1 text-muted-foreground">Please try again later.</p>
      </div>
    );
  }

  if (sortedCalls.length === 0) {
    return (
      <div className="text-center p-8 text-muted-foreground">
        <Phone className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>No calls have been made to this lead yet.</p>
        <p className="text-sm mt-1">Calls will appear here after they are completed.</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-[300px]">
      <div className="space-y-3 pr-4">
        {sortedCalls.map((call) => {
          const aiAnalysis = call.aiAnalysis as any;
          const hasAnalysis = aiAnalysis?.extractedAnswers;

          return (
            <div key={call.id} className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{call.startedAt ? format(new Date(call.startedAt), 'MMM d, yyyy h:mm a') : 'Unknown date'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={call.status === 'completed' ? 'default' : call.status === 'failed' ? 'destructive' : 'secondary'}>{call.status?.replace('-', ' ') || 'unknown'}</Badge>
                  {call.callDurationSecs && (
                    <span className="text-sm text-muted-foreground">{Math.floor(call.callDurationSecs / 60)}:{(call.callDurationSecs % 60).toString().padStart(2, '0')}</span>
                  )}
                </div>
              </div>

              {aiAnalysis?.summary && <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{aiAnalysis.summary}</p>}

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {hasAnalysis && (
                    <Badge variant="outline" className="text-xs">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      AI Analyzed
                    </Badge>
                  )}
                  {call.interestLevel && (
                    <Badge variant={call.interestLevel === 'hot' ? 'default' : call.interestLevel === 'warm' ? 'secondary' : 'outline'} className="text-xs">
                      {call.interestLevel}
                    </Badge>
                  )}
                </div>
                {call.conversationId && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onViewTranscript(call.conversationId!)}
                    disabled={isLoadingTranscript}
                    data-testid={`button-view-transcript-${call.id}`}
                  >
                    {isLoadingTranscript ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4 mr-1" />}
                    Transcript
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
}
