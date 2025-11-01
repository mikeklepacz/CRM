import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { 
  Loader2, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  DollarSign, 
  TrendingUp,
  Calendar,
  ExternalLink,
  MessageSquare,
  Lightbulb,
  Target,
  Store
} from "lucide-react";
import { format } from "date-fns";
import { StoreDetailsDialog } from "@/components/store-details-dialog";

interface CallSession {
  id: string;
  conversationId: string;
  agentId: string;
  clientId: string;
  phoneNumber: string;
  status: string;
  callDurationSecs: number | null;
  costCredits: number | null;
  startedAt: string;
  endedAt: string | null;
  aiAnalysis: {
    summary?: string;
    sentiment?: string;
    customerMood?: string;
    mainObjection?: string;
    keyMoment?: string;
    agentStrengths?: string;
    lessonLearned?: string;
  } | null;
  callSuccessful: boolean | null;
  interestLevel: 'hot' | 'warm' | 'cold' | 'not-interested' | null;
  followUpNeeded: boolean | null;
  followUpDate: string | null;
  nextAction: string | null;
  storeSnapshot: any;
}

interface CallClient {
  id: string;
  uniqueIdentifier: string;
  data: any;
}

interface CallDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversationId: string | null;
  callData: {
    session: CallSession;
    client: CallClient;
    transcriptCount: number;
  } | null;
  trackerSheetId?: string;
  storeSheetId?: string;
  refetch?: () => Promise<any>;
  currentColors?: any;
  statusOptions?: string[];
  statusColors?: { [status: string]: { background: string; text: string } };
  contextUpdateTrigger?: number;
  setContextUpdateTrigger?: (value: number | ((prev: number) => number)) => void;
}

interface TranscriptMessage {
  id: string;
  conversationId: string;
  role: 'agent' | 'user';
  message: string;
  timeInCallSecs: number | null;
  createdAt: string;
}

interface TranscriptResponse {
  transcripts: TranscriptMessage[];
}

