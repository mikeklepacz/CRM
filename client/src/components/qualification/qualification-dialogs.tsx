import { format } from 'date-fns';
import { FileText, MessageSquare } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CallHistoryTab, ParsedAnswersTab } from '@/components/qualification/qualification-call-tabs';
import { getCallStatusBadgeVariant, getStatusBadgeVariant } from '@/components/qualification/qualification-utils';
import type { CallSession, CallTranscript, QualificationLead } from '@shared/schema';

type LeadDetailsDialogProps = {
  isDetailOpen: boolean;
  selectedLead: QualificationLead | null;
  setIsDetailOpen: (open: boolean) => void;
  onViewTranscript: (conversationId: string) => void;
  isLoadingTranscript: boolean;
};

export function LeadDetailsDialog({
  isDetailOpen,
  selectedLead,
  setIsDetailOpen,
  onViewTranscript,
  isLoadingTranscript,
}: LeadDetailsDialogProps) {
  return (
    <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>{selectedLead?.company || 'Lead Details'}</DialogTitle>
          <DialogDescription>View and manage lead information</DialogDescription>
        </DialogHeader>
        {selectedLead && (
          <Tabs defaultValue="overview" className="w-full">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="answers">Parsed Answers</TabsTrigger>
              <TabsTrigger value="history">Call History</TabsTrigger>
            </TabsList>
            <TabsContent value="overview" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-muted-foreground">Company</Label>
                  <p className="font-medium">{selectedLead.company || '-'}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-muted-foreground">Website</Label>
                  <p className="font-medium">{selectedLead.website || '-'}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-muted-foreground">Contact Name</Label>
                  <p className="font-medium">{selectedLead.pocName || '-'}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-muted-foreground">Email</Label>
                  <p className="font-medium">{selectedLead.pocEmail || '-'}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-muted-foreground">Phone</Label>
                  <p className="font-medium">{selectedLead.pocPhone || '-'}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-muted-foreground">Location</Label>
                  <p className="font-medium">{[selectedLead.city, selectedLead.state, selectedLead.country].filter(Boolean).join(', ') || '-'}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-muted-foreground">Status</Label>
                  <Badge variant={getStatusBadgeVariant(selectedLead.status)}>{selectedLead.status?.replace('_', ' ') || 'new'}</Badge>
                </div>
                <div className="space-y-1">
                  <Label className="text-muted-foreground">Call Status</Label>
                  <Badge variant={getCallStatusBadgeVariant(selectedLead.callStatus)}>{selectedLead.callStatus?.replace('_', ' ') || 'pending'}</Badge>
                </div>
                <div className="space-y-1">
                  <Label className="text-muted-foreground">Score</Label>
                  <p className={`font-medium text-lg ${selectedLead.score && selectedLead.score >= 70 ? 'text-green-600' : selectedLead.score && selectedLead.score < 40 ? 'text-red-600' : ''}`}>
                    {selectedLead.score ?? 'Not scored'}
                  </p>
                </div>
                <div className="space-y-1">
                  <Label className="text-muted-foreground">Source</Label>
                  <p className="font-medium">{selectedLead.source || '-'}</p>
                </div>
              </div>
              {selectedLead.notes && (
                <div className="space-y-1">
                  <Label className="text-muted-foreground">Notes</Label>
                  <p className="text-sm bg-muted p-3 rounded-md">{selectedLead.notes}</p>
                </div>
              )}
            </TabsContent>
            <TabsContent value="answers" className="space-y-4">
              <ParsedAnswersTab lead={selectedLead} onViewTranscript={onViewTranscript} isLoadingTranscript={isLoadingTranscript} />
            </TabsContent>
            <TabsContent value="history" className="space-y-4">
              <CallHistoryTab leadId={selectedLead.id} onViewTranscript={onViewTranscript} isLoadingTranscript={isLoadingTranscript} />
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}

type TranscriptDialogProps = {
  isTranscriptOpen: boolean;
  setIsTranscriptOpen: (open: boolean) => void;
  transcriptData: { transcripts: CallTranscript[]; callSession: CallSession | null } | null;
};

export function TranscriptDialog({ isTranscriptOpen, setIsTranscriptOpen, transcriptData }: TranscriptDialogProps) {
  return (
    <Dialog open={isTranscriptOpen} onOpenChange={setIsTranscriptOpen}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Call Transcript
          </DialogTitle>
          <DialogDescription>
            {transcriptData?.callSession?.startedAt && (
              <span>
                Call on {format(new Date(transcriptData.callSession.startedAt), 'MMMM d, yyyy')} at {format(new Date(transcriptData.callSession.startedAt), 'h:mm a')}
                {transcriptData.callSession.callDurationSecs && <>
                  {' '} - Duration: {Math.floor(transcriptData.callSession.callDurationSecs / 60)}:{(transcriptData.callSession.callDurationSecs % 60).toString().padStart(2, '0')}
                </>}
              </span>
            )}
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-[500px] pr-4">
          {transcriptData?.transcripts && transcriptData.transcripts.length > 0 ? (
            <div className="space-y-4">
              {transcriptData.transcripts
                .sort((a, b) => (a.timeInCallSecs || 0) - (b.timeInCallSecs || 0))
                .map((transcript, idx) => (
                  <div key={transcript.id || idx} className={`flex ${transcript.role === 'agent' ? 'justify-start' : 'justify-end'}`}>
                    <div className={`max-w-[80%] rounded-lg p-3 ${
                      transcript.role === 'agent' ? 'bg-primary/10 border-l-4 border-primary' : 'bg-muted border-r-4 border-muted-foreground/30'
                    }`}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-semibold uppercase">{transcript.role === 'agent' ? 'AI Agent' : 'Prospect'}</span>
                        {transcript.timeInCallSecs !== undefined && transcript.timeInCallSecs !== null && (
                          <span className="text-xs text-muted-foreground">
                            {Math.floor(transcript.timeInCallSecs / 60)}:{(transcript.timeInCallSecs % 60).toString().padStart(2, '0')}
                          </span>
                        )}
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{transcript.message}</p>
                    </div>
                  </div>
                ))}
            </div>
          ) : (
            <div className="text-center p-8 text-muted-foreground">No transcript available for this call.</div>
          )}
        </ScrollArea>
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsTranscriptOpen(false)} data-testid="button-close-transcript">
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
