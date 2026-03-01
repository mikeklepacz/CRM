import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { TabsContent } from "@/components/ui/tabs";
import { Calendar, CheckCircle2, Clock, DollarSign, Store, XCircle } from "lucide-react";
import { format } from "date-fns";
import { CallClient, CallSession } from "./types";

interface DetailsTabProps {
  session?: CallSession | null;
  client?: CallClient | null;
  formatDuration: (secs: number | null) => string;
  getInterestLevelColor: (level: string | null) => "destructive" | "default" | "secondary" | "outline";
  getInterestLevelLabel: (level: string | null) => string;
  onOpenStore: () => void;
}

export function DetailsTab({ session, client, formatDuration, getInterestLevelColor, getInterestLevelLabel, onOpenStore }: DetailsTabProps) {
  return (
    <TabsContent value="details" className="flex-1 overflow-y-auto mt-4" data-testid="content-details">
      {!session ? (
        <div className="flex items-center justify-center h-64" data-testid="empty-details"><p className="text-muted-foreground">No call details available</p></div>
      ) : (
        <div className="space-y-4">
          <Card data-testid="card-call-metrics"><CardHeader><CardTitle className="text-base">Call Metrics</CardTitle></CardHeader><CardContent className="space-y-3">
            <div className="flex items-center justify-between"><div className="flex items-center gap-2"><Clock className="h-4 w-4 text-muted-foreground" /><span className="text-sm font-medium">Duration</span></div><span className="text-sm" data-testid="text-duration">{formatDuration(session.callDurationSecs)}</span></div><Separator />
            <div className="flex items-center justify-between"><div className="flex items-center gap-2"><Calendar className="h-4 w-4 text-muted-foreground" /><span className="text-sm font-medium">Started At</span></div><span className="text-sm" data-testid="text-started-at">{format(new Date(session.startedAt), "PPp")}</span></div>
            {session.endedAt && (<><Separator /><div className="flex items-center justify-between"><div className="flex items-center gap-2"><Calendar className="h-4 w-4 text-muted-foreground" /><span className="text-sm font-medium">Ended At</span></div><span className="text-sm" data-testid="text-ended-at">{format(new Date(session.endedAt), "PPp")}</span></div></>)}
            {session.costCredits !== null && (<><Separator /><div className="flex items-center justify-between"><div className="flex items-center gap-2"><DollarSign className="h-4 w-4 text-muted-foreground" /><span className="text-sm font-medium">Cost</span></div><span className="text-sm" data-testid="text-cost">{session.costCredits} credits</span></div></>)}
          </CardContent></Card>
          <Card data-testid="card-call-outcome"><CardHeader><CardTitle className="text-base">Call Outcome</CardTitle></CardHeader><CardContent className="space-y-3">
            <div className="flex items-center justify-between"><span className="text-sm font-medium">Success</span><Badge variant={session.callSuccessful ? "default" : "destructive"} data-testid="badge-success">{session.callSuccessful !== null ? (session.callSuccessful ? <span className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3" />Successful</span> : <span className="flex items-center gap-1"><XCircle className="h-3 w-3" />Failed</span>) : "Unknown"}</Badge></div>
            {session.interestLevel && (<><Separator /><div className="flex items-center justify-between"><span className="text-sm font-medium">Interest Level</span><Badge variant={getInterestLevelColor(session.interestLevel)} data-testid="badge-interest-level">{getInterestLevelLabel(session.interestLevel)}</Badge></div></>)}
            {session.followUpNeeded !== null && (<><Separator /><div className="flex items-center justify-between"><span className="text-sm font-medium">Follow-up Needed</span><Badge variant={session.followUpNeeded ? "default" : "secondary"} data-testid="badge-follow-up">{session.followUpNeeded ? "Yes" : "No"}</Badge></div></>)}
            {session.followUpDate && (<><Separator /><div className="flex items-center justify-between"><span className="text-sm font-medium">Follow-up Date</span><span className="text-sm" data-testid="text-follow-up-date">{format(new Date(session.followUpDate), "PPP")}</span></div></>)}
            {session.nextAction && (<><Separator /><div className="space-y-2"><span className="text-sm font-medium">Next Action</span><p className="text-sm text-muted-foreground" data-testid="text-next-action">{session.nextAction}</p></div></>)}
          </CardContent></Card>
          {client?.data && <Card data-testid="card-store-info"><CardHeader><CardTitle className="text-base">Store Information</CardTitle></CardHeader><CardContent><Button variant="outline" className="w-full" onClick={onOpenStore} data-testid="button-store-link"><Store className="h-4 w-4 mr-2" />View Store Details</Button></CardContent></Card>}
        </div>
      )}
    </TabsContent>
  );
}