export function CallDetailDialog({ 
  open, 
  onOpenChange, 
  conversationId, 
  callData,
  trackerSheetId,
  storeSheetId,
  refetch,
  currentColors,
  statusOptions = [],
  statusColors = {},
  contextUpdateTrigger = 0,
  setContextUpdateTrigger
}: CallDetailDialogProps) {
  const [storeDialogOpen, setStoreDialogOpen] = useState(false);
  const [loadDefaultScriptTrigger, setLoadDefaultScriptTrigger] = useState(0);

  const { data: transcriptData, isLoading } = useQuery<TranscriptResponse>({
    queryKey: ['/api/elevenlabs/call-transcript', conversationId],
    enabled: open && !!conversationId,
  });

  const transcripts = transcriptData?.transcripts || [];
  const session = callData?.session;
  const client = callData?.client;

  const formatDuration = (secs: number | null) => {
    if (!secs) return '0:00';
    const minutes = Math.floor(secs / 60);
    const seconds = secs % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const getInterestLevelColor = (level: string | null) => {
    switch (level) {
      case 'hot':
        return 'destructive';
      case 'warm':
        return 'default';
      case 'cold':
        return 'secondary';
      case 'not-interested':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  const getInterestLevelLabel = (level: string | null) => {
    if (!level) return 'Unknown';
    return level.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  const getSentimentColor = (sentiment: string | undefined) => {
    switch (sentiment?.toLowerCase()) {
      case 'positive':
        return 'default';
      case 'negative':
        return 'destructive';
      case 'neutral':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const storeName = client?.data?.businessName || client?.data?.storeName || 'Unknown Store';
  const storeLink = client?.uniqueIdentifier || client?.data?.link || null;

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col" data-testid="dialog-call-detail">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3" data-testid="text-dialog-title">
            <MessageSquare className="h-5 w-5" />
            <div className="flex flex-col">
              <span>{storeName}</span>
              {session?.startedAt && (
                <span className="text-sm font-normal text-muted-foreground" data-testid="text-call-timestamp">
                  {format(new Date(session.startedAt), 'PPp')}
                </span>
              )}
            </div>
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="transcript" className="flex-1 flex flex-col min-h-0">
          <TabsList className="grid w-full grid-cols-3" data-testid="tabs-call-detail">
            <TabsTrigger value="transcript" data-testid="tab-transcript">
              Transcript
              {callData && (
                <Badge variant="secondary" className="ml-2">
                  {callData.transcriptCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="summary" data-testid="tab-summary">
              AI Summary
            </TabsTrigger>
            <TabsTrigger value="details" data-testid="tab-details">
              Details
            </TabsTrigger>
          </TabsList>

          {/* Transcript Tab */}
          <TabsContent value="transcript" className="flex-1 min-h-0 mt-4" data-testid="content-transcript">
            {isLoading ? (
              <div className="flex items-center justify-center h-64" data-testid="loading-transcript">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : transcripts.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-center" data-testid="empty-transcript">
                <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No transcript available</p>
                <p className="text-sm text-muted-foreground mt-1">
                  The conversation transcript will appear here once available
                </p>
              </div>
            ) : (
              <ScrollArea className="h-[500px] pr-4" data-testid="scroll-transcript">
                <div className="space-y-4">
                  {transcripts.map((msg, index) => (
                    <div 
                      key={msg.id}
                      className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                      data-testid={`message-${msg.role}-${index}`}
                    >
                      <div className={`max-w-[75%] space-y-1 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                        <div className="flex items-center gap-2 px-1">
                          <span className="text-xs font-medium text-muted-foreground" data-testid={`text-role-${index}`}>
                            {msg.role === 'agent' ? 'Agent' : 'Customer'}
                          </span>
                          {msg.timeInCallSecs !== null && (
                            <span className="text-xs text-muted-foreground" data-testid={`text-time-${index}`}>
                              {formatDuration(msg.timeInCallSecs)}
                            </span>
                          )}
                        </div>
                        <div 
                          className={`rounded-lg px-4 py-2 ${
                            msg.role === 'agent' 
                              ? 'bg-muted' 
                              : 'bg-primary text-primary-foreground'
                          }`}
                          data-testid={`text-message-${index}`}
                        >
                          <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </TabsContent>

          {/* Summary Tab */}
          <TabsContent value="summary" className="flex-1 overflow-y-auto mt-4" data-testid="content-summary">
            {!session?.aiAnalysis ? (
              <div className="flex flex-col items-center justify-center h-64 text-center" data-testid="empty-summary">
                <Lightbulb className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No AI analysis available</p>
                <p className="text-sm text-muted-foreground mt-1">
                  AI summary will be generated after the call completes
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Summary */}
                {session.aiAnalysis.summary && (
                  <Card data-testid="card-summary">
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <MessageSquare className="h-4 w-4" />
                        Call Summary
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm" data-testid="text-summary">
                        {session.aiAnalysis.summary}
                      </p>
                    </CardContent>
                  </Card>
                )}

                {/* Sentiment and Customer Mood */}
                <div className="grid grid-cols-2 gap-4">
                  {session.aiAnalysis.sentiment && (
                    <Card data-testid="card-sentiment">
                      <CardHeader>
                        <CardTitle className="text-sm">Sentiment</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <Badge variant={getSentimentColor(session.aiAnalysis.sentiment)} data-testid="badge-sentiment">
                          {session.aiAnalysis.sentiment}
                        </Badge>
                      </CardContent>
                    </Card>
                  )}

                  {session.aiAnalysis.customerMood && (
                    <Card data-testid="card-customer-mood">
                      <CardHeader>
                        <CardTitle className="text-sm">Customer Mood</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm capitalize" data-testid="text-customer-mood">
                          {session.aiAnalysis.customerMood}
                        </p>
                      </CardContent>
                    </Card>
                  )}
                </div>

                {/* Main Objection */}
                {session.aiAnalysis.mainObjection && (
                  <Card data-testid="card-main-objection">
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <Target className="h-4 w-4" />
                        Main Objection
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm" data-testid="text-main-objection">
                        {session.aiAnalysis.mainObjection}
                      </p>
                    </CardContent>
                  </Card>
                )}

                {/* Key Moment */}
                {session.aiAnalysis.keyMoment && (
                  <Card data-testid="card-key-moment">
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <TrendingUp className="h-4 w-4" />
                        Key Moment
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm" data-testid="text-key-moment">
                        {session.aiAnalysis.keyMoment}
                      </p>
                    </CardContent>
                  </Card>
                )}

                {/* Agent Strengths */}
                {session.aiAnalysis.agentStrengths && (
                  <Card data-testid="card-agent-strengths">
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4" />
                        Agent Strengths
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm" data-testid="text-agent-strengths">
                        {session.aiAnalysis.agentStrengths}
                      </p>
                    </CardContent>
                  </Card>
                )}

                {/* Lesson Learned */}
                {session.aiAnalysis.lessonLearned && (
                  <Card data-testid="card-lesson-learned">
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <Lightbulb className="h-4 w-4" />
                        Lesson Learned
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm" data-testid="text-lesson-learned">
                        {session.aiAnalysis.lessonLearned}
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </TabsContent>

          {/* Details Tab */}
          <TabsContent value="details" className="flex-1 overflow-y-auto mt-4" data-testid="content-details">
            {!session ? (
              <div className="flex items-center justify-center h-64" data-testid="empty-details">
                <p className="text-muted-foreground">No call details available</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Call Metrics */}
                <Card data-testid="card-call-metrics">
                  <CardHeader>
                    <CardTitle className="text-base">Call Metrics</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">Duration</span>
                      </div>
                      <span className="text-sm" data-testid="text-duration">
                        {formatDuration(session.callDurationSecs)}
                      </span>
                    </div>

                    <Separator />

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">Started At</span>
                      </div>
                      <span className="text-sm" data-testid="text-started-at">
                        {format(new Date(session.startedAt), 'PPp')}
                      </span>
                    </div>

                    {session.endedAt && (
                      <>
                        <Separator />
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium">Ended At</span>
                          </div>
                          <span className="text-sm" data-testid="text-ended-at">
                            {format(new Date(session.endedAt), 'PPp')}
                          </span>
                        </div>
                      </>
                    )}

                    {session.costCredits !== null && (
                      <>
                        <Separator />
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <DollarSign className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium">Cost</span>
                          </div>
                          <span className="text-sm" data-testid="text-cost">
                            {session.costCredits} credits
                          </span>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>

                {/* Call Outcome */}
                <Card data-testid="card-call-outcome">
                  <CardHeader>
                    <CardTitle className="text-base">Call Outcome</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Success</span>
                      <Badge 
                        variant={session.callSuccessful ? 'default' : 'destructive'}
                        data-testid="badge-success"
                      >
                        {session.callSuccessful !== null ? (
                          session.callSuccessful ? (
                            <span className="flex items-center gap-1">
                              <CheckCircle2 className="h-3 w-3" />
                              Successful
                            </span>
                          ) : (
                            <span className="flex items-center gap-1">
                              <XCircle className="h-3 w-3" />
                              Failed
                            </span>
                          )
                        ) : (
                          'Unknown'
                        )}
                      </Badge>
                    </div>

                    {session.interestLevel && (
                      <>
                        <Separator />
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Interest Level</span>
                          <Badge 
                            variant={getInterestLevelColor(session.interestLevel)}
                            data-testid="badge-interest-level"
                          >
                            {getInterestLevelLabel(session.interestLevel)}
                          </Badge>
                        </div>
                      </>
                    )}

                    {session.followUpNeeded !== null && (
                      <>
                        <Separator />
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Follow-up Needed</span>
                          <Badge 
                            variant={session.followUpNeeded ? 'default' : 'secondary'}
                            data-testid="badge-follow-up"
                          >
                            {session.followUpNeeded ? 'Yes' : 'No'}
                          </Badge>
                        </div>
                      </>
                    )}

                    {session.followUpDate && (
                      <>
                        <Separator />
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Follow-up Date</span>
                          <span className="text-sm" data-testid="text-follow-up-date">
                            {format(new Date(session.followUpDate), 'PPP')}
                          </span>
                        </div>
                      </>
                    )}

                    {session.nextAction && (
                      <>
                        <Separator />
                        <div className="space-y-2">
                          <span className="text-sm font-medium">Next Action</span>
                          <p className="text-sm text-muted-foreground" data-testid="text-next-action">
                            {session.nextAction}
                          </p>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>

                {/* Store Information */}
                {session?.storeSnapshot && (
                  <Card data-testid="card-store-info">
                    <CardHeader>
                      <CardTitle className="text-base">Store Information</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Button 
                        variant="outline" 
                        className="w-full" 
                        onClick={() => setStoreDialogOpen(true)}
                        data-testid="button-store-link"
                      >
                        <Store className="h-4 w-4 mr-2" />
                        View Store Details
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>

      {/* Store Details Dialog */}
      {session?.storeSnapshot && trackerSheetId && storeSheetId && (
        <StoreDetailsDialog
          open={storeDialogOpen}
          onOpenChange={setStoreDialogOpen}
          row={session.storeSnapshot}
          trackerSheetId={trackerSheetId}
          storeSheetId={storeSheetId}
          refetch={refetch || (async () => {})}
          currentColors={currentColors || {}}
          statusOptions={statusOptions}
          statusColors={statusColors}
          contextUpdateTrigger={contextUpdateTrigger}
          setContextUpdateTrigger={setContextUpdateTrigger || (() => {})}
          loadDefaultScriptTrigger={loadDefaultScriptTrigger}
        />
      )}
    </>
  );
}
