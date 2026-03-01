import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TabsContent } from "@/components/ui/tabs";
import { CheckCircle2, Lightbulb, MessageSquare, Target, TrendingUp } from "lucide-react";
import { format } from "date-fns";
import { CallSession } from "./types";

interface SummaryTabProps {
  session?: CallSession | null;
  getSentimentColor: (sentiment: string | undefined) => "default" | "destructive" | "secondary" | "outline";
}

export function SummaryTab({ session, getSentimentColor }: SummaryTabProps) {
  return (
    <TabsContent value="summary" className="flex-1 overflow-y-auto mt-4" data-testid="content-summary">
      {!session?.aiAnalysis ? (
        <div className="flex flex-col items-center justify-center h-64 text-center" data-testid="empty-summary">
          <Lightbulb className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No AI analysis available</p>
          <p className="text-sm text-muted-foreground mt-1">AI summary will be generated after the call completes</p>
        </div>
      ) : (
        <div className="space-y-4">
          {session.aiAnalysis.summary && <Card data-testid="card-summary"><CardHeader><CardTitle className="text-base flex items-center gap-2"><MessageSquare className="h-4 w-4" />Call Summary</CardTitle></CardHeader><CardContent><p className="text-sm" data-testid="text-summary">{session.aiAnalysis.summary}</p></CardContent></Card>}
          <div className="grid grid-cols-2 gap-4">
            {session.aiAnalysis.sentiment && <Card data-testid="card-sentiment"><CardHeader><CardTitle className="text-sm">Sentiment</CardTitle></CardHeader><CardContent><Badge variant={getSentimentColor(session.aiAnalysis.sentiment)} data-testid="badge-sentiment">{session.aiAnalysis.sentiment}</Badge></CardContent></Card>}
            {session.aiAnalysis.customerMood && <Card data-testid="card-customer-mood"><CardHeader><CardTitle className="text-sm">Customer Mood</CardTitle></CardHeader><CardContent><p className="text-sm capitalize" data-testid="text-customer-mood">{session.aiAnalysis.customerMood}</p></CardContent></Card>}
          </div>
          {session.aiAnalysis.mainObjection && <Card data-testid="card-main-objection"><CardHeader><CardTitle className="text-base flex items-center gap-2"><Target className="h-4 w-4" />Main Objection</CardTitle></CardHeader><CardContent><p className="text-sm" data-testid="text-main-objection">{session.aiAnalysis.mainObjection}</p></CardContent></Card>}
          {session.aiAnalysis.keyMoment && <Card data-testid="card-key-moment"><CardHeader><CardTitle className="text-base flex items-center gap-2"><TrendingUp className="h-4 w-4" />Key Moment</CardTitle></CardHeader><CardContent><p className="text-sm" data-testid="text-key-moment">{session.aiAnalysis.keyMoment}</p></CardContent></Card>}
          {session.aiAnalysis.agentStrengths && <Card data-testid="card-agent-strengths"><CardHeader><CardTitle className="text-base flex items-center gap-2"><CheckCircle2 className="h-4 w-4" />Agent Strengths</CardTitle></CardHeader><CardContent><p className="text-sm" data-testid="text-agent-strengths">{session.aiAnalysis.agentStrengths}</p></CardContent></Card>}
          {session.aiAnalysis.lessonLearned && <Card data-testid="card-lesson-learned"><CardHeader><CardTitle className="text-base flex items-center gap-2"><Lightbulb className="h-4 w-4" />Lesson Learned</CardTitle></CardHeader><CardContent><p className="text-sm" data-testid="text-lesson-learned">{session.aiAnalysis.lessonLearned}</p></CardContent></Card>}
          {(session.aiAnalysis.extractedAnswers || session.aiAnalysis.extractedPoc) && (
            <Card data-testid="card-campaign-analysis"><CardHeader><CardTitle className="text-base flex items-center flex-wrap gap-2"><Target className="h-4 w-4" />Campaign Analysis{session.aiAnalysis.campaignName && <Badge variant="secondary" data-testid="badge-campaign-name">{session.aiAnalysis.campaignName}</Badge>}</CardTitle></CardHeader><CardContent className="space-y-4">
              {session.aiAnalysis.qualificationResult && <div className="flex items-center flex-wrap justify-between gap-2 p-3 rounded-lg bg-muted/50" data-testid="row-qualification-status"><span className="text-sm font-medium">Qualification Status</span><Badge variant={session.aiAnalysis.qualificationResult === "qualified" ? "default" : session.aiAnalysis.qualificationResult === "not_qualified" ? "destructive" : "secondary"} data-testid="badge-qualification-result">{session.aiAnalysis.qualificationResult === "qualified" ? "Qualified" : session.aiAnalysis.qualificationResult === "not_qualified" ? "Not Qualified" : "Needs Review"}</Badge></div>}
              {session.aiAnalysis.score !== undefined && <div className="flex items-center flex-wrap justify-between gap-2 p-3 rounded-lg bg-muted/50" data-testid="row-score"><span className="text-sm font-medium">Score</span><span className="font-bold text-lg" data-testid="text-score">{session.aiAnalysis.score} points</span></div>}
              {session.aiAnalysis.extractedPoc && Object.values(session.aiAnalysis.extractedPoc).some((v) => v) && <div className="space-y-2" data-testid="section-poc"><h4 className="text-sm font-medium text-muted-foreground">Point of Contact</h4><div className="grid grid-cols-2 gap-2 text-sm">{session.aiAnalysis.extractedPoc.name && <div><span className="text-muted-foreground">Name: </span><span data-testid="text-poc-name">{session.aiAnalysis.extractedPoc.name}</span></div>}{session.aiAnalysis.extractedPoc.title && <div><span className="text-muted-foreground">Title: </span><span data-testid="text-poc-title">{session.aiAnalysis.extractedPoc.title}</span></div>}{session.aiAnalysis.extractedPoc.email && <div><span className="text-muted-foreground">Email: </span><span data-testid="text-poc-email">{session.aiAnalysis.extractedPoc.email}</span></div>}{session.aiAnalysis.extractedPoc.phone && <div><span className="text-muted-foreground">Phone: </span><span data-testid="text-poc-phone">{session.aiAnalysis.extractedPoc.phone}</span></div>}</div></div>}
              {session.aiAnalysis.extractedAnswers && Object.keys(session.aiAnalysis.extractedAnswers).length > 0 && <div className="space-y-2" data-testid="section-extracted-answers"><h4 className="text-sm font-medium text-muted-foreground">Extracted Answers</h4><div className="space-y-2">{Object.entries(session.aiAnalysis.extractedAnswers).map(([key, data]) => <div key={key} className="flex items-start flex-wrap justify-between gap-2 p-2 rounded bg-muted/30 text-sm" data-testid={`row-answer-${key}`}><span className="text-muted-foreground capitalize">{key.replace(/_/g, " ")}:</span><div className="flex items-center gap-2"><span className="font-medium" data-testid={`text-answer-${key}`}>{typeof data.value === "boolean" ? (data.value ? "Yes" : "No") : typeof data.value === "number" ? String(data.value) : Array.isArray(data.value) ? data.value.join(", ") : data.value != null && data.value !== "" ? String(data.value) : "N/A"}</span><Badge variant={data.confidence === "high" ? "default" : data.confidence === "medium" ? "secondary" : "outline"} className="text-xs" data-testid={`badge-confidence-${key}`}>{data.confidence}</Badge></div></div>)}</div></div>}
              {session.aiAnalysis.analysisCompletedAt && <p className="text-xs text-muted-foreground text-right">Analyzed: {format(new Date(session.aiAnalysis.analysisCompletedAt), "MMM d, yyyy h:mm a")}</p>}
            </CardContent></Card>
          )}
        </div>
      )}
    </TabsContent>
  );
}
