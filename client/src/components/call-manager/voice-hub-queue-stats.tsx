import { AlertCircle, CheckCircle2, Clock, PhoneCall } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type VoiceHubQueueStatsProps = {
  queueStats: {
    active: number;
    completed: number;
    failed: number;
    queued: number;
  };
};

export function VoiceHubQueueStats({ queueStats }: VoiceHubQueueStatsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-4">
      <Card data-testid="card-stat-active">
        <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Active Calls</CardTitle>
          <PhoneCall className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold" data-testid="text-active-count">
            {queueStats.active}
          </div>
          <p className="text-xs text-muted-foreground">Currently in progress</p>
        </CardContent>
      </Card>

      <Card data-testid="card-stat-queued">
        <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Queued</CardTitle>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold" data-testid="text-queued-count">
            {queueStats.queued}
          </div>
          <p className="text-xs text-muted-foreground">Waiting to dial</p>
        </CardContent>
      </Card>

      <Card data-testid="card-stat-completed">
        <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Completed</CardTitle>
          <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold" data-testid="text-completed-count">
            {queueStats.completed}
          </div>
          <p className="text-xs text-muted-foreground">Successfully finished</p>
        </CardContent>
      </Card>

      <Card data-testid="card-stat-failed">
        <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Failed</CardTitle>
          <AlertCircle className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold" data-testid="text-failed-count">
            {queueStats.failed}
          </div>
          <p className="text-xs text-muted-foreground">Needs attention</p>
        </CardContent>
      </Card>
    </div>
  );
}
