import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Pause, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EhubActiveQueueTable } from "@/components/ehub/ehub-active-queue-table";
import { EhubDelayDialog } from "@/components/ehub/ehub-delay-dialog";
import { EhubPausedQueueTable } from "@/components/ehub/ehub-paused-queue-table";
import type { IndividualSend, PausedRecipient } from "@/components/ehub/ehub-queue.types";
import { formatDate } from "@/components/ehub/ehub-queue-utils";
import { useEhubQueueActions } from "@/components/ehub/use-ehub-queue-actions";

export function QueueView() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [timeWindowDays, setTimeWindowDays] = useState<number>(3);
  const [statusFilter, setStatusFilter] = useState<"active" | "paused">("active");
  const [showJitter, setShowJitter] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const { data: activeQueue, isLoading: isLoadingActive } = useQuery<IndividualSend[]>({
    queryKey: ["/api/ehub/queue", debouncedSearch, timeWindowDays],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (debouncedSearch) params.append("search", debouncedSearch);
      params.append("timeWindowDays", timeWindowDays.toString());
      params.append("statusFilter", "active");

      const url = `/api/ehub/queue?${params.toString()}`;
      const res = await fetch(url, { credentials: "include" });

      if (!res.ok) {
        throw new Error(`Failed to fetch queue: ${res.statusText}`);
      }

      return await res.json();
    },
    staleTime: 0,
    enabled: statusFilter === "active",
  });

  const { data: pausedRecipients, isLoading: isLoadingPaused } = useQuery<PausedRecipient[]>({
    queryKey: ["/api/ehub/paused-recipients"],
    queryFn: async () => {
      const res = await fetch("/api/ehub/paused-recipients", { credentials: "include" });
      if (!res.ok) {
        throw new Error(`Failed to fetch paused recipients: ${res.statusText}`);
      }
      return await res.json();
    },
    staleTime: 0,
    enabled: statusFilter === "paused",
  });

  const {
    delayDialog,
    setDelayDialog,
    delayMutation,
    generateQueueMutation,
    pauseMutation,
    rebuildQueueMutation,
    removeMutation,
    resumeMutation,
    sendNowMutation,
    skipStepMutation,
  } = useEhubQueueActions(toast);

  const { data: pausedCount = 0 } = useQuery<number>({
    queryKey: ["/api/ehub/queue/paused-count"],
    queryFn: async () => {
      const res = await fetch("/api/ehub/queue/paused-count", { credentials: "include" });
      if (!res.ok) return 0;
      const data = await res.json();
      return data.count || 0;
    },
  });

  const queue = statusFilter === "paused" ? pausedRecipients : activeQueue;
  const isLoading = statusFilter === "paused" ? isLoadingPaused : isLoadingActive;

  const sentItems = activeQueue?.filter((item) => item.status === "sent") || [];
  const scheduledItems = activeQueue?.filter((item) => item.status === "scheduled") || [];
  const followUpRecipients = new Set(
    (activeQueue?.filter((item) => item.stepNumber > 0 && item.recipientId && item.recipientId !== "(Open slot)") || []).map(
      (item) => item.recipientId
    )
  );
  const freshRecipients =
    activeQueue?.filter((item) => item.stepNumber === 0 && item.recipientId && item.recipientId !== "(Open slot)").length || 0;
  const nextScheduled = scheduledItems.length > 0 && scheduledItems[0].scheduledAt ? new Date(scheduledItems[0].scheduledAt) : null;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {statusFilter === "active" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Follow-ups Pending</CardDescription>
              <CardTitle className="text-3xl" data-testid="text-followups-pending">
                {followUpRecipients.size}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Fresh Emails Pending</CardDescription>
              <CardTitle className="text-3xl" data-testid="text-fresh-pending">
                {freshRecipients}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Next Send</CardDescription>
              <CardTitle className="text-xl" data-testid="text-next-send">
                {nextScheduled ? formatDate(nextScheduled.toISOString()) : "No emails queued"}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4">
            <div>
              <CardTitle>{statusFilter === "paused" ? "Paused Recipients" : "Email Queue"}</CardTitle>
              <CardDescription>
                {statusFilter === "paused"
                  ? "Recipients whose email sequences have been paused"
                  : "Chronological view of all time slots • Green = Sent, Blue = Scheduled, Gray = Open, Red = Overdue"}
              </CardDescription>
            </div>
            <div className="flex gap-3 flex-wrap">
              {statusFilter === "active" && (
                <>
                  <Input
                    placeholder="Search by name or email..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="max-w-xs"
                    data-testid="input-queue-search"
                  />
                  <Select value={timeWindowDays.toString()} onValueChange={(val) => setTimeWindowDays(parseInt(val, 10))}>
                    <SelectTrigger className="w-[200px]" data-testid="select-time-window">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Next 24 hours</SelectItem>
                      <SelectItem value="3">Next 3 days</SelectItem>
                      <SelectItem value="7">Next 7 days</SelectItem>
                      <SelectItem value="14">Next 14 days</SelectItem>
                      <SelectItem value="30">Next 30 days</SelectItem>
                    </SelectContent>
                  </Select>
                  {!activeQueue?.length && !search && (
                    <Button
                      onClick={() => generateQueueMutation.mutate()}
                      disabled={generateQueueMutation.isPending}
                      data-testid="button-generate-queue"
                    >
                      {generateQueueMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        "Generate Queue"
                      )}
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    onClick={() => rebuildQueueMutation.mutate()}
                    disabled={rebuildQueueMutation.isPending}
                    data-testid="button-rebuild-queue"
                  >
                    {rebuildQueueMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Rebuilding...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Rebuild Queue
                      </>
                    )}
                  </Button>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="show-jitter"
                      checked={showJitter}
                      onCheckedChange={(checked) => setShowJitter(!!checked)}
                      data-testid="checkbox-show-jitter"
                    />
                    <Label htmlFor="show-jitter" className="text-sm cursor-pointer">
                      Jitter
                    </Label>
                  </div>
                </>
              )}
              <Button
                variant={statusFilter === "paused" ? "default" : "outline"}
                onClick={() => setStatusFilter(statusFilter === "active" ? "paused" : "active")}
                data-testid="button-toggle-paused"
              >
                <Pause className="mr-2 h-4 w-4" />
                {statusFilter === "paused" ? "Show Active" : `Show Paused${pausedCount > 0 ? ` (${pausedCount})` : ""}`}
              </Button>
              {statusFilter === "active" && sentItems.length > 0 && (
                <Badge variant="outline" data-testid="text-sent-count">
                  {sentItems.length} sent
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {statusFilter === "active" ? (
            <EhubActiveQueueTable
              activeQueue={activeQueue || []}
              delayDialog={delayDialog}
              pauseMutation={pauseMutation}
              removeMutation={removeMutation}
              sendNowMutation={sendNowMutation}
              setDelayDialog={setDelayDialog}
              showJitter={showJitter}
              skipStepMutation={skipStepMutation}
            />
          ) : (
            <EhubPausedQueueTable pausedRecipients={pausedRecipients || []} resumeMutation={resumeMutation} />
          )}
        </CardContent>
      </Card>
      <EhubDelayDialog delayDialog={delayDialog} delayMutation={delayMutation} setDelayDialog={setDelayDialog} />
    </div>
  );
}
